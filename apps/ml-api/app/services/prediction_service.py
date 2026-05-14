"""
Prediction Service
==================
Contains the core business logic for adherence risk prediction.
All predictions are BEHAVIORAL, not diagnostic.
"""

import numpy as np
import logging
from app.ml.inference.model_loader import (
    get_adherence_model, get_risk_model, get_model_meta, are_models_trained
)
from app.schemas.predict_schema import PredictRequest, PredictResponse

logger = logging.getLogger(__name__)

FEATURE_ORDER = [
    "age", "missed_doses_last_7d", "frequency", "has_chronic_condition",
    "adherence_streak", "hour_of_day", "is_weekend", "num_medications",
    "days_since_start", "stock_days_remaining"
]


def _extract_features(data: PredictRequest) -> np.ndarray:
    """Convert a PredictRequest into a feature vector matching training column order."""
    features = [
        data.age,
        data.missed_doses_last_7d,
        data.frequency,
        int(data.has_chronic_condition),
        data.adherence_streak,
        data.hour_of_day,
        int(data.is_weekend),
        data.num_medications,
        data.days_since_start,
        data.stock_days_remaining,
    ]
    return np.array(features).reshape(1, -1)


def _heuristic_risk(data: PredictRequest) -> float:
    """Rule-based fallback when models aren't trained yet."""
    risk = 0.10
    if data.missed_doses_last_7d > 3:
        risk += 0.30
    elif data.missed_doses_last_7d > 1:
        risk += 0.15
    if data.is_weekend:
        risk += 0.10
    if data.adherence_streak < 3:
        risk += 0.15
    if data.frequency > 2:
        risk += 0.08
    if data.stock_days_remaining < 3:
        risk += 0.15
    if data.num_medications > 4:
        risk += 0.05
    return min(risk, 0.95)


def _identify_risk_factors(data: PredictRequest) -> list[str]:
    """Identify human-readable behavioral risk factors."""
    factors = []
    if data.missed_doses_last_7d > 3:
        factors.append(f"Missed {data.missed_doses_last_7d} doses in the past week")
    elif data.missed_doses_last_7d > 1:
        factors.append(f"Missed {data.missed_doses_last_7d} doses recently")
    if data.is_weekend:
        factors.append("Weekend doses are harder to maintain")
    if data.adherence_streak == 0:
        factors.append("No active adherence streak — building a routine helps")
    if data.stock_days_remaining < 5:
        factors.append(f"Only {data.stock_days_remaining} days of stock remaining — refill soon")
    if data.frequency >= 3:
        factors.append(f"Taking {data.frequency} doses/day increases complexity")
    if data.num_medications > 4:
        factors.append(f"Managing {data.num_medications} medications simultaneously")
    if 13 <= data.hour_of_day <= 15:
        factors.append("Afternoon doses are more commonly missed")
    return factors


def _recommendation_for(risk_level: str, factors: list[str]) -> str:
    """Generate a safe, behavioral recommendation (never diagnostic)."""
    if risk_level == "LOW":
        return "You're doing great! Keep up your consistent routine."
    elif risk_level == "MEDIUM":
        if any("weekend" in f.lower() for f in factors):
            return "Consider setting an extra weekend alarm — weekday habits don't always carry over."
        return "Set a backup reminder 15 minutes before your scheduled dose time."
    elif risk_level == "HIGH":
        return "High probability of missed dose today. Ask a family member to remind you, or take your dose now if it's close to the scheduled time."
    else:
        return "Critical risk detected. Please take your medication immediately and inform your caregiver."


def predict_adherence(data: PredictRequest) -> PredictResponse:
    """Main prediction function. Uses trained model if available, heuristic otherwise."""
    features = _extract_features(data)
    used_trained = False
    meta = get_model_meta()
    model_version = meta.get("version", "0.0.0") if meta else "0.0.0"

    if are_models_trained():
        try:
            model = get_adherence_model()
            probability = model.predict_proba(features)
            miss_prob = float(probability[0][1])
            used_trained = True
            confidence = round(max(float(probability[0][0]), float(probability[0][1])), 3)
        except Exception as e:
            logger.warning(f"Model inference failed, falling back to heuristic: {e}")
            miss_prob = _heuristic_risk(data)
            confidence = 0.55
    else:
        miss_prob = _heuristic_risk(data)
        confidence = 0.55

    # Categorize risk level
    if miss_prob < 0.2:
        risk_level = "LOW"
    elif miss_prob < 0.5:
        risk_level = "MEDIUM"
    elif miss_prob < 0.75:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    risk_factors = _identify_risk_factors(data)
    recommendation = _recommendation_for(risk_level, risk_factors)

    return PredictResponse(
        missRisk=round(miss_prob, 3),
        riskLevel=risk_level,
        riskFactors=risk_factors,
        recommendation=recommendation,
        confidence=confidence,
        modelVersion=model_version,
        usedTrainedModel=used_trained,
    )
