"""
Configuration constants for the Personalized Learning Recommender System.
"""
import os
from dotenv import load_dotenv

# Load .env file (for local dev secrets like JWT)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

# ─── Supabase Auth ───────────────────────────────────────────────────────────
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
COURSES_CSV = os.path.join(DATA_DIR, "courses.csv")
USERS_CSV = os.path.join(DATA_DIR, "users.csv")
INTERACTIONS_CSV = os.path.join(DATA_DIR, "interactions.csv")

# ─── Dataset Generation ─────────────────────────────────────────────────────
NUM_COURSES = 100
NUM_USERS = 500
NUM_INTERACTIONS = 5000

# ─── Model Hyperparameters ──────────────────────────────────────────────────
# TF-IDF
TFIDF_MAX_FEATURES = 5000
TFIDF_NGRAM_RANGE = (1, 2)

# KNN
KNN_N_NEIGHBORS = 20
KNN_METRIC = "cosine"

# Hybrid weights (dynamic, based on user interaction count)
HYBRID_WEIGHTS = {
    "cold_start":  {"tfidf": 0.8, "knn": 0.2},   # 0 interactions
    "light_user":  {"tfidf": 0.6, "knn": 0.4},   # 1-4 interactions
    "active_user": {"tfidf": 0.4, "knn": 0.6},   # 5-19 interactions
    "power_user":  {"tfidf": 0.3, "knn": 0.7},   # 20+ interactions
}

# ─── Recommendation ─────────────────────────────────────────────────────────
DEFAULT_TOP_N = 10

# ─── Evaluation ──────────────────────────────────────────────────────────────
EVAL_K = 10
EVAL_TEST_SIZE = 0.2
EVAL_RANDOM_STATE = 42

# ─── Flask ───────────────────────────────────────────────────────────────────
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = True

# ─── Course Categories & Tags ───────────────────────────────────────────────
CATEGORIES = [
    "Python Programming",
    "Data Science",
    "Machine Learning",
    "Web Development",
    "Cloud Computing",
    "DevOps",
    "Databases",
    "Artificial Intelligence",
    "Cybersecurity",
    "Mobile Development",
]

DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"]
