"""
Data Preprocessor
==================
Handles all data cleaning, normalization, and text preprocessing
for the recommendation engine.

Pipeline:
  1. Load CSVs
  2. Handle missing values
  3. Normalize ratings (0-1)
  4. Clean text (lowercase, remove stopwords, lemmatize)
  5. Build combined text features
  6. Build user-item matrix
"""

import re
import pandas as pd
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download required NLTK data (first run only)
for resource in ["stopwords", "wordnet", "omw-1.4"]:
    try:
        nltk.data.find(f"corpora/{resource}")
    except LookupError:
        nltk.download(resource, quiet=True)


class DataPreprocessor:
    """Cleans and transforms raw data for the recommendation models."""

    def __init__(self):
        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()
        self.courses_df = None
        self.users_df = None
        self.interactions_df = None
        self.user_item_matrix = None

    def load_data(self, courses_path, users_path, interactions_path):
        """Load raw CSV files."""
        self.courses_df = pd.read_csv(courses_path)
        self.users_df = pd.read_csv(users_path)
        self.interactions_df = pd.read_csv(interactions_path)

        print(f"   📚 Courses loaded:      {len(self.courses_df)} rows")
        print(f"   👥 Users loaded:        {len(self.users_df)} rows")
        print(f"   🔗 Interactions loaded: {len(self.interactions_df)} rows")
        return self

    def handle_missing_values(self):
        """Drop critical nulls, fill optional nulls."""
        # Drop rows with missing key identifiers
        before = len(self.interactions_df)
        self.interactions_df.dropna(subset=["user_id", "course_id"], inplace=True)
        dropped = before - len(self.interactions_df)
        if dropped > 0:
            print(f"   ⚠️  Dropped {dropped} interaction rows with missing IDs")

        # Fill missing ratings with median
        if self.interactions_df["rating"].isnull().any():
            median_rating = self.interactions_df["rating"].median()
            self.interactions_df["rating"].fillna(median_rating, inplace=True)
            print(f"   🔧 Filled missing ratings with median: {median_rating}")

        # Fill missing progress with 0
        if "progress" in self.interactions_df.columns:
            self.interactions_df["progress"].fillna(0, inplace=True)

        # Fill missing text fields
        self.courses_df["description"].fillna("", inplace=True)
        self.courses_df["tags"].fillna("", inplace=True)
        self.courses_df["category"].fillna("General", inplace=True)

        print("   ✅ Missing values handled")
        return self

    def normalize_ratings(self):
        """Min-max normalize ratings to [0, 1] range."""
        r_min = self.interactions_df["rating"].min()
        r_max = self.interactions_df["rating"].max()

        if r_max > r_min:
            self.interactions_df["rating_normalized"] = (
                (self.interactions_df["rating"] - r_min) / (r_max - r_min)
            )
        else:
            self.interactions_df["rating_normalized"] = 1.0

        print(f"   📊 Ratings normalized: [{r_min}, {r_max}] → [0.0, 1.0]")
        return self

    def clean_text(self, text):
        """Clean a single text string: lowercase, remove punctuation, stopwords, lemmatize."""
        if not isinstance(text, str):
            return ""
        # Lowercase
        text = text.lower()
        # Remove punctuation and special characters
        text = re.sub(r"[^a-zA-Z\s]", " ", text)
        # Tokenize
        tokens = text.split()
        # Remove stopwords and lemmatize
        tokens = [
            self.lemmatizer.lemmatize(token)
            for token in tokens
            if token not in self.stop_words and len(token) > 2
        ]
        return " ".join(tokens)

    def build_text_features(self):
        """Combine title + description + tags + category into a single text feature."""
        self.courses_df["text_features"] = (
            self.courses_df["title"].fillna("") + " " +
            self.courses_df["description"].fillna("") + " " +
            self.courses_df["tags"].fillna("").str.replace(",", " ") + " " +
            self.courses_df["category"].fillna("")
        )

        # Clean combined text
        self.courses_df["text_features_clean"] = (
            self.courses_df["text_features"].apply(self.clean_text)
        )

        print(f"   📝 Text features built and cleaned for {len(self.courses_df)} courses")
        return self

    def build_user_item_matrix(self):
        """Create user-item pivot table (rows=users, cols=courses, values=normalized ratings)."""
        self.user_item_matrix = self.interactions_df.pivot_table(
            index="user_id",
            columns="course_id",
            values="rating_normalized",
            aggfunc="mean",  # in case of duplicates
            fill_value=0,
        )

        print(f"   🔢 User-item matrix: {self.user_item_matrix.shape[0]} users × "
              f"{self.user_item_matrix.shape[1]} courses")
        sparsity = 1 - (np.count_nonzero(self.user_item_matrix.values) /
                        self.user_item_matrix.size)
        print(f"   🕳️  Matrix sparsity: {sparsity * 100:.1f}%")
        return self

    def preprocess_all(self, courses_path, users_path, interactions_path):
        """Run the complete preprocessing pipeline."""
        print("\n🔧 PREPROCESSING PIPELINE")
        print("─" * 40)
        print("\n1️⃣  Loading data...")
        self.load_data(courses_path, users_path, interactions_path)

        print("\n2️⃣  Handling missing values...")
        self.handle_missing_values()

        print("\n3️⃣  Normalizing ratings...")
        self.normalize_ratings()

        print("\n4️⃣  Building text features...")
        self.build_text_features()

        print("\n5️⃣  Building user-item matrix...")
        self.build_user_item_matrix()

        print("\n" + "─" * 40)
        print("✅ Preprocessing complete!\n")

        return {
            "courses": self.courses_df,
            "users": self.users_df,
            "interactions": self.interactions_df,
            "user_item_matrix": self.user_item_matrix,
        }

    def get_user_interactions(self, user_id):
        """Get all interactions for a specific user."""
        return self.interactions_df[self.interactions_df["user_id"] == user_id]

    def get_user_rated_courses(self, user_id):
        """Get list of course_ids a user has interacted with."""
        user_data = self.get_user_interactions(user_id)
        return user_data["course_id"].tolist()

    def get_course_info(self, course_id):
        """Get full course information."""
        course = self.courses_df[self.courses_df["course_id"] == course_id]
        if len(course) == 0:
            return None
        return course.iloc[0].to_dict()
