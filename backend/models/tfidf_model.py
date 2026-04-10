"""
TF-IDF Content-Based Recommender
==================================
Uses Term Frequency-Inverse Document Frequency to vectorize course
descriptions, then cosine similarity to find similar courses.

Key features:
  - Bigram support (captures "machine learning", "data science", etc.)
  - Pre-computed similarity matrix for O(1) lookups
  - Cold-start support: match user interests to course descriptions
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class TFIDFRecommender:
    """Content-based filtering using TF-IDF vectorization."""

    def __init__(self, max_features=5000, ngram_range=(1, 2)):
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            stop_words="english",
            sublinear_tf=True,   # apply log normalization
        )
        self.tfidf_matrix = None
        self.similarity_matrix = None
        self.course_ids = None
        self.course_id_to_idx = None
        self.is_fitted = False

    def fit(self, courses_df):
        """
        Fit the TF-IDF model on course text features.

        Args:
            courses_df: DataFrame with 'course_id' and 'text_features_clean' columns
        """
        self.course_ids = courses_df["course_id"].tolist()
        self.course_id_to_idx = {cid: idx for idx, cid in enumerate(self.course_ids)}

        # Vectorize course descriptions
        text_features = courses_df["text_features_clean"].fillna("").tolist()
        self.tfidf_matrix = self.vectorizer.fit_transform(text_features)

        # Pre-compute similarity matrix (courses × courses)
        self.similarity_matrix = cosine_similarity(self.tfidf_matrix)
        self.is_fitted = True

        print(f"   📐 TF-IDF matrix shape: {self.tfidf_matrix.shape}")
        print(f"   🔗 Similarity matrix: {self.similarity_matrix.shape}")
        print(f"   📊 Top features: {self.vectorizer.get_feature_names_out()[:10].tolist()}")

    def get_similar_courses(self, course_id, n=10, exclude_ids=None):
        """
        Find top-N courses similar to a given course.

        Args:
            course_id: The reference course ID
            n: Number of recommendations
            exclude_ids: List of course IDs to exclude (e.g., already completed)

        Returns:
            List of (course_id, similarity_score) tuples
        """
        if not self.is_fitted or course_id not in self.course_id_to_idx:
            return []

        idx = self.course_id_to_idx[course_id]
        sim_scores = list(enumerate(self.similarity_matrix[idx]))

        # Sort by similarity (descending), exclude self
        sim_scores.sort(key=lambda x: x[1], reverse=True)

        exclude_set = set(exclude_ids or [])
        exclude_set.add(course_id)

        results = []
        for i, score in sim_scores:
            cid = self.course_ids[i]
            if cid not in exclude_set and score > 0:
                results.append((cid, float(score)))
                if len(results) >= n:
                    break

        return results

    def recommend_for_user(self, user_interactions_df, courses_df, n=10):
        """
        Recommend courses for a user based on their interaction history.
        Aggregates similarity scores across all courses the user has rated highly.

        Args:
            user_interactions_df: DataFrame of user's interactions
            courses_df: Full courses DataFrame
            n: Number of recommendations

        Returns:
            List of (course_id, score) tuples
        """
        if not self.is_fitted or len(user_interactions_df) == 0:
            return []

        # Weight by user rating (higher rated = more influence)
        rated_courses = user_interactions_df[["course_id", "rating_normalized"]].values
        all_course_ids = set(self.course_ids)
        interacted_ids = set(user_interactions_df["course_id"].tolist())

        # Aggregate similarity scores
        score_map = {}
        for course_id, rating_norm in rated_courses:
            if course_id not in self.course_id_to_idx:
                continue
            idx = self.course_id_to_idx[course_id]
            for j, sim_score in enumerate(self.similarity_matrix[idx]):
                candidate_id = self.course_ids[j]
                if candidate_id in interacted_ids:
                    continue
                weighted_score = sim_score * rating_norm
                score_map[candidate_id] = score_map.get(candidate_id, 0) + weighted_score

        # Normalize scores
        if score_map:
            max_score = max(score_map.values())
            if max_score > 0:
                score_map = {k: v / max_score for k, v in score_map.items()}

        # Sort and return top-N
        sorted_recs = sorted(score_map.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]

    def recommend_cold_start(self, user_interests_text, n=10, exclude_ids=None):
        """
        Cold-start recommendation: match user stated interests against courses.

        Args:
            user_interests_text: String of user interests (e.g. "python, machine learning")
            n: Number of recommendations
            exclude_ids: Course IDs to skip

        Returns:
            List of (course_id, score) tuples
        """
        if not self.is_fitted:
            return []

        # Vectorize user interests
        interests_vec = self.vectorizer.transform([user_interests_text.lower()])
        scores = cosine_similarity(interests_vec, self.tfidf_matrix).flatten()

        exclude_set = set(exclude_ids or [])

        results = []
        indices = np.argsort(scores)[::-1]
        for idx in indices:
            cid = self.course_ids[idx]
            if cid not in exclude_set and scores[idx] > 0:
                results.append((cid, float(scores[idx])))
                if len(results) >= n:
                    break

        return results

    def get_model_info(self):
        """Return model metadata."""
        return {
            "model_type": "TF-IDF Content-Based Filtering",
            "num_courses": len(self.course_ids) if self.course_ids else 0,
            "vocabulary_size": len(self.vectorizer.vocabulary_) if self.is_fitted else 0,
            "max_features": self.vectorizer.max_features,
            "ngram_range": list(self.vectorizer.ngram_range),
            "is_fitted": self.is_fitted,
        }
