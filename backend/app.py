"""
Flask REST API — Personalized Learning Recommender
=====================================================
Serves recommendations via a REST API with the following endpoints:

  GET  /api/courses                  → List all courses
  GET  /api/courses/<id>             → Course details
  GET  /api/users                    → List all users
  GET  /api/users/<id>               → User profile + history
  GET  /api/recommendations/<uid>    → Personalized top-N recommendations
  GET  /api/similar/<course_id>      → Content-similar courses
  GET  /api/trending                 → Most popular courses
  GET  /api/evaluation               → Model performance metrics
  POST /api/interactions             → Log new interaction
  GET  /api/system/architecture      → System info
"""

import os
import sys
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

# ── Project imports ──────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    COURSES_CSV, USERS_CSV, INTERACTIONS_CSV,
    TFIDF_MAX_FEATURES, TFIDF_NGRAM_RANGE,
    KNN_N_NEIGHBORS, KNN_METRIC,
    HYBRID_WEIGHTS, DEFAULT_TOP_N, EVAL_K,
    FLASK_HOST, FLASK_PORT, FLASK_DEBUG,
    SUPABASE_JWT_SECRET,
)
from preprocessing.preprocessor import DataPreprocessor
from models.tfidf_model import TFIDFRecommender
from models.knn_model import KNNRecommender
from models.hybrid_model import HybridRecommender
from evaluation.evaluator import RecommenderEvaluator

# ─── Initialize Flask ────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

from routes.gemini import gemini_bp
app.register_blueprint(gemini_bp)

# ─── JWT Auth Middleware ──────────────────────────────────────────────────────
import jwt as pyjwt
from functools import wraps

IS_DEV_MODE = os.getenv("FLASK_ENV", "production").lower() == "development"

