"""
Train Medical Prescription OCR Models
======================================
Master training script that trains:
1. Medical spell corrector (from Model-5 vocabulary files)
2. Medicine name extractor vocabulary
3. Adherence prediction models (existing)

Uses vocabulary data from the Medical-Prescription-OCR dataset.
"""

import os
import sys
import time
import json
import pickle
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.medical_spell_corrector import MedicalSpellCorrector
from app.medicine_extractor import MedicineExtractor


# ─── Configuration ───────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
OCR_DATA_DIR = BASE_DIR / "Medical-Prescription-OCR" / "Medical-Prescription-OCR"
MODELS_DIR = BASE_DIR / "models"
SAVED_MODELS_DIR = BASE_DIR / "saved_models"

# Vocabulary files from Model-5
VOCAB_FILES = {
    "medicine_names": OCR_DATA_DIR / "Model-5" / "all_medicine_names.txt",
    "medical_terms": OCR_DATA_DIR / "Model-5" / "all_medical_terms.txt",
    "medicine_data": OCR_DATA_DIR / "Model-5" / "total_medicine_data.txt",
}


# ─── Training Functions ─────────────────────────────────────────

def train_spell_corrector():
    """Train the medical spell corrector on all available vocabulary files."""
    print("\n" + "="*60)
    print("📝 STEP 1: Training Medical Spell Corrector")
    print("="*60)
    
    corrector = MedicalSpellCorrector(max_edit_distance=2)
    start = time.time()
    
    total_stats = {"total": 0, "unique": 0}
    
    for name, filepath in VOCAB_FILES.items():
        if filepath.exists():
            stats = corrector.train_from_file(str(filepath))
            total_stats["total"] += stats["total"]
            total_stats["unique"] += stats["unique"]
        else:
            print(f"  ⚠️ Vocabulary file not found: {filepath}")
    
    # Also add common English medical abbreviations
    common_abbrevs = [
        "tablet", "capsule", "syrup", "injection", "cream", "ointment",
        "drops", "inhaler", "suspension", "gel", "lotion", "powder", "spray",
        "morning", "evening", "night", "daily", "twice", "thrice",
        "before", "after", "food", "meal", "empty", "stomach",
        "paracetamol", "amoxicillin", "ibuprofen", "aspirin", "metformin",
        "amlodipine", "omeprazole", "pantoprazole", "azithromycin",
        "ciprofloxacin", "doxycycline", "cetirizine", "montelukast",
        "atorvastatin", "losartan", "telmisartan", "metoprolol",
        "patient", "doctor", "prescription", "diagnosis", "symptoms",
        "blood", "pressure", "sugar", "cholesterol", "fever", "cough",
        "headache", "pain", "infection", "allergy", "diabetes", "hypertension",
    ]
    corrector.train_from_word_list(common_abbrevs)
    
    elapsed = time.time() - start
    
    # Save the trained model
    model_path = str(MODELS_DIR / "spell_corrector.pkl")
    corrector.save(model_path)
    
    stats = corrector.stats()
    print(f"\n  ✅ Spell corrector trained in {elapsed:.2f}s")
    print(f"     Dictionary size: {stats['dictionary_size']:,} entries")
    print(f"     Total words processed: {stats['total_words_processed']:,}")
    print(f"     Unique entries: {stats['unique_entries']:,}")
    print(f"     Longest word: {stats['longest_word']} chars")
    
    # Test the corrector
    print("\n  🧪 Testing spell correction:")
    test_words = [
        ("paracetamol", "paracetmol"),
        ("amoxicillin", "amoxicilin"),
        ("ibuprofen", "ibuprofn"),
        ("tablet", "tablt"),
        ("capsule", "capsul"),
        ("azithromycin", "azithrmycin"),
    ]
    for expected, misspelled in test_words:
        corrected = corrector.correct_word(misspelled)
        status = "✅" if corrected == expected else "⚠️"
        print(f"     {status} '{misspelled}' → '{corrected}' (expected: '{expected}')")
    
    return corrector


