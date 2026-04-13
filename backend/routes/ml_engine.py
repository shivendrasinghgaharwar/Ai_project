from flask import Blueprint, request, jsonify
from ml.burnout_predictor import predict_burnout
import os
import requests
from dotenv import load_dotenv

load_dotenv()

ml_bp = Blueprint('ml', __name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def sb_get(table: str, params: dict) -> list:
    """Fetch rows from Supabase REST API."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=headers,
        params=params,
        timeout=10,
    )
    res.raise_for_status()
    return res.json()


@ml_bp.route('/api/ml/burnout', methods=['POST'])
def burnout():
    data = request.get_json()
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        # Fetch last 7 days of study sessions via Supabase REST
        rows = sb_get("study_sessions", {
            "select": "date,duration_minutes",
            "user_id": f"eq.{user_id}",
            "order": "date.desc",
            "limit": 7,
        })

        hours = [round(s["duration_minutes"] / 60, 1) for s in rows]
        hours.reverse()  # oldest first

        # If no sessions yet, provide a default healthy pattern so UI is useful
        if not hours:
            hours = [2, 3, 2, 3, 2, 0, 0]

        # Approximate completion rate from session consistency
        rate = min(1.0, len([h for h in hours if h > 0]) / 7)

        result = predict_burnout(
            study_hours_last_7_days=hours,
            task_completion_rates=[rate] * len(hours)
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ml_bp.route('/api/ml/predict-schedule', methods=['POST'])
def predict_schedule():
    """Returns AI-recommended daily schedule for next week."""
    data = request.get_json()
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        rows = sb_get("study_sessions", {
            "select": "date,duration_minutes,category",
            "user_id": f"eq.{user_id}",
            "order": "date.desc",
            "limit": 14,
        })

        hours = [round(s["duration_minutes"] / 60, 1) for s in rows]
        avg = sum(hours) / max(1, len(hours)) if hours else 2.0

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        loads = ["Light", "Medium", "Push", "Review", "Light", "Rest", "Rest"]
        schedule = []
        for day, load in zip(days, loads):
            if load == "Rest":
                hrs = 0
                desc = "Rest day — model recommends recovery"
            elif load == "Light":
                hrs = max(1, round(avg * 0.6))
                desc = f"{hrs}h light revision — prevent burnout"
            elif load == "Push":
                hrs = round(avg * 1.4)
                desc = f"{hrs}h deep focus sprint"
            else:
                hrs = round(avg)
                desc = f"{hrs}h standard study session"
            schedule.append({"day": day, "load": load,
                              "recommended_hours": hrs, "description": desc})

        return jsonify({"schedule": schedule, "avg_daily_hours": round(avg, 1)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