def require_auth(f):
    """Decorator that validates Supabase JWT from Authorization header.
    In dev mode (FLASK_ENV=development), logs warnings but allows requests through."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            if IS_DEV_MODE:
                print(f"⚠️  [AUTH-DEV] No Bearer token on {request.path} — allowing in dev mode")
                request.supabase_user_id = request.args.get("user_id", request.view_args.get("user_id", "dev-user"))
                return f(*args, **kwargs)
            return jsonify({"status": "error", "message": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = pyjwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            request.supabase_user_id = payload.get("sub", "")
            print(f"✅ [AUTH] Token valid for user: {request.supabase_user_id[:8]}...")
        except pyjwt.ExpiredSignatureError:
            if IS_DEV_MODE:
                print(f"⚠️  [AUTH-DEV] Expired token on {request.path} — allowing in dev mode")
                # Decode without verification to extract user ID
                payload = pyjwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                request.supabase_user_id = payload.get("sub", "dev-user")
                return f(*args, **kwargs)
            return jsonify({"status": "error", "message": "Token expired"}), 401
        except pyjwt.InvalidTokenError as e:
            if IS_DEV_MODE:
                print(f"⚠️  [AUTH-DEV] Invalid token on {request.path}: {e} — allowing in dev mode")
                # Decode without verification to extract user ID
                try:
                    payload = pyjwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                    request.supabase_user_id = payload.get("sub", "dev-user")
                except Exception:
                    request.supabase_user_id = "dev-user"
                return f(*args, **kwargs)
            return jsonify({"status": "error", "message": f"Invalid token: {str(e)}"}), 401
        return f(*args, **kwargs)
    return decorated

# ─── Global state ────────────────────────────────────────────────────────────
preprocessor = None
tfidf_model = None
knn_model = None
hybrid_model = None
evaluator = None
eval_results = None
data = {}  # holds dataframes


def initialize_system():
    """Load data, preprocess, fit models, and run evaluation."""
    global preprocessor, tfidf_model, knn_model, hybrid_model
    global evaluator, eval_results, data

    print("\n" + "█" * 60)
    print("  🚀 INITIALIZING RECOMMENDATION ENGINE")
    print("█" * 60)

    # ── Step 1: Check if dataset exists, generate if not ─────────────
    if not os.path.exists(COURSES_CSV):
        print("\n⚠️  Dataset not found. Generating synthetic data...")
        from data.generate_dataset import main as generate_data
        generate_data()

    # ── Step 2: Preprocess data ──────────────────────────────────────
    preprocessor = DataPreprocessor()
    data = preprocessor.preprocess_all(COURSES_CSV, USERS_CSV, INTERACTIONS_CSV)

    # ── Step 3: Fit TF-IDF model ─────────────────────────────────────
    print("\n📐 FITTING TF-IDF MODEL")
    print("─" * 40)
    tfidf_model = TFIDFRecommender(
        max_features=TFIDF_MAX_FEATURES,
        ngram_range=TFIDF_NGRAM_RANGE,
    )
    tfidf_model.fit(data["courses"])

    # ── Step 4: Fit KNN model ────────────────────────────────────────
    print("\n👥 FITTING KNN MODEL")
    print("─" * 40)
    knn_model = KNNRecommender(
        n_neighbors=KNN_N_NEIGHBORS,
        metric=KNN_METRIC,
    )
    knn_model.fit(data["user_item_matrix"])

    # ── Step 5: Create Hybrid model ──────────────────────────────────
    print("\n🔀 CREATING HYBRID MODEL")
    print("─" * 40)
    hybrid_model = HybridRecommender(tfidf_model, knn_model, HYBRID_WEIGHTS)
    print("   ✅ Hybrid combiner ready")
    print(f"   ⚖️  Weight profiles: {json.dumps(HYBRID_WEIGHTS, indent=2)}")

    # ── Step 6: Run evaluation ───────────────────────────────────────
    evaluator = RecommenderEvaluator(k=EVAL_K)
    eval_results = evaluator.evaluate_all(
        tfidf_model, knn_model, hybrid_model,
        data["interactions"], data["courses"], data["users"],
    )

    print("\n" + "█" * 60)
    print("  ✅ SYSTEM READY — API STARTING")
    print("█" * 60 + "\n")


# ═════════════════════════════════════════════════════════════════════════════
# API ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/onboarding", methods=["POST"])
def onboard_user():
    """
    Accept onboarding data from the frontend and seed the ML model.
    Expects: { user_id, primary_goal, skills: {category: 1-5}, weekly_hours }
    """
    import pandas as pd
    from datetime import datetime

    req = request.get_json()
    user_id = req.get("user_id")
    primary_goal = req.get("primary_goal", "Full-Stack Developer")
    skills = req.get("skills", {})
    weekly_hours = req.get("weekly_hours", 10)

    if not user_id:
        return jsonify({"status": "error", "message": "user_id is required"}), 400

    # ── Step 1: Create/update user profile in memory ──────────────────
    # Map skill ratings to interest keywords for TF-IDF matching
    skill_to_category = {
        "Frontend": "Web Development",
        "Backend": "Python Programming",
        "Machine Learning": "Machine Learning",
        "Data Science": "Data Science",
        "Cloud Computing": "Cloud Computing",
        "Mobile Dev": "Mobile Development",
    }

    # Build interest string from weak skills (1-2) — these need recommendations
    weak_skills = [cat for cat, rating in skills.items() if rating <= 2]
    interest_categories = [skill_to_category.get(s, s) for s in weak_skills]
    if not interest_categories:
        # If no weak skills, recommend based on goal
        interest_categories = [primary_goal]

    new_user = {
        "user_id": user_id,
        "name": f"User {user_id}",
        "learning_style": "visual",
        "preferred_difficulty": "Beginner" if any(r <= 2 for r in skills.values()) else "Intermediate",
        "interests": ", ".join(interest_categories),
        "weekly_hours": weekly_hours,
    }

    # Insert or replace user in dataframe
    existing = data["users"][data["users"]["user_id"] == user_id]
    if len(existing) > 0:
        data["users"].loc[data["users"]["user_id"] == user_id] = pd.Series(new_user)
    else:
        data["users"] = pd.concat([data["users"], pd.DataFrame([new_user])], ignore_index=True)

    # ── Step 2: Seed interactions for weak skill categories ───────────
    # Find courses matching the user's weak areas and log baseline interactions
    seeded_interactions = []
    courses_df = data["courses"]

    for cat_name in interest_categories:
        matching = courses_df[courses_df["category"] == cat_name]
        if len(matching) > 0:
            # Pick up to 3 intro-level courses per weak category
            beginner_courses = matching[matching["difficulty"] == "Beginner"].head(3)
            if len(beginner_courses) == 0:
                beginner_courses = matching.head(3)

            for _, course in beginner_courses.iterrows():
                interaction = {
                    "user_id": user_id,
                    "course_id": course["course_id"],
                    "rating": 4,
                    "progress": 5,
                    "completed": False,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "rating_normalized": 0.75,
                }
                seeded_interactions.append(interaction)

    if seeded_interactions:
        data["interactions"] = pd.concat(
            [data["interactions"], pd.DataFrame(seeded_interactions)],
            ignore_index=True,
        )

    # ── Step 3: Generate first recommendations ───────────────────────
    try:
        result = hybrid_model.recommend(
            user_id,
            data["interactions"],
            data["users"],
            data["courses"],
            n=DEFAULT_TOP_N,
        )
        recommendations = result.get("recommendations", [])
    except Exception:
        recommendations = []

    return jsonify({
        "status": "success",
        "message": f"User {user_id} onboarded successfully",
        "user_profile": new_user,
        "seeded_interactions": len(seeded_interactions),
        "initial_recommendations": len(recommendations),
    })


@app.route("/api/courses", methods=["GET"])
def get_courses():
    """List all courses with optional filtering."""
    courses_df = data["courses"]

    # Optional filters
    category = request.args.get("category")
    difficulty = request.args.get("difficulty")
    search = request.args.get("search", "").lower()

    filtered = courses_df.copy()
    if category:
        filtered = filtered[filtered["category"] == category]
    if difficulty:
        filtered = filtered[filtered["difficulty"] == difficulty]
    if search:
        mask = (
            filtered["title"].str.lower().str.contains(search, na=False) |
            filtered["description"].str.lower().str.contains(search, na=False) |
            filtered["tags"].str.lower().str.contains(search, na=False)
        )
        filtered = filtered[mask]

    courses = filtered.to_dict(orient="records")
    return jsonify({
        "status": "success",
        "count": len(courses),
        "courses": courses,
    })


@app.route("/api/courses/<course_id>", methods=["GET"])
def get_course(course_id):
    """Get details for a specific course."""
    course = data["courses"][data["courses"]["course_id"] == course_id]
    if len(course) == 0:
        return jsonify({"status": "error", "message": "Course not found"}), 404

    course_dict = course.iloc[0].to_dict()

    # Get interaction stats
    course_interactions = data["interactions"][
        data["interactions"]["course_id"] == course_id
    ]
    course_dict["num_enrolled"] = len(course_interactions)
    course_dict["avg_progress"] = float(course_interactions["progress"].mean()) if len(course_interactions) > 0 else 0
    course_dict["completion_rate"] = float(
        course_interactions["completed"].mean() * 100
    ) if len(course_interactions) > 0 else 0

    return jsonify({"status": "success", "course": course_dict})


@app.route("/api/users", methods=["GET"])
def get_users():
    """List all users."""
    users = data["users"].to_dict(orient="records")
    return jsonify({
        "status": "success",
        "count": len(users),
        "users": users,
    })


@app.route("/api/users/<user_id>", methods=["GET"])
def get_user(user_id):
    """Get user profile + interaction history."""
    user = data["users"][data["users"]["user_id"] == user_id]
    if len(user) == 0:
        # Return a stub profile for Supabase users not yet in the ML dataset
        return jsonify({
            "status": "success",
            "user": {
                "user_id": user_id,
                "name": "New User",
                "interaction_count": 0,
                "interactions": [],
                "interests": "",
                "weekly_hours": 0,
            }
        })

    user_dict = user.iloc[0].to_dict()

    # Get user interaction history
    user_interactions = data["interactions"][
        data["interactions"]["user_id"] == user_id
    ].sort_values("rating", ascending=False)

    user_dict["interaction_count"] = len(user_interactions)
    user_dict["interactions"] = user_interactions.to_dict(orient="records")

    # Enrich with course titles
    for interaction in user_dict["interactions"]:
        course = data["courses"][
            data["courses"]["course_id"] == interaction["course_id"]
        ]
        if len(course) > 0:
            interaction["course_title"] = course.iloc[0]["title"]
            interaction["course_category"] = course.iloc[0]["category"]

    return jsonify({"status": "success", "user": user_dict})


@app.route("/api/recommendations/<user_id>", methods=["GET"])
@require_auth
def get_recommendations(user_id):
    """Get personalized recommendations for a user (requires auth)."""
    n = request.args.get("n", DEFAULT_TOP_N, type=int)

    user = data["users"][data["users"]["user_id"] == user_id]
    if len(user) == 0:
        # User not in ML dataset yet — return cold-start (top trending) recommendations
        try:
            course_stats = data["interactions"].groupby("course_id").agg(
                score=("rating", "mean")
            ).reset_index().nlargest(n, "score")

            cold_recs = []
            for _, row in course_stats.iterrows():
                c = data["courses"][data["courses"]["course_id"] == row["course_id"]]
                if len(c) > 0:
                    c_dict = c.iloc[0].to_dict()
                    c_dict["score"] = round(row["score"], 4)
                    c_dict["reason"] = "Popular among learners"
                    cold_recs.append(c_dict)

            return jsonify({
                "status": "success",
                "mode": "cold_start",
                "user_id": user_id,
                "recommendations": cold_recs,
            })
        except Exception:
            return jsonify({"status": "success", "mode": "cold_start", "recommendations": []})

    result = hybrid_model.recommend(
        user_id,
        data["interactions"],
        data["users"],
        data["courses"],
        n=n,
    )

    return jsonify({"status": "success", **result})


@app.route("/api/similar/<course_id>", methods=["GET"])
def get_similar_courses(course_id):
    """Get courses similar to a given course (content-based)."""
    n = request.args.get("n", DEFAULT_TOP_N, type=int)

    course = data["courses"][data["courses"]["course_id"] == course_id]
    if len(course) == 0:
        return jsonify({"status": "error", "message": "Course not found"}), 404

    similar = tfidf_model.get_similar_courses(course_id, n=n)

    results = []
    for cid, score in similar:
        c = data["courses"][data["courses"]["course_id"] == cid]
        if len(c) > 0:
            c_dict = c.iloc[0].to_dict()
            c_dict["similarity_score"] = round(score, 4)
            results.append(c_dict)

    return jsonify({
        "status": "success",
        "reference_course": course.iloc[0]["title"],
        "count": len(results),
        "similar_courses": results,
    })


@app.route("/api/trending", methods=["GET"])
def get_trending():
    """Get most popular/trending courses."""
    n = request.args.get("n", DEFAULT_TOP_N, type=int)

    # Aggregate interaction metrics per course
    course_stats = data["interactions"].groupby("course_id").agg(
        num_enrollments=("user_id", "count"),
        avg_rating=("rating", "mean"),
        avg_progress=("progress", "mean"),
        completion_rate=("completed", "mean"),
    ).reset_index()

    # Compute trending score (weighted combination)
    course_stats["trending_score"] = (
        0.4 * (course_stats["num_enrollments"] / course_stats["num_enrollments"].max()) +
        0.3 * (course_stats["avg_rating"] / 5.0) +
        0.2 * (course_stats["avg_progress"] / 100.0) +
        0.1 * course_stats["completion_rate"]
    )

    top_courses = course_stats.nlargest(n, "trending_score")

    results = []
    for _, row in top_courses.iterrows():
        course = data["courses"][data["courses"]["course_id"] == row["course_id"]]
        if len(course) > 0:
            c_dict = course.iloc[0].to_dict()
            c_dict["trending_score"] = round(row["trending_score"], 4)
            c_dict["num_enrollments"] = int(row["num_enrollments"])
            c_dict["avg_rating"] = round(row["avg_rating"], 2)
            c_dict["avg_progress"] = round(row["avg_progress"], 1)
            c_dict["completion_rate"] = round(row["completion_rate"] * 100, 1)
            results.append(c_dict)

    return jsonify({
        "status": "success",
        "count": len(results),
        "trending_courses": results,
    })


@app.route("/api/evaluation", methods=["GET"])
def get_evaluation():
    """Get model evaluation metrics."""
    return jsonify({
        "status": "success",
        "evaluation": eval_results,
        "k": EVAL_K,
        "model_info": hybrid_model.get_model_info(),
    })


@app.route("/api/interactions", methods=["POST"])
@require_auth
def log_interaction():
    """Log a new user-course interaction (requires auth)."""
    req = request.get_json()

    required = ["user_id", "course_id", "rating"]
    for field in required:
        if field not in req:
            return jsonify({"status": "error", "message": f"Missing field: {field}"}), 400

    # Validate rating range
    rating = req["rating"]
    if not (1 <= rating <= 5):
        return jsonify({"status": "error", "message": "Rating must be between 1 and 5"}), 400

    # Add to interactions DataFrame
    import pandas as pd
    from datetime import datetime

    new_interaction = {
        "user_id": req["user_id"],
        "course_id": req["course_id"],
        "rating": rating,
        "progress": req.get("progress", 0),
        "completed": req.get("progress", 0) >= 90,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rating_normalized": (rating - 1) / 4,  # normalize to [0, 1]
    }

    new_row = pd.DataFrame([new_interaction])
    data["interactions"] = pd.concat([data["interactions"], new_row], ignore_index=True)

    return jsonify({
        "status": "success",
        "message": "Interaction logged",
        "interaction": new_interaction,
    })


@app.route("/api/system/architecture", methods=["GET"])
def get_architecture():
    """Return system architecture information."""
    return jsonify({
        "status": "success",
        "architecture": {
            "system_name": "Personalized Learning Recommender System",
            "version": "1.0.0",
            "models": {
                "tfidf": tfidf_model.get_model_info(),
                "knn": knn_model.get_model_info(),
                "hybrid": hybrid_model.get_model_info(),
            },
            "data_stats": {
                "num_courses": len(data["courses"]),
                "num_users": len(data["users"]),
                "num_interactions": len(data["interactions"]),
                "categories": data["courses"]["category"].unique().tolist(),
                "difficulty_levels": data["courses"]["difficulty"].unique().tolist(),
            },
            "tech_stack": {
                "backend": "Flask (Python)",
                "ml_models": ["TF-IDF", "KNN", "Weighted Hybrid"],
                "libraries": ["scikit-learn", "pandas", "numpy", "scipy", "nltk"],
                "evaluation_metrics": ["Precision@K", "Recall@K", "Coverage", "Diversity"],
            },
            "design_decisions": [
                "Avoided deep learning — interpretability matters in education",
                "KNN is transparent and explainable for student recommendations",
                "TF-IDF handles cold start effectively for new users",
                "Hybrid model balances exploration and personalization",
                "Dynamic weight adjustment based on user engagement level",
            ],
        },
    })


@app.route("/", methods=["GET"])
def index():
    """Health check / API info."""
    return jsonify({
        "status": "online",
        "name": "Personalized Learning Recommender API",
        "version": "1.0.0",
        "endpoints": [
            "GET  /api/courses",
            "GET  /api/courses/<id>",
            "GET  /api/users",
            "GET  /api/users/<id>",
            "GET  /api/recommendations/<user_id>",
            "GET  /api/similar/<course_id>",
            "GET  /api/trending",
            "GET  /api/evaluation",
            "POST /api/interactions",
            "GET  /api/system/architecture",
        ],
    })


# ─── Database Health Check ───────────────────────────────────────────────────
@app.route("/api/health/db", methods=["GET"])
def health_db():
    """Verify the Supabase Postgres connection."""
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return jsonify({"status": "error", "message": "DATABASE_URL not set in .env"}), 500

    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user, version();")
        db_name, db_user, db_version = cur.fetchone()
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
        tables = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({
            "status": "success",
            "database": db_name,
            "user": db_user,
            "version": db_version[:50],
            "public_tables": tables,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ─── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🌐 Starting API server...")
    print(f"   📡 http://{FLASK_HOST}:{FLASK_PORT}")
    if IS_DEV_MODE:
        print(f"   🔓 DEV MODE: Auth decorator will log warnings but allow requests")
    print(f"   📖 Endpoints: /api/courses, /api/recommendations, /api/trending ...\n")
    initialize_system()
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
