from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
import joblib
import os
from datetime import datetime
import csv

app = FastAPI(title="MediSaathi ML API")

# Load or create models
try:
    adherence_model = joblib.load("models/adherence_model.pkl")
    risk_model = joblib.load("models/risk_model.pkl")
except:
    adherence_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
    risk_model = RandomForestClassifier(n_estimators=50, random_state=42)
    # Create models dir if not exists
    os.makedirs("models", exist_ok=True)
    os.makedirs("data", exist_ok=True)

class PredictionRequest(BaseModel):
    age: int
    missed_doses_last_7d: int
    frequency: int
    has_chronic_condition: int
    adherence_streak: int
    hour_of_day: int
    is_weekend: int
    num_medications: int
    days_since_start: int
    stock_days_remaining: int

class DoseLogRequest(BaseModel):
    userId: str
    medicationId: str
    status: str
    scheduledTime: str
    hour: int
    dayOfWeek: int

def extract_features(request: PredictionRequest) -> np.ndarray:
    """Extract ML features from PredictionRequest"""
    features = [
        request.age,
        request.missed_doses_last_7d,
        request.frequency,
        request.has_chronic_condition,
        request.adherence_streak,
        request.hour_of_day,
        request.is_weekend,
        request.num_medications,
        request.days_since_start,
        request.stock_days_remaining
    ]
    return np.array(features).reshape(1, -1)

def calculate_heuristic_risk(request: PredictionRequest) -> float:
    """Rule-based risk when ML model isn't trained yet"""
    risk = 0.10
    if request.missed_doses_last_7d >= 3: risk += 0.30
    if request.adherence_streak < 5: risk += 0.15
    if request.stock_days_remaining < 3: risk += 0.20
    if request.is_weekend: risk += 0.10
    if request.age > 70: risk += 0.10
    return min(risk, 0.95)

def generate_recommendation(level: str, factors: list, features: dict) -> str:
    hour = features.get("hour", 12)
    if level == "LOW":
        return "You're doing great! Keep taking your medication at the scheduled time."
    elif level == "MEDIUM":
        if "weekend" in str(factors).lower():
            return "Set an extra alarm for weekend doses — you tend to miss those."
        return f"Consider setting a backup reminder 15 minutes before {hour}:00."
    elif level == "HIGH":
        return "High miss risk today. Ask a family member to remind you, or take your dose now if the time is close."
    else:
        return "Critical risk. Please take your medication immediately and contact your caregiver."

@app.post("/predict")
async def predict_adherence(
    request: PredictionRequest,
    x_api_secret: str = Header(None, alias="X-API-Secret")
):
    if os.getenv("ML_API_SECRET") and x_api_secret != os.getenv("ML_API_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    features = extract_features(request)
    
    try:
        # Check if model is fitted
        if hasattr(adherence_model, "classes_"):
            miss_prob = adherence_model.predict_proba(features)[0][1]
        else:
            miss_prob = calculate_heuristic_risk(request)
    except Exception as e:
        print(f"Prediction error: {e}")
        miss_prob = calculate_heuristic_risk(request)
    
    if miss_prob < 0.2:
        risk_level = "LOW"
    elif miss_prob < 0.5:
        risk_level = "MEDIUM"
    elif miss_prob < 0.75:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"
    
    risk_factors = []
    
    if request.missed_doses_last_7d >= 3:
        risk_factors.append("Multiple missed doses in the last 7 days")
    if request.adherence_streak < 5:
        risk_factors.append("Short adherence streak")
    if request.is_weekend:
        risk_factors.append("Weekend routine changes often affect adherence")
    if request.stock_days_remaining < 5:
        risk_factors.append("Very low stock — refill soon")
    
    recommendation = generate_recommendation(risk_level, risk_factors, {"hour": request.hour_of_day})
    
    return {
        "missRisk": round(float(miss_prob), 3),
        "riskLevel": risk_level,
        "riskFactors": risk_factors,
        "recommendation": recommendation,
        "confidence": 0.85 if hasattr(adherence_model, "classes_") else 0.6
    }

@app.post("/log-dose")
async def log_dose_for_training(
    data: DoseLogRequest,
    x_api_secret: str = Header(None, alias="X-API-Secret")
):
    if os.getenv("ML_API_SECRET") and x_api_secret != os.getenv("ML_API_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    training_record = {
        "userId": data.userId,
        "hour": data.hour,
        "dayOfWeek": data.dayOfWeek,
        "isWeekend": 1 if data.dayOfWeek >= 5 else 0,
        "status": 1 if data.status == "TAKEN" else 0,
        "timestamp": datetime.now().isoformat()
    }
    
    os.makedirs("data", exist_ok=True)
    file_exists = os.path.isfile("data/training_data.csv")
    with open("data/training_data.csv", "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=training_record.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(training_record)
    
    return {"status": "logged"}

@app.post("/retrain")
async def retrain_model(
    x_api_secret: str = Header(None, alias="X-API-Secret")
):
    if os.getenv("ML_API_SECRET") and x_api_secret != os.getenv("ML_API_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        if not os.path.isfile("data/training_data.csv"):
            return {"status": "no_data"}
        
        df = pd.read_csv("data/training_data.csv")
        
        if len(df) < 100:
            return {"status": "insufficient_data", "records": len(df)}
        
        # Features used for training (all except the target 'missed')
        feature_cols = [
            'age', 'missed_doses_last_7d', 'frequency', 'has_chronic_condition', 
            'adherence_streak', 'hour_of_day', 'is_weekend', 'num_medications', 
            'days_since_start', 'stock_days_remaining'
        ]
        
        X = df[feature_cols].values
        y = df["missed"].values
        
        global adherence_model
        # Using GradientBoosting for better accuracy on this structured data
        adherence_model = GradientBoostingClassifier(
            n_estimators=100, 
            learning_rate=0.1,
            max_depth=4,
            random_state=42
        )
        adherence_model.fit(X, y)
        
        joblib.dump(adherence_model, "models/adherence_model.pkl")
        
        return {
            "status": "retrained", 
            "records": len(df),
            "model_type": "GradientBoostingClassifier",
            "features": feature_cols
        }
    except Exception as e:
        print(f"Retrain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "model_ready": adherence_model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
