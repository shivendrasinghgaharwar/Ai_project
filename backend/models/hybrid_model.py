"""
Hybrid Recommendation Model
==============================
Combines TF-IDF (content-based) and KNN (collaborative) scores
into a single ranked recommendation list.

Key features:
  - Dynamic weight adjustment based on user interaction count
  - Cold-start fallback to pure content-based
  - Score normalization before combination
  - Confidence scoring for each recommendation
"""

import numpy as np
import pandas as pd


class HybridRecommender:
    """Weighted hybrid recommender combining TF-IDF and KNN models."""

    def __init__(self, tfidf_model, knn_model, weight_config):
        """
        Args:
            tfidf_model: Fitted TFIDFRecommender instance
            knn_model: Fitted KNNRecommender instance
            weight_config: Dict with weight profiles for different user types
                {
                    "cold_start":  {"tfidf": 0.8, "knn": 0.2},
                    "light_user":  {"tfidf": 0.6, "knn": 0.4},
                    "active_user": {"tfidf": 0.4, "knn": 0.6},
                    "power_user":  {"tfidf": 0.3, "knn": 0.7},
                }
        """
        self.tfidf_model = tfidf_model
        self.knn_model = knn_model
        self.weight_config = weight_config

    def _get_user_type(self, interaction_count):
        """Classify user based on number of interactions."""
        if interaction_count == 0:
            return "cold_start"
        elif interaction_count < 5:
            return "light_user"
        elif interaction_count < 20:
            return "active_user"
        else:
            return "power_user"

    def _get_weights(self, user_type):
        """Get model weights for a user type."""
        return self.weight_config.get(user_type, {"tfidf": 0.5, "knn": 0.5})

    def _normalize_scores(self, score_list):
        """Normalize a list of (id, score) tuples to [0, 1] range."""
        if not score_list:
            return {}
        scores = {item[0]: item[1] for item in score_list}
        max_score = max(scores.values()) if scores else 1
        if max_score > 0:
            return {k: v / max_score for k, v in scores.items()}
        return scores

    def recommend(self, user_id, interactions_df, users_df, courses_df, n=10):
        """
        Generate hybrid recommendations for a user.

        Logic:
          1. Determine user type (cold_start, light, active, power)
          2. Get TF-IDF scores
          3. Get KNN scores (if user has history)
          4. Normalize both score sets
          5. Combine: final = α × tfidf + (1−α) × knn
          6. Return top-N with metadata

        Args:
            user_id: Target user ID
            interactions_df: All user interactions
            users_df: All user profiles
            courses_df: All course data
            n: Number of recommendations

        Returns:
            dict with recommendations, user_type, weights, and metadata
        """
        # Get user's interaction history
        user_interactions = interactions_df[interactions_df["user_id"] == user_id]
        interaction_count = len(user_interactions)
        user_type = self._get_user_type(interaction_count)
        weights = self._get_weights(user_type)

        # Get user info
        user_info = users_df[users_df["user_id"] == user_id]
        user_interests = ""
        if len(user_info) > 0:
            user_interests = user_info.iloc[0].get("interests", "")

        # Already interacted courses
        interacted_ids = set(user_interactions["course_id"].tolist())

        # ── Get TF-IDF scores ────────────────────────────────────────────
        if interaction_count == 0 and user_interests:
            # Cold start: use stated interests
            tfidf_scores_raw = self.tfidf_model.recommend_cold_start(
                user_interests, n=n * 3, exclude_ids=list(interacted_ids)
            )
        elif interaction_count > 0:
            tfidf_scores_raw = self.tfidf_model.recommend_for_user(
                user_interactions, courses_df, n=n * 3
            )
        else:
            tfidf_scores_raw = []

        # ── Get KNN scores ───────────────────────────────────────────────
        if interaction_count > 0 and self.knn_model.is_fitted:
            knn_scores_raw = self.knn_model.recommend(user_id, n=n * 3)
        else:
            knn_scores_raw = []

        # ── Normalize ────────────────────────────────────────────────────
        tfidf_scores = self._normalize_scores(tfidf_scores_raw)
        knn_scores = self._normalize_scores(knn_scores_raw)

        # ── Combine scores ───────────────────────────────────────────────
        all_course_ids = set(tfidf_scores.keys()) | set(knn_scores.keys())
        combined_scores = {}

        for cid in all_course_ids:
            t_score = tfidf_scores.get(cid, 0.0)
            k_score = knn_scores.get(cid, 0.0)
            combined = (weights["tfidf"] * t_score) + (weights["knn"] * k_score)
            combined_scores[cid] = {
                "final_score": combined,
                "tfidf_score": t_score,
                "knn_score": k_score,
            }

        # ── Sort and build results ───────────────────────────────────────
        sorted_recs = sorted(
            combined_scores.items(),
            key=lambda x: x[1]["final_score"],
            reverse=True,
        )[:n]

        # Enrich with course metadata
        recommendations = []
        for rank, (course_id, scores) in enumerate(sorted_recs, 1):
            course_info = courses_df[courses_df["course_id"] == course_id]
            if len(course_info) == 0:
                continue

            course = course_info.iloc[0]
            recommendations.append({
                "rank": rank,
                "course_id": course_id,
                "title": course.get("title", "Unknown"),
                "description": course.get("description", ""),
                "category": course.get("category", ""),
                "difficulty": course.get("difficulty", ""),
                "tags": course.get("tags", ""),
                "duration_hours": float(course.get("duration_hours", 0)),
                "instructor": course.get("instructor", ""),
                "rating_avg": float(course.get("rating_avg", 0)),
                "final_score": round(scores["final_score"], 4),
                "tfidf_score": round(scores["tfidf_score"], 4),
                "knn_score": round(scores["knn_score"], 4),
                "recommendation_reason": self._get_reason(
                    scores["tfidf_score"], scores["knn_score"], user_type
                ),
            })

        return {
            "user_id": user_id,
            "user_type": user_type,
            "interaction_count": interaction_count,
            "weights": weights,
            "num_recommendations": len(recommendations),
            "recommendations": recommendations,
        }

    def _get_reason(self, tfidf_score, knn_score, user_type):
        """Generate a human-readable recommendation reason."""
        if user_type == "cold_start":
            return "Matches your stated interests"
        elif tfidf_score > knn_score * 2:
            return "Content matches your learning history"
        elif knn_score > tfidf_score * 2:
            return "Popular among similar learners"
        elif tfidf_score > 0 and knn_score > 0:
            return "Great content match + recommended by similar learners"
        elif tfidf_score > 0:
            return "Content matches your learning pattern"
        elif knn_score > 0:
            return "Trending among similar learners"
        else:
            return "Recommended for you"

    def get_model_info(self):
        """Return hybrid model metadata."""
        return {
            "model_type": "Weighted Hybrid (TF-IDF + KNN)",
            "weight_config": self.weight_config,
            "tfidf_model": self.tfidf_model.get_model_info(),
            "knn_model": self.knn_model.get_model_info(),
        }
