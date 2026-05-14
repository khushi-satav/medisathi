"""
Model Loader
=============
Loads trained .pkl models from saved_models/ at startup.
Falls back to untrained classifiers if models haven't been trained yet.
"""

import os
import joblib
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
import logging

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAVED_MODELS_DIR = os.path.join(BASE_DIR, "..", "..", "..", "saved_models")

_adherence_model = None
_risk_model = None
_model_meta = None
_models_trained = False


def _load_models():
    global _adherence_model, _risk_model, _model_meta, _models_trained

    adherence_path = os.path.join(SAVED_MODELS_DIR, "adherence_model.pkl")
    risk_path = os.path.join(SAVED_MODELS_DIR, "risk_model.pkl")
    meta_path = os.path.join(SAVED_MODELS_DIR, "model_meta.pkl")

    if os.path.isfile(adherence_path):
        _adherence_model = joblib.load(adherence_path)
        logger.info("✅ Loaded trained adherence model.")
    else:
        _adherence_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        logger.warning("⚠️  adherence_model.pkl not found — using untrained fallback.")

    if os.path.isfile(risk_path):
        _risk_model = joblib.load(risk_path)
        logger.info("✅ Loaded trained risk model.")
    else:
        _risk_model = RandomForestClassifier(n_estimators=50, random_state=42)
        logger.warning("⚠️  risk_model.pkl not found — using untrained fallback.")

    if os.path.isfile(meta_path):
        _model_meta = joblib.load(meta_path)
        logger.info(f"✅ Model metadata loaded (version {_model_meta.get('version', '?')}).")

    _models_trained = os.path.isfile(adherence_path) and os.path.isfile(risk_path)


# Load on import
_load_models()


def get_adherence_model():
    return _adherence_model


def get_risk_model():
    return _risk_model


def get_model_meta():
    return _model_meta


def are_models_trained() -> bool:
    return _models_trained
