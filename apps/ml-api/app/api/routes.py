"""
API Routes
==========
All FastAPI endpoint definitions for the ML service.
"""

import os
import csv
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.predict_schema import (
    PredictRequest, PredictResponse,
    DoseLogRequest, DoseLogResponse,
    HealthResponse,
)
from app.services.prediction_service import predict_adherence
from app.ml.inference.model_loader import are_models_trained, get_model_meta

router = APIRouter(prefix="/api/v1", tags=["ML"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "datasets")


@router.post("/predict/adherence-risk", response_model=PredictResponse)
async def predict(data: PredictRequest):
    """
    Predict adherence risk for a patient.
    Returns a behavioral risk score with explanation.
    """
    return predict_adherence(data)


@router.post("/log-dose", response_model=DoseLogResponse)
async def log_dose(data: DoseLogRequest):
    """
    Log a dose event for future model retraining.
    Appends the record to a local CSV.
    """
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        csv_path = os.path.join(DATA_DIR, "dose_logs.csv")

        record = {
            "userId": data.userId,
            "medicationId": data.medicationId,
            "hour": data.hour,
            "dayOfWeek": data.dayOfWeek,
            "isWeekend": 1 if data.dayOfWeek >= 5 else 0,
            "status": data.status,
            "scheduledTime": data.scheduledTime,
            "timestamp": datetime.now().isoformat(),
        }

        file_exists = os.path.isfile(csv_path)
        with open(csv_path, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=record.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(record)

        return DoseLogResponse(status="logged", message="Behavioral log recorded successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health():
    """Service health check with model status."""
    meta = get_model_meta()
    return HealthResponse(
        status="healthy",
        modelsReady=are_models_trained(),
        modelVersion=meta.get("version") if meta else None,
    )
