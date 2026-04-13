import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

# ── Train a lightweight Random Forest on synthetic study patterns ──────────────
# In production this would train on real user data from Supabase
# For now we train on representative patterns so the model works immediately

def _build_training_data():
    """
    Features per day: [hours_studied, tasks_completed, task_completion_rate,
                       hours_prev_day, hours_2days_ago, day_of_week]
    Label: 0=fine, 1=burnout_risk
    """
    X, y = [], []
    patterns = [
        # healthy patterns → label 0
        ([2,3,1.0,2,2,0], 0), ([3,4,0.9,2,3,1], 0), ([2,2,1.0,3,2,2], 0),
        ([4,5,0.8,3,2,3], 0), ([1,2,1.0,4,3,4], 0), ([3,3,1.0,1,2,5], 0),
        ([2,2,1.0,3,1,6], 0), ([5,6,0.8,3,3,1], 0), ([3,4,0.9,5,3,2], 0),
        # burnout patterns → label 1
        ([9,8,0.6,1,2,0], 1), ([10,9,0.5,0,1,1], 1), ([0,0,0.0,10,9,2], 1),
        ([8,7,0.4,0,0,3], 1), ([11,10,0.3,1,0,4], 1), ([0,1,0.1,11,8,5], 1),
        ([7,6,0.5,0,1,1], 1), ([12,11,0.2,0,0,0], 1), ([1,1,0.2,12,10,2], 1),
        ([9,8,0.4,9,2,3], 1), ([0,0,0.0,9,8,4], 1),
    ]
    for feat, label in patterns:
        X.append(feat)
        y.append(label)
    return np.array(X), np.array(y)

_scaler = StandardScaler()
_model = RandomForestClassifier(n_estimators=50, random_state=42)
_X, _y = _build_training_data()
_scaler.fit(_X)
_model.fit(_scaler.transform(_X), _y)


def predict_burnout(study_hours_last_7_days: list, task_completion_rates: list) -> dict:
    """
    Given 7 days of study hours and task completion rates,
    returns burnout risk score and recommendations.
    """
    hours = list(study_hours_last_7_days) + [0] * (7 - len(study_hours_last_7_days))
    rates = list(task_completion_rates) + [1.0] * (7 - len(task_completion_rates))

    today = hours[-1] if hours else 0
    yesterday = hours[-2] if len(hours) > 1 else 0
    day_before = hours[-3] if len(hours) > 2 else 0
    tasks_done = rates[-1] if rates else 1.0
    tasks_count = max(1, round(today / 1.5)) if today > 0 else 0
    day_of_week = len([h for h in hours if h > 0]) % 7

    features = np.array([[today, tasks_count, tasks_done,
                          yesterday, day_before, day_of_week]])
    features_scaled = _scaler.transform(features)
    prob = _model.predict_proba(features_scaled)[0][1]  # probability of burnout
    risk_score = round(prob * 100)

    # ── Breakdown scores ────────────────────────────────────────────────────
    max_h = max(hours) if max(hours) > 0 else 1
    gap_score = round(min(100, (max_h - min(h for h in hours if h > 0) if any(h > 0 for h in hours) else 0) / max_h * 100))
    velocity_score = round(min(100, (1 - sum(rates) / len(rates)) * 100)) if rates else 0
    difficulty_score = round(min(100, (today / 12) * 100)) if today > 7 else round(today * 5)

    # ── Predicted next 7 days ───────────────────────────────────────────────
    avg = sum(hours) / max(1, len([h for h in hours if h > 0]))
    predictions = []
    for i in range(7):
        if risk_score > 60:
            # AI recommends lighter schedule after burnout risk
            pred = max(1, round(avg * 0.6 - i * 0.1))
        else:
            pred = round(min(8, avg + (i % 3) * 0.5))
        predictions.append(pred)

    # ── Recommendations ─────────────────────────────────────────────────────
    if risk_score >= 70:
        level = "High"
        rec = "Schedule a rest day tomorrow. Limit study to 2h max. The ML model detected unsustainable study velocity."
    elif risk_score >= 40:
        level = "Medium"
        rec = "Moderate your pace. Aim for consistent 3h sessions rather than spikes. Consider a short break mid-week."
    else:
        level = "Low"
        rec = "Study pattern looks healthy. Keep up the consistent schedule."

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "recommendation": rec,
        "breakdown": {
            "study_gaps": gap_score,
            "task_velocity": velocity_score,
            "difficulty_load": difficulty_score,
        },
        "predicted_hours_next_7_days": predictions,
        "model": "RandomForestClassifier(n_estimators=50)",
    }
