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
    userId: str
    medicationId: Optional[str]
    targetDate: str
    features: dict

class DoseLogRequest(BaseModel):
    userId: str
    medicationId: str
    status: str
    scheduledTime: str
    hour: int
    dayOfWeek: int

def extract_features(data: dict) -> np.ndarray:
    """Extract ML features from user data"""
    features = [
        data.get("hour", 12),
        data.get("dayOfWeek", 0),
        data.get("isWeekend", 0),
        data.get("avgAdherence7d", 80),
        data.get("avgAdherence30d", 80),
        data.get("consecutiveTaken", 0),
        data.get("consecutiveMissed", 0),
        data.get("missRateThisHour", 0.2),
        data.get("missRateThisDayOfWeek", 0.2),
        data.get("stockDaysRemaining", 30),
        data.get("daysSinceStart", 30),
        data.get("numberOfMeds", 3),
        data.get("isMorning", 0),
        data.get("isAfternoon", 0),
        data.get("isEvening", 0),
        data.get("streak", 0),
    ]
    return np.array(features).reshape(1, -1)

def calculate_heuristic_risk(features: dict) -> float:
    """Rule-based risk when ML model isn't trained yet"""
    risk = 0.15
    if features.get("avgAdherence7d", 100) < 70: risk += 0.25
    if features.get("avgAdherence7d", 100) < 50: risk += 0.20
    if features.get("isWeekend", 0): risk += 0.10
    if features.get("missRateThisHour", 0) > 0.3: risk += 0.15
    if features.get("consecutiveMissed", 0) > 0: risk += 0.15
    if features.get("stockDaysRemaining", 30) < 3: risk += 0.20
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
    
    features = extract_features(request.features)
    
    try:
        miss_prob = adherence_model.predict_proba(features)[0][1]
    except Exception:
        miss_prob = calculate_heuristic_risk(request.features)
    
    if miss_prob < 0.2:
        risk_level = "LOW"
    elif miss_prob < 0.5:
        risk_level = "MEDIUM"
    elif miss_prob < 0.75:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"
    
    risk_factors = []
    f = request.features
    
    if f.get("avgAdherence7d", 100) < 70:
        risk_factors.append("Low adherence this week")
    if f.get("missRateThisHour", 0) > 0.4:
        risk_factors.append(f"You often miss {f.get('hour', 12)}:00 doses")
    if f.get("isWeekend", 0):
        risk_factors.append("Weekend doses are harder to maintain")
    if f.get("stockDaysRemaining", 30) < 5:
        risk_factors.append("Very low stock — refill urgently")
    if f.get("consecutiveMissed", 0) > 1:
        risk_factors.append(f"Missed last {f.get('consecutiveMissed')} doses")
    
    recommendation = generate_recommendation(risk_level, risk_factors, f)
    
    return {
        "missRisk": round(float(miss_prob), 3),
        "riskLevel": risk_level,
        "riskFactors": risk_factors,
        "recommendation": recommendation,
        "confidence": 0.78 if len(risk_factors) > 0 else 0.6
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
        
        X = df[["hour","dayOfWeek","isWeekend"]].values
        y = df["status"].values
        
        global adherence_model
        adherence_model = GradientBoostingClassifier(n_estimators=100)
        adherence_model.fit(X, y)
        
        joblib.dump(adherence_model, "models/adherence_model.pkl")
        
        return {"status": "retrained", "records": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "model_ready": adherence_model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
