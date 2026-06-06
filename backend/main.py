"""
Discovery LifeOS — FastAPI Backend  (Step 5 — with streaming + counterfactual toggle)
"""

import json, os
from pathlib import Path
from typing  import Optional, AsyncGenerator

import numpy  as np
import pandas as pd
from dotenv    import load_dotenv
from fastapi   import FastAPI, HTTPException
from fastapi.middleware.cors      import CORSMiddleware
from fastapi.responses            import StreamingResponse
from pydantic  import BaseModel

from model_inference import predict_risk, FEATURE_NAMES, MODEL_METRICS
from ai_service  import (
    explain_risk, recommend_interventions,
    generate_counterfactual, stream_explanation,
)

load_dotenv()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Discovery LifeOS API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "ml" / "data"

def load_data():
    return {
        "users":         pd.read_csv(DATA_DIR / "users.csv"),
        "risk":          pd.read_csv(DATA_DIR / "daily_risk_scores.csv",  parse_dates=["date"]),
        "wellness":      pd.read_csv(DATA_DIR / "wellness_signals.csv",   parse_dates=["date"]),
        "nutrition":     pd.read_csv(DATA_DIR / "nutrition_signals.csv",  parse_dates=["date"]),
        "mobility":      pd.read_csv(DATA_DIR / "mobility_signals.csv",   parse_dates=["date"]),
        "combined":      pd.read_csv(DATA_DIR / "combined_signals.csv",   parse_dates=["date"]),
        "interventions": pd.read_csv(DATA_DIR / "interventions.csv",      parse_dates=["date"]),
    }

DATA = load_data()

def get_user_or_404(uid: str) -> pd.Series:
    row = DATA["users"][DATA["users"]["user_id"] == uid]
    if row.empty:
        raise HTTPException(404, f"User {uid} not found")
    return row.iloc[0]

def safe(v):
    if isinstance(v, (np.integer,)):   return int(v)
    if isinstance(v, (np.floating,)):  return float(v)
    if isinstance(v, (np.bool_,)):     return bool(v)
    if pd.isna(v):                     return None
    return v

def build_features(uid: str) -> dict:
    """Build a full feature vector for the latest day of a given user."""
    comb     = DATA["combined"][DATA["combined"]["user_id"] == uid]
    if comb.empty:
        raise HTTPException(404, f"No data for {uid}")
    comb     = comb.sort_values("date")
    latest   = comb.iloc[-1]
    recent7  = comb.tail(7)
    recent3  = comb.tail(3)

    features = {}
    for col in FEATURE_NAMES:
        if "_7d_mean" in col:
            base = col.replace("_7d_mean", "")
            features[col] = float(recent7[base].mean()) if base in recent7 else 0.0
        elif "_7d_delta" in col:
            base = col.replace("_7d_delta", "")
            features[col] = float(recent7[base].iloc[-1] - recent7[base].mean()) if base in recent7 else 0.0
        elif "_3d_mean" in col:
            base = col.replace("_3d_mean", "")
            features[col] = float(recent3[base].mean()) if base in recent3 else 0.0
        elif col in latest.index:
            v = latest[col]
            features[col] = float(v) if isinstance(v, (int, float, np.number)) else 0.0
        else:
            features[col] = 0.0

    # Cross-domain interaction features
    features["sleep_activity_stress"]        = (1 - features.get("sleep_hours", 7) / 10) * (1 - features.get("workout_today", 1))
    features["disengagement_nutrition_risk"] = (1 - features.get("app_engagement_score", 75) / 100) * (1 - features.get("healthy_food_pct", 0.7))
    features["fatigue_driving_risk"]         = features.get("fatigue_risk", 0) / 100 * features.get("late_night_trip", 0)
    features["streak_breaks_7d"]             = float(recent7["streak_broken"].sum()) if "streak_broken" in recent7 else 0.0
    features["day_of_week"]                  = float(pd.to_datetime(latest["date"]).dayofweek)
    features["is_monday"]                    = float(features["day_of_week"] == 0)
    features["is_friday"]                    = float(features["day_of_week"] == 4)

    return features

def user_snapshot(uid: str) -> dict:
    comb    = DATA["combined"][DATA["combined"]["user_id"] == uid].sort_values("date")
    recent7 = comb.tail(7)
    return {
        "avg_steps_7d":          round(float(recent7["steps"].mean()), 0)            if "steps"             in recent7 else None,
        "avg_sleep_7d":          round(float(recent7["sleep_hours"].mean()), 1)      if "sleep_hours"       in recent7 else None,
        "avg_app_engagement_7d": round(float(recent7["app_engagement_score"].mean()),1) if "app_engagement_score" in recent7 else None,
        "avg_healthy_food_7d":   round(float(recent7["healthy_food_pct"].mean()), 2) if "healthy_food_pct"  in recent7 else None,
        "avg_drive_score_7d":    round(float(recent7["drive_score"].mean()), 1)      if "drive_score"       in recent7 else None,
    }

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    has_key = bool(os.getenv("ANTHROPIC_API_KEY", ""))
    return {
        "status":      "ok",
        "service":     "Discovery LifeOS API",
        "version":     "1.0.0",
        "gemini":      "connected" if has_key else "fallback mode (no API key)",
        "model_metrics": MODEL_METRICS,
    }


