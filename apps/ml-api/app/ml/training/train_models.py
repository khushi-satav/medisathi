"""
MediSathi ML Model Training Script
===================================
Generates synthetic healthcare behavioral data and trains two models:
  1. Adherence Risk Model (GradientBoosting) — predicts probability of missing a dose
  2. Risk Scoring Model (RandomForest) — classifies risk level (LOW/MEDIUM/HIGH/CRITICAL)

All predictions are BEHAVIORAL, not diagnostic. We predict "likelihood of missed dose",
never "likelihood of disease".

Usage:
    python -m app.ml.training.train_models
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SAVED_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "saved_models")
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "datasets")


def generate_synthetic_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate synthetic patient behavioral data for training.

    Features (all behavioral, NOT diagnostic):
      - age: patient age (18-85)
      - missed_doses_last_7d: number of missed doses in last 7 days (0-14)
      - frequency: daily medication frequency (1-4)
      - has_chronic_condition: whether patient has a chronic condition (0/1)
      - adherence_streak: consecutive days of perfect adherence (0-90)
      - hour_of_day: scheduled dose hour (6-22)
      - is_weekend: whether the dose falls on a weekend (0/1)
      - num_medications: total medications the patient takes (1-8)
      - days_since_start: days since medication was started (1-365)
      - stock_days_remaining: days of medication stock left (0-60)

    Target:
      - missed: 1 if the dose was missed, 0 if taken (behavioral outcome)
    """
    np.random.seed(42)

    age = np.random.randint(18, 86, n_samples)
    missed_doses_last_7d = np.random.poisson(2, n_samples).clip(0, 14)
    frequency = np.random.choice([1, 2, 3, 4], n_samples, p=[0.3, 0.35, 0.25, 0.1])
    has_chronic = np.random.binomial(1, 0.4, n_samples)
    adherence_streak = np.random.exponential(15, n_samples).astype(int).clip(0, 90)
    hour_of_day = np.random.choice(range(6, 23), n_samples)
    is_weekend = np.random.binomial(1, 2 / 7, n_samples)
    num_medications = np.random.randint(1, 9, n_samples)
    days_since_start = np.random.randint(1, 366, n_samples)
    stock_days_remaining = np.random.randint(0, 61, n_samples)

    # Build a realistic target variable based on behavioral risk factors
    # Coefficients tuned to produce ~25-35% positive class (missed doses)
    miss_score = (
        0.15                                              # baseline miss rate
        + 0.06 * missed_doses_last_7d                     # past behavior is biggest predictor
        - 0.012 * adherence_streak                        # streaks reduce risk
        + 0.15 * is_weekend                               # weekends are harder
        + 0.05 * (frequency - 1)                          # more frequent = harder
        + 0.003 * np.maximum(age - 60, 0)                 # elderly slightly more at risk
        + 0.08 * (num_medications > 4).astype(float)      # polypharmacy
        - 0.002 * np.minimum(days_since_start, 90)        # habit formation helps
        + 0.15 * (stock_days_remaining < 5).astype(float) # low stock
        + 0.10 * ((hour_of_day >= 13) & (hour_of_day <= 15)).astype(float)  # afternoon slump
    )
    miss_score = miss_score.clip(0, 1)
    missed = (np.random.random(n_samples) < miss_score).astype(int)

    df = pd.DataFrame({
        "age": age,
        "missed_doses_last_7d": missed_doses_last_7d,
        "frequency": frequency,
        "has_chronic_condition": has_chronic,
        "adherence_streak": adherence_streak,
        "hour_of_day": hour_of_day,
        "is_weekend": is_weekend,
        "num_medications": num_medications,
        "days_since_start": days_since_start,
        "stock_days_remaining": stock_days_remaining,
        "missed": missed,
    })

    return df


def train_adherence_model(df: pd.DataFrame):
    """Train a GradientBoosting classifier for adherence risk prediction."""
    feature_cols = [
        "age", "missed_doses_last_7d", "frequency", "has_chronic_condition",
        "adherence_streak", "hour_of_day", "is_weekend", "num_medications",
        "days_since_start", "stock_days_remaining"
    ]
    X = df[feature_cols]
    y = df["missed"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info(f"Adherence Model Accuracy: {acc:.4f}")
    logger.info(f"\n{classification_report(y_test, y_pred, target_names=['taken', 'missed'])}")

    return model, feature_cols


def train_risk_model(df: pd.DataFrame):
    """Train a RandomForest classifier for risk level categorization."""
    feature_cols = [
        "age", "missed_doses_last_7d", "frequency", "has_chronic_condition",
        "adherence_streak", "hour_of_day", "is_weekend", "num_medications",
        "days_since_start", "stock_days_remaining"
    ]

    # Create per-row risk score from features (deterministic, no randomness)
    risk_score = (
        0.15
        + 0.06 * df["missed_doses_last_7d"]
        - 0.012 * df["adherence_streak"]
        + 0.15 * df["is_weekend"]
        + 0.05 * (df["frequency"] - 1)
        + 0.003 * np.maximum(df["age"] - 60, 0)
        + 0.08 * (df["num_medications"] > 4).astype(float)
        - 0.002 * np.minimum(df["days_since_start"], 90)
        + 0.15 * (df["stock_days_remaining"] < 5).astype(float)
        + 0.10 * ((df["hour_of_day"] >= 13) & (df["hour_of_day"] <= 15)).astype(float)
    ).clip(0, 1)

    risk_labels = pd.cut(risk_score, bins=[-0.01, 0.2, 0.4, 0.6, 1.01],
                         labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"])

    X = df[feature_cols]
    y = risk_labels.astype(str)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info(f"Risk Model Accuracy: {acc:.4f}")
    logger.info(f"\n{classification_report(y_test, y_pred, zero_division=0)}")

    return model


def main():
    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
    os.makedirs(DATASETS_DIR, exist_ok=True)

    logger.info("Step 1/4: Generating synthetic behavioral data...")
    df = generate_synthetic_data(5000)
    dataset_path = os.path.join(DATASETS_DIR, "synthetic_adherence_data.csv")
    df.to_csv(dataset_path, index=False)
    logger.info(f"  Saved dataset → {dataset_path}  ({len(df)} records)")

    logger.info("Step 2/4: Training adherence prediction model...")
    adherence_model, feature_cols = train_adherence_model(df)
    adherence_path = os.path.join(SAVED_MODELS_DIR, "adherence_model.pkl")
    joblib.dump(adherence_model, adherence_path)
    logger.info(f"  Saved model → {adherence_path}")

    logger.info("Step 3/4: Training risk scoring model...")
    risk_model = train_risk_model(df)
    risk_path = os.path.join(SAVED_MODELS_DIR, "risk_model.pkl")
    joblib.dump(risk_model, risk_path)
    logger.info(f"  Saved model → {risk_path}")

    # Save feature column names for inference
    meta_path = os.path.join(SAVED_MODELS_DIR, "model_meta.pkl")
    joblib.dump({"feature_cols": feature_cols, "version": "1.0.0"}, meta_path)
    logger.info(f"  Saved metadata → {meta_path}")

    logger.info("Step 4/4: Done! All models trained and saved.")
    logger.info(f"  Dataset class distribution:\n{df['missed'].value_counts().to_string()}")


if __name__ == "__main__":
    main()
