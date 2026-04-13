from flask import Blueprint, request, jsonify
from groq import Groq
import os, json
import requests
from dotenv import load_dotenv

load_dotenv()

quiz_bp = Blueprint('quiz', __name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

COURSE_CONTENT = {
    "Machine Learning Fundamentals": """
        Topics: Supervised learning, unsupervised learning, regression, classification,
        clustering (K-Means), decision trees, random forests, SVMs, neural networks,
        overfitting, cross-validation, bias-variance tradeoff, gradient descent,
        scikit-learn, model evaluation metrics (accuracy, precision, recall, F1).
    """,
    "Data Structures & Algorithms": """
        Topics: Arrays, linked lists, stacks, queues, trees (BST, AVL), heaps,
        graphs (BFS, DFS), dynamic programming, greedy algorithms, sorting
        (quicksort, mergesort, heapsort), searching (binary search),
        time complexity (Big-O notation), space complexity.
    """,
    "Recommender Systems": """
        Topics: Collaborative filtering, content-based filtering, matrix factorization,
        SVD, ALS, hybrid recommenders, cold start problem, evaluation metrics
        (RMSE, MAE, precision@k), implicit vs explicit feedback, deep learning
        for recommendations, knowledge graphs.
    """,
    "Deep Learning & Computer Vision": """
        Topics: CNNs, RNNs, LSTMs, transformers, attention mechanism, transfer learning,
        object detection (YOLO, Faster R-CNN), image segmentation, GANs,
        PyTorch, TensorFlow, batch normalization, dropout, backpropagation.
    """,
}


@quiz_bp.route('/api/quiz/generate', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    course_name = data.get("course_name", "")
    num_questions = min(int(data.get("num_questions", 5)), 10)

    course_content = COURSE_CONTENT.get(
        course_name,
        f"Core concepts and fundamentals of {course_name}"
    )

    prompt = f"""You are an expert quiz generator for the course "{course_name}".

Course content: {course_content}

Generate exactly {num_questions} multiple-choice questions.
Return ONLY a valid JSON array, no markdown, no explanation, just the JSON.
Format:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 2,
    "explanation": "Brief explanation of why this is correct."
  }}
]

Rules:
- Questions must test real conceptual understanding, not trivia
- Wrong options must be plausible (not obviously wrong)
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D)
- Return ONLY the JSON array, nothing else"""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            max_tokens=2000,
            temperature=0.7,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        questions = json.loads(raw)
        return jsonify({
            "questions": questions,
            "course": course_name,
            "model": "llama-3.3-70b-versatile (RAG pipeline)"
        })
    except json.JSONDecodeError:
        return jsonify({"error": "AI returned invalid JSON. Try again."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@quiz_bp.route('/api/quiz/save-score', methods=['POST'])
def save_score():
    """Save quiz score back to Supabase to feed recommendation engine."""
    data = request.get_json()
    user_id = data.get("user_id")
    course = data.get("course_name")
    score = data.get("score")
    total = data.get("total_questions")

    if not all([user_id, course, score is not None]):
        return jsonify({"error": "Missing fields"}), 400

    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        payload = {
            "user_id": user_id,
            "course_name": course,
            "score": round(float(score), 3),
            "total_questions": total,
        }
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/quiz_scores",
            headers=headers,
            json=payload,
            timeout=10,
        )
        res.raise_for_status()
        return jsonify({"saved": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