@app.get("/api/users")
def list_users():
    out = []
    for _, u in DATA["users"].iterrows():
        uid       = u["user_id"]
        user_risk = DATA["risk"][DATA["risk"]["user_id"] == uid]
        latest    = user_risk.sort_values("date").iloc[-1] if not user_risk.empty else None
        score     = safe(latest["risk_score"]) if latest is not None else None
        out.append({
            "user_id":         uid,
            "name":            u["name"],
            "persona":         u["persona"],
            "age":             safe(u["age"]),
            "vitality_status": u["vitality_status"],
            "city":            u["city"],
            "latest_risk":     score,
            "risk_band":       ("low" if score and score < 30 else "moderate" if score and score < 55 else "high"),
            "phase":           safe(latest["phase"]) if latest is not None else None,
        })
    return {"users": out}


@app.get("/api/users/{uid}")
def get_user(uid: str):
    get_user_or_404(uid)
    features   = build_features(uid)
    prediction = predict_risk(features)
    snapshot   = user_snapshot(uid)
    user       = DATA["users"][DATA["users"]["user_id"] == uid].iloc[0]
    return {
        "user":            {k: safe(v) for k, v in user.items()},
        "prediction":      prediction,
        "signal_snapshot": snapshot,
    }


@app.get("/api/users/{uid}/timeline")
def get_timeline(uid: str):
    get_user_or_404(uid)
    risk      = DATA["risk"][DATA["risk"]["user_id"] == uid].sort_values("date")
    wellness  = DATA["wellness"][DATA["wellness"]["user_id"] == uid].sort_values("date")
    nutrition = DATA["nutrition"][DATA["nutrition"]["user_id"] == uid].sort_values("date")
    mobility  = DATA["mobility"][DATA["mobility"]["user_id"] == uid].sort_values("date")
    ivs       = DATA["interventions"][DATA["interventions"]["user_id"] == uid]

    timeline = []
    for _, row in risk.iterrows():
        d      = str(row["date"].date())
        didx   = int(row["day_index"])
        w      = wellness[wellness["day_index"]  == didx]
        n      = nutrition[nutrition["day_index"] == didx]
        m      = mobility[mobility["day_index"]   == didx]
        iv     = ivs[ivs["day_index"]             == didx]

        timeline.append({
            "date": d, "day_index": didx, "week": int(row["week"]), "phase": str(row["phase"]),
            # risk
            "risk_score":       safe(row["risk_score"]),
            "wellness_risk":    safe(row["wellness_risk"]),
            "nutrition_risk":   safe(row["nutrition_risk"]),
            "mobility_risk":    safe(row["mobility_risk"]),
            "load_shedding":    bool(row["load_shedding"]),
            # wellness
            "steps":            safe(w["steps"].iloc[0])                if not w.empty else None,
            "sleep_hours":      safe(w["sleep_hours"].iloc[0])          if not w.empty else None,
            "workout_today":    safe(w["workout_today"].iloc[0])        if not w.empty else None,
            "app_engagement":   safe(w["app_engagement_score"].iloc[0]) if not w.empty else None,
            "vitality_points":  safe(w["vitality_points"].iloc[0])      if not w.empty else None,
            # nutrition
            "healthy_food_pct": safe(n["healthy_food_pct"].iloc[0])     if not n.empty else None,
            "meal_prep_score":  safe(n["meal_prep_score"].iloc[0])      if not n.empty else None,
            "sugar_index":      safe(n["sugar_index"].iloc[0])          if not n.empty else None,
            # mobility
            "drive_score":      safe(m["drive_score"].iloc[0])          if not m.empty else None,
            "fatigue_risk":     safe(m["fatigue_risk"].iloc[0])         if not m.empty else None,
            "late_night_trip":  safe(m["late_night_trip"].iloc[0])      if not m.empty else None,
            # interventions
            "interventions":    iv[["intervention_type","domain","effectiveness"]].to_dict("records") if not iv.empty else [],
        })

    return {
        "user_id":  uid,
        "timeline": timeline,
        "phases":   {"baseline": {"start":0,"end":41}, "decline": {"start":42,"end":70}, "recovery": {"start":71,"end":83}},
    }


