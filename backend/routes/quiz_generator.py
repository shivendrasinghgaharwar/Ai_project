from flask import Blueprint, request, jsonify
from groq import Groq
import os, json, requests, time
from dotenv import load_dotenv

load_dotenv()

quiz_gen_bp = Blueprint('quiz_gen', __name__)
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def _save_quiz_to_supabase(user_id: str, topic: str, course_id: str, questions: list) -> str | None:
    """Insert quiz into Supabase and return the new quiz ID."""
    try:
        payload = {
            "user_id": user_id,
            "course_id": course_id,
            "topic": topic,
            "questions": questions,
            "is_completed": False,
        }
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/quizzes",
            headers={**_SB_HEADERS, "Prefer": "return=representation"},
            json=payload,
            timeout=8,
        )
        rows = res.json()
        if isinstance(rows, list) and len(rows) > 0:
            return rows[0].get("id")
    except Exception as e:
        print(f"Supabase quiz insert error: {e}")
    return None


@quiz_gen_bp.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    """
    Generate a 5-question MCQ quiz using Groq Llama, save to Supabase, return quiz_id.
    """
    data = request.get_json()
    user_id   = data.get("user_id", "")
    topic     = data.get("topic", "")
    course_id = data.get("course_id", "")

    if not topic:
        return jsonify({"error": "topic is required"}), 400

    SYSTEM_PROMPT = (
        "You are a strict JSON API. "
        "Output ONLY a valid JSON array — no markdown, no explanation, no code fences. "
        "The array must contain exactly 5 objects, each with these keys: "
        '"question" (string), '
        '"options" (array of exactly 4 distinct strings), '
        '"correctAnswer" (string that exactly matches one of the options), '
        '"explanation" (string, 1-2 sentences explaining the correct answer). '
        "Do not include any text outside the JSON array."
    )

    USER_PROMPT = (
        f"Generate a 5-question multiple-choice quiz about: {topic}. "
        "Test real conceptual understanding. Wrong options must be plausible. "
        "Output ONLY the JSON array."
    )

    # ── Retry up to 2 times on JSON parse failure ─────────────────────────────
    last_error = ""
    for attempt in range(2):
        try:
            response = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": USER_PROMPT},
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=1800,
                temperature=0.4,
            )
        except Exception as e:
            error_msg = str(e)
            print(f"Groq error (attempt {attempt+1}): {error_msg}")
            if "429" in error_msg or "rate_limit" in error_msg.lower():
                return jsonify({"error": "AI is rate-limited. Please wait 1 minute and try again."}), 429
            return jsonify({"error": "AI service unavailable. Please try again."}), 500

        raw = response.choices[0].message.content.strip()
        # Strip any accidental markdown fences
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            questions = json.loads(raw)
            # Validate structure
            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("Not a list")
            for q in questions:
                assert "question" in q
                assert "options" in q and len(q["options"]) == 4
                assert "correctAnswer" in q
                assert "explanation" in q
            break  # valid — exit retry loop
        except Exception as e:
            last_error = str(e)
            print(f"JSON parse/validation error (attempt {attempt+1}): {last_error}\nRaw: {raw[:200]}")
            if attempt == 1:
                return jsonify({"error": f"AI returned malformed JSON after 2 attempts. Try again."}), 500
            time.sleep(0.5)

    # ── Save to Supabase ──────────────────────────────────────────────────────
    quiz_id = None
    if user_id:
        quiz_id = _save_quiz_to_supabase(user_id, topic, course_id, questions)

    return jsonify({
        "success": True,
        "quiz_id": quiz_id,
        "topic": topic,
        "questions": questions,
    })


