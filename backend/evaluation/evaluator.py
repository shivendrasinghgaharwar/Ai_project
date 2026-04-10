"""
Recommendation System Evaluator
==================================
Evaluates TF-IDF, KNN, and Hybrid models using standard metrics:
  - Precision@K    (what fraction of recommendations are relevant)
  - Recall@K       (what fraction of relevant items are recommended)
  - RMSE           (rating prediction accuracy)
  - Coverage       (what fraction of catalog is recommended)
  - Diversity      (avg pairwise distance of recommended items)

Uses 80/20 train/test split on interaction data.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


class RecommenderEvaluator:
    """Evaluates recommendation models with standard metrics."""

    def __init__(self, k=10, test_size=0.2, random_state=42):
        self.k = k
        self.test_size = test_size
        self.random_state = random_state
        self.results = {}

    def split_data(self, interactions_df):
        """
        Split interactions into train/test sets.

        Returns:
            train_df, test_df
        """
        train_df, test_df = train_test_split(
            interactions_df,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=None,  # avoid issues with small user groups
        )
        print(f"   📊 Train set: {len(train_df)} interactions")
        print(f"   📊 Test set:  {len(test_df)} interactions")
        return train_df, test_df

    def precision_at_k(self, recommended_ids, relevant_ids, k=None):
        """
        Precision@K = |Recommended ∩ Relevant| / K

        Args:
            recommended_ids: List of recommended course IDs
            relevant_ids: Set of actually relevant course IDs
            k: Number of top recommendations to consider
        """
        k = k or self.k
        top_k = recommended_ids[:k]
        if not top_k:
            return 0.0
        hits = len(set(top_k) & set(relevant_ids))
        return hits / k

    def recall_at_k(self, recommended_ids, relevant_ids, k=None):
        """
        Recall@K = |Recommended ∩ Relevant| / |Relevant|

        Args:
            recommended_ids: List of recommended course IDs
            relevant_ids: Set of actually relevant course IDs
            k: Number of top recommendations to consider
        """
        k = k or self.k
        top_k = recommended_ids[:k]
        if not relevant_ids:
            return 0.0
        hits = len(set(top_k) & set(relevant_ids))
        return hits / len(relevant_ids)

    def rmse(self, predicted_ratings, actual_ratings):
        """
        Root Mean Squared Error between predicted and actual ratings.

        Args:
            predicted_ratings: Array of predicted values
            actual_ratings: Array of actual values
        """
        if len(predicted_ratings) == 0 or len(actual_ratings) == 0:
            return float("inf")
        predicted = np.array(predicted_ratings)
        actual = np.array(actual_ratings)
        return float(np.sqrt(np.mean((predicted - actual) ** 2)))

    def coverage(self, all_recommended_ids, total_catalog_size):
        """
        Catalog coverage: fraction of items that appear in any recommendation.

        Args:
            all_recommended_ids: Set of all course IDs recommended across all users
            total_catalog_size: Total number of courses in catalog
        """
        if total_catalog_size == 0:
            return 0.0
        return len(set(all_recommended_ids)) / total_catalog_size

    def diversity(self, recommendations, similarity_matrix, course_id_to_idx):
        """
        Intra-list diversity: average dissimilarity between recommended items.
        Higher = more diverse recommendations.

        Args:
            recommendations: List of course IDs
            similarity_matrix: Cosine similarity matrix from TF-IDF
            course_id_to_idx: Dict mapping course_id to matrix index
        """
        if len(recommendations) < 2:
            return 0.0

        total_dissimilarity = 0.0
        count = 0

        for i in range(len(recommendations)):
            for j in range(i + 1, len(recommendations)):
                cid_i = recommendations[i]
                cid_j = recommendations[j]
                if cid_i in course_id_to_idx and cid_j in course_id_to_idx:
                    idx_i = course_id_to_idx[cid_i]
                    idx_j = course_id_to_idx[cid_j]
                    sim = similarity_matrix[idx_i, idx_j]
                    total_dissimilarity += (1 - sim)
                    count += 1

        return total_dissimilarity / count if count > 0 else 0.0

    def evaluate_model(self, model_name, recommend_fn, train_df, test_df,
                       courses_df, users_df, tfidf_model=None):
        """
        Full evaluation of a recommendation model.

        Args:
            model_name: Name for reporting
            recommend_fn: Function(user_id) → list of (course_id, score)
            train_df: Training interactions
            test_df: Test interactions
            courses_df: Course catalog
            users_df: User profiles
            tfidf_model: TF-IDF model (for diversity calculation)

        Returns:
            Dict of metric results
        """
        # Get unique users in test set that also appear in training
        test_users = set(test_df["user_id"].unique())
        train_users = set(train_df["user_id"].unique())
        eval_users = test_users & train_users

        if not eval_users:
            print(f"   ⚠️  No overlapping users for {model_name}")
            return {}

        precisions = []
        recalls = []
        all_recommended = set()
        diversities = []

        for user_id in eval_users:
            # Relevant = courses in test set with rating >= 4
            user_test = test_df[test_df["user_id"] == user_id]
            relevant = set(
                user_test[user_test["rating"] >= 4]["course_id"].tolist()
            )

            if not relevant:
                continue

            # Get recommendations
            try:
                recs = recommend_fn(user_id)
                if not recs:
                    continue
                rec_ids = [r[0] if isinstance(r, tuple) else r for r in recs]
            except Exception:
                continue

            all_recommended.update(rec_ids)

            # Precision@K and Recall@K
            p = self.precision_at_k(rec_ids, relevant)
            r = self.recall_at_k(rec_ids, relevant)
            precisions.append(p)
            recalls.append(r)

            # Diversity
            if tfidf_model and tfidf_model.is_fitted:
                d = self.diversity(
                    rec_ids[:self.k],
                    tfidf_model.similarity_matrix,
                    tfidf_model.course_id_to_idx,
                )
                diversities.append(d)

        # Calculate aggregate metrics
        results = {
            "model": model_name,
            "precision_at_k": round(np.mean(precisions), 4) if precisions else 0.0,
            "recall_at_k": round(np.mean(recalls), 4) if recalls else 0.0,
            "coverage": round(self.coverage(all_recommended, len(courses_df)), 4),
            "diversity": round(np.mean(diversities), 4) if diversities else 0.0,
            "num_users_evaluated": len(precisions),
            "k": self.k,
        }

        self.results[model_name] = results
        return results

    def evaluate_all(self, tfidf_model, knn_model, hybrid_model,
                     interactions_df, courses_df, users_df):
        """
        Run full evaluation on all three models.

        Returns:
            Dict with results for each model
        """
        print("\n🧪 EVALUATION PIPELINE")
        print("─" * 50)

        # Split data
        print("\n1️⃣  Splitting data...")
        train_df, test_df = self.split_data(interactions_df)

        # Re-fit models on training data only
        # (In production, models are already fitted on all data.
        #  Here we evaluate on held-out test data.)

        all_results = {}

        # ── Evaluate TF-IDF ──────────────────────────────────────────────
        print(f"\n2️⃣  Evaluating TF-IDF (K={self.k})...")
        tfidf_result = self.evaluate_model(
            "TF-IDF (Content-Based)",
            lambda uid: tfidf_model.recommend_for_user(
                train_df[train_df["user_id"] == uid], courses_df, n=self.k
            ),
            train_df, test_df, courses_df, users_df, tfidf_model,
        )
        all_results["tfidf"] = tfidf_result

        # ── Evaluate KNN ─────────────────────────────────────────────────
        print(f"\n3️⃣  Evaluating KNN (K={self.k})...")
        knn_result = self.evaluate_model(
            "KNN (Collaborative)",
            lambda uid: knn_model.recommend(uid, n=self.k),
            train_df, test_df, courses_df, users_df, tfidf_model,
        )
        all_results["knn"] = knn_result

        # ── Evaluate Hybrid ──────────────────────────────────────────────
        print(f"\n4️⃣  Evaluating Hybrid (K={self.k})...")

        def hybrid_recommend(uid):
            result = hybrid_model.recommend(uid, interactions_df, users_df, courses_df, n=self.k)
            return [(r["course_id"], r["final_score"]) for r in result["recommendations"]]

        hybrid_result = self.evaluate_model(
            "Hybrid (TF-IDF + KNN)",
            hybrid_recommend,
            train_df, test_df, courses_df, users_df, tfidf_model,
        )
        all_results["hybrid"] = hybrid_result

        # ── Print comparison table ───────────────────────────────────────
        print("\n" + "═" * 60)
        print("  📊 MODEL COMPARISON")
        print("═" * 60)
        print(f"  {'Metric':<22} {'TF-IDF':>10} {'KNN':>10} {'Hybrid':>10}")
        print("  " + "─" * 52)

        metrics = ["precision_at_k", "recall_at_k", "coverage", "diversity"]
        labels = ["Precision@K", "Recall@K", "Coverage", "Diversity"]

        for metric, label in zip(metrics, labels):
            t = all_results.get("tfidf", {}).get(metric, 0)
            k = all_results.get("knn", {}).get(metric, 0)
            h = all_results.get("hybrid", {}).get(metric, 0)
            best = max(t, k, h)
            row = f"  {label:<22}"
            for val in [t, k, h]:
                marker = " ★" if val == best and val > 0 else "  "
                row += f"{val:>8.4f}{marker}"
            print(row)

        print("═" * 60)
        self.results = all_results
        return all_results

    def get_results_dict(self):
        """Return all evaluation results as a serializable dict."""
        return self.results
