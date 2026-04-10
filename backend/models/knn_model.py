"""
KNN Collaborative Filtering Recommender
==========================================
User-based collaborative filtering using K-Nearest Neighbors.
Finds users with similar rating patterns and recommends courses
that similar users enjoyed.

Key features:
  - Cosine distance for sparse data handling
  - User-based approach ("users like you also liked...")
  - Sparse matrix representation for memory efficiency
  - Aggregated scoring across neighbor preferences
"""

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import csr_matrix


class KNNRecommender:
    """Collaborative filtering using K-Nearest Neighbors (user-based)."""

    def __init__(self, n_neighbors=20, metric="cosine"):
        self.n_neighbors = n_neighbors
        self.metric = metric
        self.model = NearestNeighbors(
            n_neighbors=n_neighbors,
            metric=metric,
            algorithm="brute",    # works well with cosine distance
            n_jobs=-1,            # parallel computation
        )
        self.user_item_matrix = None
        self.sparse_matrix = None
        self.user_ids = None
        self.course_ids = None
        self.user_id_to_idx = None
        self.is_fitted = False

    def fit(self, user_item_matrix):
        """
        Fit the KNN model on the user-item interaction matrix.

        Args:
            user_item_matrix: DataFrame (rows=users, cols=courses, values=normalized ratings)
        """
        self.user_item_matrix = user_item_matrix
        self.user_ids = user_item_matrix.index.tolist()
        self.course_ids = user_item_matrix.columns.tolist()
        self.user_id_to_idx = {uid: idx for idx, uid in enumerate(self.user_ids)}

        # Convert to sparse matrix for memory efficiency
        self.sparse_matrix = csr_matrix(user_item_matrix.values)

        # Fit KNN model
        # Adjust n_neighbors if we have fewer users
        actual_neighbors = min(self.n_neighbors, len(self.user_ids) - 1)
        if actual_neighbors < self.model.n_neighbors:
            self.model.n_neighbors = max(1, actual_neighbors)

        self.model.fit(self.sparse_matrix)
        self.is_fitted = True

        print(f"   👥 KNN fitted on {len(self.user_ids)} users × {len(self.course_ids)} courses")
        print(f"   🔍 Neighbors: {self.model.n_neighbors}")
        print(f"   📐 Matrix density: {self.sparse_matrix.nnz / self.sparse_matrix.shape[0] / self.sparse_matrix.shape[1] * 100:.1f}%")

    def find_similar_users(self, user_id, n=10):
        """
        Find the N most similar users to a given user.

        Args:
            user_id: Target user identifier
            n: Number of similar users to return

        Returns:
            List of (user_id, distance) tuples
        """
        if not self.is_fitted or user_id not in self.user_id_to_idx:
            return []

        idx = self.user_id_to_idx[user_id]
        user_vector = self.sparse_matrix[idx].reshape(1, -1)

        # Find neighbors
        k = min(n + 1, len(self.user_ids))
        distances, indices = self.model.kneighbors(user_vector, n_neighbors=k)

        results = []
        for dist, neighbor_idx in zip(distances.flatten(), indices.flatten()):
            neighbor_id = self.user_ids[neighbor_idx]
            if neighbor_id != user_id:
                # Convert cosine distance to similarity (1 - distance)
                similarity = 1 - dist
                results.append((neighbor_id, float(similarity)))

        return results[:n]

    def recommend(self, user_id, n=10):
        """
        Generate recommendations for a user based on similar users' preferences.

        Steps:
        1. Find K nearest neighbors
        2. Aggregate their ratings for courses the target user hasn't seen
        3. Weight by similarity score
        4. Return top-N

        Args:
            user_id: Target user
            n: Number of recommendations

        Returns:
            List of (course_id, score) tuples
        """
        if not self.is_fitted or user_id not in self.user_id_to_idx:
            return []

        user_idx = self.user_id_to_idx[user_id]
        user_vector = self.user_item_matrix.iloc[user_idx]

        # Courses the user has already interacted with
        interacted = set(
            self.course_ids[i]
            for i, val in enumerate(user_vector)
            if val > 0
        )

        # Find similar users
        similar_users = self.find_similar_users(user_id, n=self.model.n_neighbors)

        if not similar_users:
            return []

        # Aggregate weighted scores from similar users
        score_map = {}
        for neighbor_id, similarity in similar_users:
            if similarity <= 0:
                continue
            neighbor_idx = self.user_id_to_idx[neighbor_id]
            neighbor_vector = self.user_item_matrix.iloc[neighbor_idx]

            for i, rating in enumerate(neighbor_vector):
                if rating <= 0:
                    continue
                course_id = self.course_ids[i]
                if course_id in interacted:
                    continue
                weighted_score = float(rating) * float(similarity)
                if course_id not in score_map:
                    score_map[course_id] = 0.0
                score_map[course_id] += weighted_score

        # Normalize scores to [0, 1]
        if score_map:
            max_score = max(score_map.values())
            if max_score > 0:
                score_map = {k: v / max_score for k, v in score_map.items()}

        # Sort and return top-N
        sorted_recs = sorted(score_map.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]

    def get_model_info(self):
        """Return model metadata."""
        return {
            "model_type": "KNN Collaborative Filtering (User-Based)",
            "num_users": len(self.user_ids) if self.user_ids else 0,
            "num_courses": len(self.course_ids) if self.course_ids else 0,
            "n_neighbors": self.model.n_neighbors if self.is_fitted else self.n_neighbors,
            "metric": self.metric,
            "is_fitted": self.is_fitted,
            "matrix_density": (
                f"{self.sparse_matrix.nnz / self.sparse_matrix.shape[0] / self.sparse_matrix.shape[1] * 100:.1f}%"
                if self.is_fitted else "N/A"
            ),
        }