@quiz_gen_bp.route('/api/complete-quiz', methods=['POST'])
def complete_quiz():
    """Mark a quiz as completed and save the score + feedback."""
    data = request.get_json()
    quiz_id  = data.get("quiz_id")
    score    = data.get("score")   # integer 0-100
    feedback = data.get("feedback", "")

    if not quiz_id:
        return jsonify({"error": "quiz_id required"}), 400

    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/quizzes?id=eq.{quiz_id}",
            headers={**_SB_HEADERS, "Prefer": "return=minimal"},
            json={"is_completed": True, "score": score, "feedback": feedback},
            timeout=8,
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Shared quiz generation helper ─────────────────────────────────────────────
def _generate_questions(system_prompt: str, user_prompt: str, n: int = 5) -> list:
    """Call Groq and return a validated list of MCQ dicts. Raises on failure."""
    SYSTEM = (
        "You are a strict JSON API. "
        "Output ONLY a valid JSON array — no markdown, no explanation, no code fences. "
        f"The array must contain exactly {n} objects, each with these keys: "
        '"question" (string), '
        '"options" (array of exactly 4 distinct strings), '
        '"correctAnswer" (string that exactly matches one of the options), '
        '"explanation" (string, 1-2 sentences explaining the correct answer). '
        "Do not include any text outside the JSON array. " + system_prompt
    )
    for attempt in range(2):
        try:
            response = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user",   "content": user_prompt},
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=2000,
                temperature=0.4,
            )
        except Exception as e:
            msg = str(e)
            if "429" in msg or "rate_limit" in msg.lower():
                raise RuntimeError("rate_limit")
            raise RuntimeError("groq_unavailable")

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        try:
            questions = json.loads(raw)
            assert isinstance(questions, list) and len(questions) > 0
            for q in questions:
                assert "question" in q and "options" in q
                assert len(q["options"]) == 4
                assert "correctAnswer" in q and "explanation" in q
            return questions
        except Exception as parse_err:
            print(f"JSON parse err attempt {attempt+1}: {parse_err}\nRaw: {raw[:300]}")
            if attempt == 1:
                raise RuntimeError("bad_json")
            time.sleep(0.5)
    raise RuntimeError("bad_json")


@quiz_gen_bp.route('/api/generate-daily-quiz', methods=['POST'])
def generate_daily_quiz():
    """
    Generate a 5-question End-of-Day review quiz based on the user's
    completed tasks today. Topics are blended into a single prompt.
    """
    data         = request.get_json()
    user_id      = data.get("user_id", "")
    completed    = data.get("completed_tasks", [])   # [{title, category}, ...]

    if not completed:
        return jsonify({"error": "No completed tasks provided."}), 400

    # Build topic string from task titles
    topic_list = ", ".join([t.get("title", "") for t in completed if t.get("title")])
    categories = list({t.get("category", "General") for t in completed if t.get("category")})
    cat_str    = ", ".join(categories)

    SYSTEM = (
        "You are an expert examiner creating an end-of-day review quiz. "
        "Blend ALL the listed topics into a cohesive, varied quiz. "
        "Each question must test a different concept from the list. "
    )
    USER = (
        f"The student studied these topics today: {topic_list} "
        f"(categories: {cat_str}). "
        "Generate a comprehensive 5-question multiple-choice quiz testing these specific concepts. "
        "Make each question target a different topic. Wrong options must be plausible. "
        "Output ONLY the JSON array."
    )

    try:
        questions = _generate_questions(SYSTEM, USER, n=5)
    except RuntimeError as e:
        if str(e) == "rate_limit":
            return jsonify({"error": "AI is rate-limited. Please wait ~1 min and try again."}), 429
        return jsonify({"error": "AI returned invalid data. Please try again."}), 500

    # Save to quizzes table
    quiz_id = None
    if user_id:
        quiz_id = _save_quiz_to_supabase(
            user_id, f"Daily Review: {topic_list[:80]}", "", questions
        )

    return jsonify({
        "success": True,
        "quiz_id": quiz_id,
        "topic": f"Daily Review — {topic_list[:60]}",
        "questions": questions,
    })


@quiz_gen_bp.route('/api/log-quiz-score', methods=['POST'])
def log_quiz_score():
    """
    Log a quiz score to the quiz_scores table and the interactions table
    so the ML recommender can use it as a signal for future course suggestions.
    """
    data           = request.get_json()
    user_id        = data.get("user_id", "")
    course_name    = data.get("course_name", "Daily Review")
    score          = data.get("score", 0)          # 0.0–1.0 float
    total_questions = data.get("total_questions", 5)

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        # 1. Log to quiz_scores
        requests.post(
            f"{SUPABASE_URL}/rest/v1/quiz_scores",
            headers={**_SB_HEADERS, "Prefer": "return=minimal"},
            json={
                "user_id": user_id,
                "course_name": course_name,
                "score": score,
                "total_questions": total_questions,
            },
            timeout=8,
        )

        # 2. Log to interactions (for the hybrid ML recommender)
        progress_pct = int(score * 100)
        rating_val = max(1, min(5, int(score * 5)))
        # Using a dummy course_id 'daily_review' (which we inserted into courses) 
        # or fallback to mapping the rating.
        requests.post(
            f"{SUPABASE_URL}/rest/v1/interactions",
            headers={**_SB_HEADERS, "Prefer": "return=minimal"},
            json={
                "user_id": user_id,
                "course_id": "daily_review",
                "progress": progress_pct,
                "rating": rating_val,
                "completed": True if progress_pct >= 80 else False
            },
            timeout=8,
        )

        return jsonify({"success": True})
    except Exception as e:
        print(f"Log quiz score error: {e}")
        return jsonify({"error": str(e)}), 500

