import pandas as pd
import joblib
import os
from sklearn.ensemble import GradientBoostingClassifier

def train():
    print("Starting model training with 5000 records...")
    
    data_path = "data/training_data.csv"
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} records.")

    feature_cols = [
        'age', 'missed_doses_last_7d', 'frequency', 'has_chronic_condition', 
        'adherence_streak', 'hour_of_day', 'is_weekend', 'num_medications', 
        'days_since_start', 'stock_days_remaining'
    ]
    
    X = df[feature_cols].values
    y = df["missed"].values

    print(f"Training GradientBoostingClassifier on {len(feature_cols)} features...")
    model = GradientBoostingClassifier(
        n_estimators=100, 
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    model.fit(X, y)

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/adherence_model.pkl")
    print("Model saved to models/adherence_model.pkl")
    
    # Also train a simple risk model (RandomForest) for variety if needed by main.py
    print("Training risk_model (RandomForest)...")
    from sklearn.ensemble import RandomForestClassifier
    risk_model = RandomForestClassifier(n_estimators=50, random_state=42)
    risk_model.fit(X, y)
    joblib.dump(risk_model, "models/risk_model.pkl")
    print("Risk model saved to models/risk_model.pkl")
    print("Training complete!")

if __name__ == "__main__":
    train()