@app.get("/api/users/{uid}/explain")
async def explain(uid: str):
    """Standard (non-streaming) explanation from Gemini."""
    user_data  = get_user(uid)
    user       = DATA["users"][DATA["users"]["user_id"] == uid].iloc[0]
    pred       = user_data["prediction"]
    snap       = user_data["signal_snapshot"]

    text = await explain_risk(
        user_name        = user["name"].split()[0],
        risk_score       = pred["risk_score"],
        risk_band        = pred["risk_band"],
        top_drivers      = pred["top_risk_drivers"],
        domain_breakdown = pred["domain_breakdown"],
        signal_snapshot  = snap,
    )
    return {"user_id": uid, "risk_score": pred["risk_score"], "risk_band": pred["risk_band"], "explanation": text}


@app.get("/api/users/{uid}/explain/stream")
async def explain_stream(uid: str):
    """
    Streaming explanation — text arrives token by token.
    The frontend renders this as a live typing effect.
    """
    user_data = get_user(uid)
    user      = DATA["users"][DATA["users"]["user_id"] == uid].iloc[0]
    pred      = user_data["prediction"]
    snap      = user_data["signal_snapshot"]

    async def event_generator() -> AsyncGenerator[str, None]:
        for chunk in stream_explanation(
            user_name        = user["name"].split()[0],
            risk_score       = pred["risk_score"],
            risk_band        = pred["risk_band"],
            top_drivers      = pred["top_risk_drivers"],
            domain_breakdown = pred["domain_breakdown"],
            signal_snapshot  = snap,
        ):
            # Server-Sent Events format
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/users/{uid}/interventions")
async def interventions(uid: str, load_shedding: bool = False):
    user_data = get_user(uid)
    user      = DATA["users"][DATA["users"]["user_id"] == uid].iloc[0]
    pred      = user_data["prediction"]

    ivs = await recommend_interventions(
        user_name        = user["name"].split()[0],
        risk_score       = pred["risk_score"],
        domain_breakdown = pred["domain_breakdown"],
        top_drivers      = pred["top_risk_drivers"],
        persona          = user["persona"],
        load_shedding    = load_shedding,
    )
    return {"user_id": uid, "risk_score": pred["risk_score"], "interventions": ivs}


@app.get("/api/users/{uid}/counterfactual")
async def counterfactual(uid: str):
    """
    The killer demo endpoint — 'what would have happened without intervention'.
    Returns both WITHOUT and WITH intervention narratives + probability estimates.
    """
    user_data       = get_user(uid)
    user            = DATA["users"][DATA["users"]["user_id"] == uid].iloc[0]
    pred            = user_data["prediction"]
    user_risk       = DATA["risk"][DATA["risk"]["user_id"] == uid]
    days_in_decline = int((user_risk["phase"] == "decline").sum())

    cf = await generate_counterfactual(
        user_name        = user["name"].split()[0],
        risk_score       = pred["risk_score"],
        days_in_decline  = days_in_decline,
    )
    return {"user_id": uid, "risk_score": pred["risk_score"], "days_in_decline": days_in_decline, "counterfactual": cf}


@app.get("/api/dashboard/summary")
def dashboard_summary():
    risk = DATA["risk"]
    ivs  = DATA["interventions"]

    phase_risk   = risk.groupby("phase")["risk_score"].mean().to_dict()
    baseline_avg = float(risk[risk["phase"] == "baseline"]["risk_score"].mean())
    peak_avg     = float(risk[risk["phase"] == "decline"]["risk_score"].max())
    recovery_avg = float(risk[risk["phase"] == "recovery"]["risk_score"].mean())

    return {
        "platform": {
            "total_users":          len(DATA["users"]),
            "interventions_fired":  len(ivs),
            "avg_effectiveness":    round(float(ivs["effectiveness"].mean()) * 100, 1) if not ivs.empty else 0,
            "users_responded":      int(ivs["user_responded"].sum()) if not ivs.empty else 0,
            "high_risk_today":      int((risk[risk["phase"] == "recovery"]["risk_score"] >= 55).sum()),
            "gemini_enabled":       bool(os.getenv("GEMINI_API_KEY", "")),
        },
        "risk_arc": {
            "baseline_avg":  round(baseline_avg, 1),
            "peak_avg":      round(peak_avg, 1),
            "recovery_avg":  round(recovery_avg, 1),
            "phase_risk":    {k: round(v, 1) for k, v in phase_risk.items()},
        },
        "model_performance": {
            "risk_mae":    MODEL_METRICS["risk_regressor"]["test_mae"],
            "risk_r2":     MODEL_METRICS["risk_regressor"]["test_r2"],
            "warning_auc": MODEL_METRICS["early_warning_classifier"]["auc_roc"],
            "warning_f1":  MODEL_METRICS["early_warning_classifier"]["f1"],
        },
        "top_features": MODEL_METRICS["top_predictive_features"][:5],
    }


class PredictRequest(BaseModel):
    features: dict
    user_id: Optional[str] = None

