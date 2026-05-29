import os
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
import joblib
import pickle
from datetime import datetime
import csv
import io
from fastapi import FastAPI, HTTPException, Header, File, UploadFile
from paddleocr import PaddleOCR
import cv2

# Import trained OCR modules
from app.medical_spell_corrector import MedicalSpellCorrector
from app.medicine_extractor import MedicineExtractor
from app.prescription_preprocessor import preprocess_prescription

# Initialize PaddleOCR (English and Hindi support)
try:
    # use_textline_orientation is the replacement for deprecated use_angle_cls
    ocr = PaddleOCR(use_textline_orientation=True, lang='en')
except Exception as e:
    print(f"Failed to initialize PaddleOCR: {e}")
    ocr = None

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

# Load trained OCR models
spell_corrector = None
medicine_extractor = None

try:
    spell_corrector = MedicalSpellCorrector.load("models/spell_corrector.pkl")
    print(f"[OK] Spell corrector loaded ({spell_corrector.stats()['dictionary_size']:,} entries)")
except Exception as e:
    print(f"[WARN] Spell corrector not loaded (run train_prescription_ocr.py first): {e}")

try:
    vocab_path = "models/medicine_vocab.pkl"
    if os.path.exists(vocab_path):
        with open(vocab_path, 'rb') as f:
            vocab_data = pickle.load(f)
        medicine_extractor = MedicineExtractor()
        medicine_extractor.medicine_names = set(vocab_data.get("medicine_names", []))
        medicine_extractor.medical_terms = set(vocab_data.get("medical_terms", []))
        print(f"[OK] Medicine extractor loaded ({len(medicine_extractor.medicine_names):,} medicines)")
    else:
        medicine_extractor = MedicineExtractor()
        print("[WARN] Medicine vocabulary not found, using empty extractor")
except Exception as e:
    medicine_extractor = MedicineExtractor()
    print(f"[WARN] Medicine extractor fallback: {e}")

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

@app.post("/api/v1/predict/adherence-risk")
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

@app.post("/scan-prescription")
async def scan_prescription(
    file: UploadFile = File(...),
    x_api_secret: str = Header(None, alias="X-API-Secret")
):
    if os.getenv("ML_API_SECRET") and x_api_secret != os.getenv("ML_API_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if not ocr:
        return {
            "success": False,
            "error": "OCR engine not initialized",
            "medicines": []
        }

    try:
        # Read file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "error": "Invalid image file", "medicines": []}
        
        # Step 1: Preprocess image using Model-1/5 pipeline
        try:
            img_preprocessed = preprocess_prescription(
                img, 
                do_page_detection=True,
                do_deskew=True,
                do_enhance=True,
                do_denoise=True
            )
        except Exception as e:
            print(f"Preprocessing fallback: {e}")
            img_preprocessed = img
        
        # Step 2: Run PaddleOCR on preprocessed image
        result = ocr.ocr(img_preprocessed)
        
        raw_text = []
        if result and len(result) > 0:
            page = result[0]
            if isinstance(page, dict):
                raw_text = page.get("rec_texts", [])
            elif isinstance(page, list):
                for line in page:
                    if isinstance(line, list) and len(line) > 1 and isinstance(line[1], tuple):
                        raw_text.append(line[1][0])
        
        # Step 3: Apply medical spell correction (from Model-5)
        corrected_text = []
        if spell_corrector and spell_corrector.is_trained:
            for text in raw_text:
                corrected = spell_corrector.correct_text(text)
                corrected_text.append(corrected)
        else:
            corrected_text = raw_text
        
        # Step 4: Extract medicines using trained vocabulary
        medicines = []
        if medicine_extractor:
            medicines = medicine_extractor.extract_medicines(corrected_text)
        
        # Fallback: simple keyword extraction if no medicines found
        if not medicines:
            med_keywords = ["tablet", "tab", "capsule", "cap", "mg", "ml", "syrup", "syp", "inj"]
            for i, text in enumerate(corrected_text):
                text_lower = text.lower()
                if any(k in text_lower for k in med_keywords):
                    med_name = text
                    dosage = ""
                    if "mg" in text_lower:
                        parts = text.split()
                        for p in parts:
                            if "mg" in p.lower():
                                dosage = p
                    
                    medicines.append({
                        "name": med_name,
                        "dosage": dosage,
                        "form": "tablet" if "tab" in text_lower else "capsule" if "cap" in text_lower else "syrup",
                        "frequency": "",
                        "duration": "",
                        "confidence": 0.7,
                        "raw_text": text,
                    })

        return {
            "success": True,
            "raw_text": raw_text,
            "corrected_text": corrected_text,
            "medicines": medicines[:10],
            "total_lines": len(raw_text),
            "spell_correction_active": spell_corrector is not None and spell_corrector.is_trained,
            "vocabulary_loaded": medicine_extractor is not None and len(medicine_extractor.medicine_names) > 0,
        }
    except Exception as e:
        print(f"OCR Error: {e}")
        return {
            "success": False,
            "error": str(e),
            "medicines": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
