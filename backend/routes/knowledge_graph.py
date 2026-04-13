from flask import Blueprint, request, jsonify
from groq import Groq
import os, json, requests
from dotenv import load_dotenv

load_dotenv()

kg_bp = Blueprint('kg', __name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Static prerequisite graph ─────────────────────────────────────────────────
KNOWLEDGE_GRAPH = {
    "nodes": [
        {"id": "Python",          "group": "foundation"},
        {"id": "NumPy",           "group": "foundation"},
        {"id": "Pandas",          "group": "foundation"},
        {"id": "Statistics",      "group": "foundation"},
        {"id": "Linear Algebra",  "group": "foundation"},
        {"id": "SQL",             "group": "foundation"},
        {"id": "DSA",             "group": "foundation"},
        {"id": "ML Basics",       "group": "intermediate"},
        {"id": "Scikit-learn",    "group": "intermediate"},
        {"id": "Feature Eng.",    "group": "intermediate"},
        {"id": "Neural Networks", "group": "intermediate"},
        {"id": "Deep Learning",   "group": "advanced"},
        {"id": "CNNs",            "group": "advanced"},
        {"id": "NLP",             "group": "advanced"},
        {"id": "Transformers",    "group": "advanced"},
        {"id": "Recommender Sys", "group": "advanced"},
        {"id": "Cloud/MLOps",     "group": "advanced"},
    ],
    "edges": [
        ["Python", "NumPy"], ["Python", "Pandas"], ["Python", "Scikit-learn"],
        ["NumPy", "ML Basics"], ["Pandas", "ML Basics"], ["Statistics", "ML Basics"],
        ["Linear Algebra", "ML Basics"], ["Linear Algebra", "Neural Networks"],
        ["ML Basics", "Scikit-learn"], ["ML Basics", "Feature Eng."],
        ["Scikit-learn", "Neural Networks"], ["Neural Networks", "Deep Learning"],
        ["Deep Learning", "CNNs"], ["Deep Learning", "NLP"],
        ["NLP", "Transformers"], ["ML Basics", "Recommender Sys"],
        ["Scikit-learn", "Recommender Sys"], ["DSA", "ML Basics"],
        ["SQL", "Recommender Sys"], ["Cloud/MLOps", "Recommender Sys"],
    ]
}

_SB_HEADERS = lambda: {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def _cache_get(user_id: str, target_skill: str, completed_courses: list):
    """
    Return cached graph from Supabase if:
    - A row exists for (user_id, target_skill)
    - The cached completed_courses list matches what we were passed
    Returns None if no valid cache.
    """
    if not user_id or not SUPABASE_URL:
        return None
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_graph_cache",
            headers=_SB_HEADERS(),
            params={
                "user_id": f"eq.{user_id}",
                "target_skill": f"eq.{target_skill}",
                "select": "graph_json,completed_courses",
                "limit": 1,
            },
            timeout=5,
        )
        rows = res.json()
        if rows and isinstance(rows, list) and len(rows) > 0:
            row = rows[0]
            # Invalidate cache if course list has changed
            cached_courses = sorted(row.get("completed_courses") or [])
            current_courses = sorted(completed_courses)
            if cached_courses == current_courses:
                print("KG: cache HIT — returning cached graph (0 tokens used)")
                return row["graph_json"]
    except Exception as e:
        print(f"KG cache read error (non-fatal): {e}")
    return None


def _cache_set(user_id: str, target_skill: str, completed_courses: list, graph_json: dict):
    """Save or update the graph cache in Supabase."""
    if not user_id or not SUPABASE_URL:
        return
    try:
        payload = {
            "user_id": user_id,
            "target_skill": target_skill,
            "completed_courses": completed_courses,
            "graph_json": graph_json,
            "updated_at": "now()",
        }
        requests.post(
            f"{SUPABASE_URL}/rest/v1/knowledge_graph_cache",
            headers={**_SB_HEADERS(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=payload,
            timeout=5,
        )
        print("KG: graph saved to Supabase cache")
    except Exception as e:
        print(f"KG cache write error (non-fatal): {e}")


def _annotate_nodes(nlp_result: dict) -> list:
    """Annotate KNOWLEDGE_GRAPH nodes with mastered/progress/missing/none state."""
    mastered    = set(nlp_result.get("mastered", []))
    in_progress = set(nlp_result.get("in_progress", []))
    missing     = set(nlp_result.get("missing_prerequisites", []))

    # Enforce mutual exclusivity
    in_progress -= mastered
    missing -= mastered
    missing -= in_progress

    annotated = []
    for node in KNOWLEDGE_GRAPH["nodes"]:
        nid = node["id"]
        if nid in mastered:         state = "mastered"
        elif nid in in_progress:    state = "progress"
        elif nid in missing:        state = "missing"
        else:                       state = "none"
        annotated.append({**node, "state": state})
    return annotated


@kg_bp.route('/api/kg/graph', methods=['POST'])
def get_graph():
    data = request.get_json()
    completed_courses   = data.get("completed_courses", [])
    in_progress_courses = data.get("in_progress_courses", [])
    target_skill        = data.get("target_skill", "Recommender Sys")
    user_id             = data.get("user_id", "")  # optional — for cache

    # ── 1. Try Supabase cache first (0 tokens) ───────────────────────────────
    cached = _cache_get(user_id, target_skill, completed_courses)
    if cached:
        return jsonify({**cached, "cached": True})

    # ── 2. Cache miss — call Groq ─────────────────────────────────────────────
    all_node_ids = [n['id'] for n in KNOWLEDGE_GRAPH['nodes']]
    prompt = f"""You are an NLP concept extractor for a learning platform.

The user has COMPLETED these courses (mark related nodes as mastered): {json.dumps(completed_courses)}
The user is IN PROGRESS on these courses (mark related nodes as in_progress): {json.dumps(in_progress_courses)}

From this list of all possible knowledge nodes: {all_node_ids}

Return ONLY a JSON object (no markdown, no explanation) with exactly this structure:
{{
  "mastered": ["node ids the user has mastered based on completed courses"],
  "in_progress": ["node ids currently being learned based on in-progress courses"],
  "missing_prerequisites": ["node ids needed before reaching {target_skill} that are NOT in mastered or in_progress"]
}}

Rules:
- If completed_courses is empty, mastered list must also be empty
- If in_progress_courses is empty, in_progress list must also be empty
- Never put a node in both mastered and missing_prerequisites
- Never put a node in both in_progress and missing_prerequisites
- missing_prerequisites should only include nodes on the prerequisite path to {target_skill}
- Return ONLY the raw JSON object, no extra text"""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            max_tokens=600,
            temperature=0.1,
        )
    except Exception as e:
        error_msg = str(e)
        print(f"Groq API error: {error_msg}")
        if "429" in error_msg or "rate_limit" in error_msg.lower() or "rate limit" in error_msg.lower():
            return jsonify({
                "error": "Groq rate limit reached. Please wait ~1 minute and click Retry.",
                "code": "rate_limit",
            }), 429
        return jsonify({"error": "AI service temporarily unavailable. Please try again."}), 500

    try:
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        nlp_result = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"NLP JSON parse error: {e}")
        return jsonify({"error": "NLP model returned malformed JSON. Try again."}), 500

    annotated_nodes = _annotate_nodes(nlp_result)
    graph_json = {
        "nodes": annotated_nodes,
        "edges": KNOWLEDGE_GRAPH["edges"],
        "target": target_skill,
        "model": "llama-3.3-70b NLP extraction",
    }

    # ── 3. Save to Supabase cache for next time (async, non-blocking) ─────────
    _cache_set(user_id, target_skill, completed_courses, graph_json)

    return jsonify({**graph_json, "cached": False})