@app.post("/api/predict")
def predict(req: PredictRequest):
    return {"user_id": req.user_id, "prediction": predict_risk(req.features)}


# ── Counterfactual chart data endpoint ────────────────────────────────────────
@app.get("/api/users/{uid}/counterfactual-chart")
def counterfactual_chart(uid: str):
    """
    Returns the data needed to render the counterfactual comparison chart:
      - full actual risk trajectory (84 days)
      - counterfactual projection (days 71-83, extrapolated decline trend)
      - intervention point marker
      - gap statistics (the 'value of intervention')
    """
    get_user_or_404(uid)
    import numpy as np

    risk = DATA["risk"][DATA["risk"]["user_id"] == uid].sort_values("day_index")

    # Fit linear trend to decline phase
    decline = risk[(risk["day_index"] >= 42) & (risk["day_index"] <= 70)]
    x = decline["day_index"].values
    y = decline["risk_score"].values
    slope, intercept = np.polyfit(x, y, 1)

    # Build full timeline with both actual + projected
    timeline = []
    for _, row in risk.iterrows():
        d   = int(row["day_index"])
        act = float(row["risk_score"])

        # Counterfactual projection only shown from intervention day onward
        proj = None
        if d >= 71:
            proj = round(float(np.clip(slope * d + intercept, 0, 100)), 1)

        timeline.append({
            "day_index":         d,
            "week":              int(row["week"]),
            "phase":             str(row["phase"]),
            "actual_risk":       round(act, 1),
            "projected_risk":    proj,          # null before day 71
            # For the shaded "gap" area — both needed
            "gap_actual":        round(act, 1)  if d >= 71 else None,
            "gap_projected":     proj            if d >= 71 else None,
            "load_shedding":     bool(row["load_shedding"]),
            "intervention_day":  d == 71,
        })

    # Gap stats for the callout cards
    recovery_days = [t for t in timeline if t["day_index"] >= 71 and t["projected_risk"] is not None]
    gaps          = [t["gap_projected"] - t["gap_actual"] for t in recovery_days if t["gap_actual"] is not None]
    avg_gap       = round(float(np.mean(gaps)), 1) if gaps else 0
    max_gap       = round(float(np.max(gaps)),  1) if gaps else 0
    peak_proj     = round(float(np.clip(slope * 90 + intercept, 0, 100)), 1)

    return {
        "user_id":   uid,
        "timeline":  timeline,
        "stats": {
            "decline_slope":     round(float(slope), 3),
            "peak_projected":    peak_proj,
            "avg_risk_gap":      avg_gap,
            "max_risk_gap":      max_gap,
            "intervention_day":  71,
            "summary":           f"Without intervention, risk was projected to reach {peak_proj}/100. "
                                 f"Intervention reduced average risk by {avg_gap} points over the recovery period.",
        },
    }


@app.get("/api/dashboard/counterfactual-overview")
def counterfactual_overview():
    """
    Platform-level counterfactual data — all users combined.
    Powers the dashboard overview chart showing collective impact.
    """
    import numpy as np

    risk   = DATA["risk"]
    users  = DATA["users"]
    result = []

    for uid in users["user_id"]:
        udf     = risk[risk["user_id"] == uid].sort_values("day_index")
        decline = udf[(udf["day_index"] >= 42) & (udf["day_index"] <= 70)]
        if len(decline) < 3:
            continue
        x = decline["day_index"].values
        y = decline["risk_score"].values
        slope, intercept = np.polyfit(x, y, 1)

        for _, row in udf.iterrows():
            d   = int(row["day_index"])
            act = float(row["risk_score"])
            proj = float(np.clip(slope * d + intercept, 0, 100)) if d >= 71 else None
            result.append({
                "user_id":        uid,
                "day_index":      d,
                "actual_risk":    round(act, 1),
                "projected_risk": round(proj, 1) if proj is not None else None,
            })

    # Average across all users per day
    df  = pd.DataFrame(result)
    agg = df.groupby("day_index").agg(
        avg_actual    = ("actual_risk",    "mean"),
        avg_projected = ("projected_risk", "mean"),
    ).reset_index()

    timeline = []
    for _, row in agg.iterrows():
        d = int(row["day_index"])
        timeline.append({
            "day_index":         d,
            "avg_actual_risk":   round(float(row["avg_actual"]), 1),
            "avg_projected_risk": round(float(row["avg_projected"]), 1) if not pd.isna(row["avg_projected"]) else None,
        })

    total_gap = round(float(
        df[df["day_index"] >= 71]["projected_risk"].mean() -
        df[df["day_index"] >= 71]["actual_risk"].mean()
    ), 1)

    return {
        "timeline":       timeline,
        "platform_stats": {
            "avg_risk_gap_all_users": total_gap,
            "users_count":            len(users),
            "intervention_day":       71,
        },
    }