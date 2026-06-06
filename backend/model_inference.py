"""
Discovery LifeOS — Model Inference Module
==========================================
Loads trained XGBoost models and runs predictions.
Compatible with models saved via get_booster().save_model()
"""

import json
import numpy as np
import pandas as pd
import xgboost as xgb
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "ml" / "data"

# ── Load once at startup ──────────────────────────────────────
_regressor  = xgb.Booster()
_classifier = xgb.Booster()
_regressor.load_model(str(MODEL_DIR / "model_risk_regressor.json"))
_classifier.load_model(str(MODEL_DIR / "model_early_warning.json"))

with open(MODEL_DIR / "model_feature_names.json") as f:
    FEATURE_NAMES: list = json.load(f)["features"]

with open(MODEL_DIR / "model_evaluation.json") as f:
    MODEL_METRICS: dict = json.load(f)


def predict_risk(features: dict) -> dict:
    X       = pd.DataFrame([features]).reindex(columns=FEATURE_NAMES, fill_value=0)
    dmatrix = xgb.DMatrix(X)

    risk_score = float(np.clip(_regressor.predict(dmatrix)[0], 0, 100))
    warn_prob  = float(np.clip(_classifier.predict(dmatrix)[0], 0, 1))
    early_warning = warn_prob >= 0.45

    try:
        importance  = _regressor.get_score(importance_type="gain")
        top_drivers = sorted(importance, key=importance.get, reverse=True)[:3]
    except Exception:
        top_drivers = FEATURE_NAMES[:3]

    return {
        "risk_score":       round(risk_score, 1),
        "risk_band":        (
            "low"      if risk_score < 30 else
            "moderate" if risk_score < 55 else
            "high"
        ),
        "early_warning":    bool(early_warning),
        "warning_prob":     round(warn_prob, 3),
        "top_risk_drivers": top_drivers,
        "domain_breakdown": {
            "wellness":  round(risk_score * 0.45, 1),
            "nutrition": round(risk_score * 0.30, 1),
            "mobility":  round(risk_score * 0.25, 1),
        },
    }