def train_medicine_extractor():
    """Initialize the medicine name extractor with vocabulary."""
    print("\n" + "="*60)
    print("💊 STEP 2: Training Medicine Name Extractor")
    print("="*60)
    
    start = time.time()
    
    med_vocab_path = VOCAB_FILES.get("medicine_names")
    if med_vocab_path and med_vocab_path.exists():
        extractor = MedicineExtractor(str(med_vocab_path))
    else:
        print("  ⚠️ Medicine names file not found, using empty vocabulary")
        extractor = MedicineExtractor()
    
    # Load medical terms
    med_terms_path = VOCAB_FILES.get("medical_terms")
    if med_terms_path and med_terms_path.exists():
        extractor.load_medical_terms(str(med_terms_path))
    
    # Save extractor vocabulary as a pickle for fast loading
    vocab_data = {
        "medicine_names": list(extractor.medicine_names),
        "medical_terms": list(extractor.medical_terms),
    }
    
    vocab_path = str(MODELS_DIR / "medicine_vocab.pkl")
    os.makedirs(os.path.dirname(vocab_path), exist_ok=True)
    with open(vocab_path, 'wb') as f:
        pickle.dump(vocab_data, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    elapsed = time.time() - start
    print(f"\n  ✅ Medicine extractor trained in {elapsed:.2f}s")
    print(f"     Medicine names: {len(extractor.medicine_names):,}")
    print(f"     Medical terms: {len(extractor.medical_terms):,}")
    print(f"     Vocabulary saved to {vocab_path}")
    
    # Test extraction
    print("\n  🧪 Testing medicine extraction:")
    test_lines = [
        "Tab Paracetamol 500mg",
        "Cap Amoxicillin 250mg 1x3",
        "Syp Calpol 5ml BD after food",
        "Inj Ceftriaxone 1g IV stat",
        "Tab Metformin 500mg twice daily for 30 days",
    ]
    results = extractor.extract_medicines(test_lines)
    for med in results:
        print(f"     💊 {med['name']} | {med['dosage']} | {med['form']} | "
              f"freq: {med['frequency']} | conf: {med['confidence']}")
    
    return extractor


def train_adherence_models():
    """Train the existing adherence prediction models."""
    print("\n" + "="*60)
    print("📊 STEP 3: Training Adherence Prediction Models")
    print("="*60)
    
    data_path = BASE_DIR / "data" / "training_data.csv"
    
    if not data_path.exists():
        print("  ⚠️ No training data found at data/training_data.csv")
        print("  ℹ️ Adherence models will use heuristic predictions until data is collected.")
        
        # Check for synthetic data
        synthetic_path = BASE_DIR / "datasets" / "synthetic_adherence_data.csv"
        if synthetic_path.exists():
            print(f"  📊 Found synthetic data at {synthetic_path}")
            # Import and train using existing script logic
            import pandas as pd
            from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
            import joblib
            
            df = pd.read_csv(str(synthetic_path))
            print(f"  📊 Loaded {len(df)} synthetic records")
            
            feature_cols = [
                'age', 'missed_doses_last_7d', 'frequency', 'has_chronic_condition',
                'adherence_streak', 'hour_of_day', 'is_weekend', 'num_medications',
                'days_since_start', 'stock_days_remaining'
            ]
            
            # Check which columns exist
            available_cols = [c for c in feature_cols if c in df.columns]
            if len(available_cols) >= 5 and 'missed' in df.columns:
                X = df[available_cols].values
                y = df['missed'].values
                
                print(f"  📊 Training on {len(available_cols)} features...")
                
                # Train GradientBoosting
                gb_model = GradientBoostingClassifier(
                    n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42
                )
                gb_model.fit(X, y)
                
                os.makedirs(str(MODELS_DIR), exist_ok=True)
                joblib.dump(gb_model, str(MODELS_DIR / "adherence_model.pkl"))
                print("  ✅ GradientBoosting adherence model saved")
                
                # Train RandomForest
                rf_model = RandomForestClassifier(n_estimators=50, random_state=42)
                rf_model.fit(X, y)
                joblib.dump(rf_model, str(MODELS_DIR / "risk_model.pkl"))
                print("  ✅ RandomForest risk model saved")
            else:
                print(f"  ⚠️ Insufficient columns in synthetic data. Available: {list(df.columns)}")
        
        return
    
    # Train from real data
    import pandas as pd
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    import joblib
    
    df = pd.read_csv(str(data_path), on_bad_lines='skip')
    print(f"  📊 Loaded {len(df)} training records")
    
    feature_cols = [
        'age', 'missed_doses_last_7d', 'frequency', 'has_chronic_condition',
        'adherence_streak', 'hour_of_day', 'is_weekend', 'num_medications',
        'days_since_start', 'stock_days_remaining'
    ]
    
    # Clean: convert to numeric, drop rows with non-numeric values
    for col in feature_cols + ['missed']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna(subset=feature_cols + ['missed'])
    print(f"  📊 After cleaning: {len(df)} valid records")
    
    X = df[feature_cols].values
    y = df['missed'].values.astype(int)
    
    # Train GradientBoosting
    gb_model = GradientBoostingClassifier(
        n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42
    )
    gb_model.fit(X, y)
    
    os.makedirs(str(MODELS_DIR), exist_ok=True)
    joblib.dump(gb_model, str(MODELS_DIR / "adherence_model.pkl"))
    print("  ✅ GradientBoosting adherence model saved")
    
    # Train RandomForest
    rf_model = RandomForestClassifier(n_estimators=50, random_state=42)
    rf_model.fit(X, y)
    joblib.dump(rf_model, str(MODELS_DIR / "risk_model.pkl"))
    print("  ✅ RandomForest risk model saved")


def save_training_metadata():
    """Save metadata about the training run."""
    meta = {
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "models_trained": [
            "spell_corrector.pkl",
            "medicine_vocab.pkl",
            "adherence_model.pkl",
            "risk_model.pkl",
        ],
        "vocabulary_sources": {
            name: str(path) for name, path in VOCAB_FILES.items()
        },
        "pipeline_version": "2.0.0",
        "notes": "Trained with Medical-Prescription-OCR vocabulary + PaddleOCR backend"
    }
    
    meta_path = str(MODELS_DIR / "training_meta.json")
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\n  📋 Training metadata saved to {meta_path}")


# ─── Main ────────────────────────────────────────────────────────

def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║     MediSathi — Medical OCR Model Training          ║")
    print("║     Training Pipeline v2.0                          ║")
    print("╚══════════════════════════════════════════════════════╝")
    
    start_total = time.time()
    
    # Ensure output directories exist
    os.makedirs(str(MODELS_DIR), exist_ok=True)
    os.makedirs(str(SAVED_MODELS_DIR), exist_ok=True)
    
    # Check for vocabulary files
    print("\n📁 Checking data files...")
    for name, path in VOCAB_FILES.items():
        exists = "✅" if path.exists() else "❌"
        size = f"({path.stat().st_size / 1024:.0f} KB)" if path.exists() else "(missing)"
        print(f"  {exists} {name}: {path.name} {size}")
    
    # Train all models
    spell_corrector = train_spell_corrector()
    medicine_extractor = train_medicine_extractor()
    train_adherence_models()
    save_training_metadata()
    
    elapsed_total = time.time() - start_total
    
    print("\n" + "="*60)
    print(f"🎉 ALL MODELS TRAINED SUCCESSFULLY in {elapsed_total:.2f}s")
    print("="*60)
    print(f"\n  📂 Models saved to: {MODELS_DIR}")
    print(f"  📂 Files:")
    for f in sorted(MODELS_DIR.glob("*")):
        if f.is_file():
            size_kb = f.stat().st_size / 1024
            print(f"     • {f.name} ({size_kb:.0f} KB)")
    
    print(f"\n  🚀 Run the API with: python main.py")
    print(f"  🔗 API will be available at: http://localhost:8000")
    print(f"  📖 Docs at: http://localhost:8000/docs\n")


if __name__ == "__main__":
    main()
