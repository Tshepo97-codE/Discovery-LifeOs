"""
Discovery LifeOS — Behavioural Risk Scoring Model
==================================================
Trains a gradient boosting model that predicts a user's composite
behavioural risk score (0–100) from their daily signal features.

Key design decisions:
  - XGBoost regressor: fast, interpretable, production-grade
  - 7-day rolling features: the model sees *trends*, not just today's value
    (this is what lets it detect early decline before the user notices)
  - SHAP values: every prediction is explainable — "why is this score high?"
  - Early warning detector: separate binary classifier for "will this user
    enter high-risk zone within 7 days?" — this powers the intervention trigger

Output files (ml/data/):
  model_risk_regressor.json     — trained XGBoost risk score model
  model_early_warning.json      — trained early warning classifier
  model_feature_names.json      — feature list (must match FastAPI input)
  model_evaluation.json         — accuracy metrics for pitch deck
  model_shap_chart.png          — SHAP feature importance (for demo)
  model_predictions_chart.png   — predicted vs actual risk scores
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (mean_absolute_error, r2_score,
                             classification_report, roc_auc_score)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import shap

os.makedirs("data", exist_ok=True)
SEED = 42
np.random.seed(SEED)


# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD & MERGE DATA
# ─────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("  Discovery LifeOS — Risk Model Training")
print("=" * 60)

combined = pd.read_csv("data/combined_signals.csv", parse_dates=["date"])
risk_df  = pd.read_csv("data/daily_risk_scores.csv",  parse_dates=["date"])

print(f"\n✓ Loaded {len(combined)} rows, {len(combined.columns)} features")
print(f"  Users: {combined['user_id'].nunique()}")
print(f"  Date range: {combined['date'].min().date()} → {combined['date'].max().date()}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. FEATURE ENGINEERING
#    The core innovation: rolling window features that capture *trends*.
#    A single day's data can't predict decline — a 7-day trend can.
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add rolling window features for each user.
    These transform point-in-time signals into trajectory signals —
    which is what enables early detection of behavioural decline.
    """
    df = df.sort_values(["user_id", "date"]).copy()
    results = []

    for uid, user_df in df.groupby("user_id"):
        user_df = user_df.copy().reset_index(drop=True)

        # ── 7-day rolling means (trend) ──────────────────────────────────────
        rolling_cols = [
            "steps", "sleep_hours", "sleep_consistency", "resting_hr",
            "workout_today", "app_engagement_score", "vitality_points",
            "healthy_food_pct", "meal_prep_score", "sugar_index",
            "drive_score", "fatigue_risk", "hard_braking",
        ]
        for col in rolling_cols:
            if col in user_df.columns:
                user_df[f"{col}_7d_mean"] = (
                    user_df[col].rolling(7, min_periods=1).mean()
                )
                # Rate of change: how fast is this signal moving?
                user_df[f"{col}_7d_delta"] = (
                    user_df[col] - user_df[f"{col}_7d_mean"]
                )

        # ── 3-day rolling means (very recent trend) ──────────────────────────
        for col in ["steps", "sleep_hours", "app_engagement_score", "drive_score"]:
            if col in user_df.columns:
                user_df[f"{col}_3d_mean"] = (
                    user_df[col].rolling(3, min_periods=1).mean()
                )

        # ── Streak features ───────────────────────────────────────────────────
        # Cumulative streak breaks in last 7 days — strong disengagement signal
        user_df["streak_breaks_7d"] = (
            user_df["streak_broken"].rolling(7, min_periods=1).sum()
        )

        # ── Cross-domain interaction features ─────────────────────────────────
        # This is the key innovation: signals that no single-domain model has
        # Sleep × activity: sleep-deprived AND not exercising = high risk
        user_df["sleep_activity_stress"] = (
            (1 - user_df["sleep_hours"] / 10.0) *
            (1 - user_df["workout_today"])
        )
        # App disengagement × nutrition decline: pre-churn signal
        user_df["disengagement_nutrition_risk"] = (
            (1 - user_df["app_engagement_score"] / 100.0) *
            (1 - user_df["healthy_food_pct"])
        )
        # Fatigue driving risk: tired people driving late = compounded risk
        user_df["fatigue_driving_risk"] = (
            user_df["fatigue_risk"] / 100.0 * user_df["late_night_trip"]
        )

        # ── Contextual features ───────────────────────────────────────────────
        user_df["day_of_week"]  = pd.to_datetime(user_df["date"]).dt.dayofweek
        user_df["is_monday"]    = (user_df["day_of_week"] == 0).astype(int)
        user_df["is_friday"]    = (user_df["day_of_week"] == 4).astype(int)

        results.append(user_df)

    return pd.concat(results, ignore_index=True)


print("\n  Engineering features...")
featured = engineer_features(combined)
featured = featured.merge(
    risk_df[["user_id", "date", "phase"]],
    on=["user_id", "date"], how="left"
)
print(f"  Feature matrix shape: {featured.shape}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. PREPARE TRAINING DATA
# ─────────────────────────────────────────────────────────────────────────────

# Drop non-feature columns
DROP_COLS = [
    "user_id", "date", "weekday", "phase_x", "phase_y", "phase",
    "risk_score", "wellness_risk", "nutrition_risk", "mobility_risk",
]
feature_cols = [c for c in featured.columns
                if c not in DROP_COLS
                and featured[c].dtype != object]

# Fill any NaNs from rolling windows (first few days per user)
X = featured[feature_cols].ffill().fillna(0)
y_risk = featured["risk_score"].fillna(0)

# Early warning target: will risk score exceed 45 within next 7 days?
# We create this by looking ahead — a rolling future max
featured_sorted = featured.sort_values(["user_id", "date"])
future_risk = (
    featured_sorted.groupby("user_id")["risk_score"]
    .transform(lambda s: s.rolling(7, min_periods=1).max().shift(-7))
    .fillna(featured_sorted["risk_score"])
)
y_warn = (future_risk >= 45).astype(int)

print(f"\n  Training features  : {len(feature_cols)}")
print(f"  Risk score target  : mean={y_risk.mean():.1f}, max={y_risk.max():.0f}")
print(f"  Early warning rate : {y_warn.mean():.1%} of days flagged")

# Train / test split — split by user to avoid data leakage
# Users 1-4 train, User 5 tests (simulates unseen user)
train_mask = featured["user_id"] != "USR_005"
test_mask  = featured["user_id"] == "USR_005"

X_train, X_test   = X[train_mask], X[test_mask]
y_train, y_test   = y_risk[train_mask], y_risk[test_mask]
yw_train, yw_test = y_warn[train_mask], y_warn[test_mask]

print(f"\n  Train set: {len(X_train)} rows (USR_001–004)")
print(f"  Test set : {len(X_test)} rows  (USR_005 — unseen user)")

# Save feature names for FastAPI
with open("data/model_feature_names.json", "w") as f:
    json.dump({"features": feature_cols}, f, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# 4. TRAIN RISK SCORE REGRESSOR
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("  Training risk score regressor (XGBoost)...")
print("=" * 60)

regressor = xgb.XGBRegressor(
    n_estimators    = 300,
    max_depth       = 4,
    learning_rate   = 0.05,
    subsample       = 0.8,
    colsample_bytree= 0.8,
    reg_alpha       = 0.1,    # L1 regularisation — keeps model sparse
    reg_lambda      = 1.0,    # L2 regularisation
    random_state    = SEED,
    verbosity       = 0,
)
regressor.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)

# Evaluate
y_pred      = regressor.predict(X_test).clip(0, 100)
mae         = mean_absolute_error(y_test, y_pred)
r2          = r2_score(y_test, y_pred)
# Cross-val on training set
cv_scores   = cross_val_score(regressor, X_train, y_train,
                               cv=3, scoring="neg_mean_absolute_error")

print(f"\n  Test MAE  : {mae:.2f} points  (avg error on 0–100 scale)")
print(f"  Test R²   : {r2:.3f}          (1.0 = perfect)")
print(f"  CV MAE    : {-cv_scores.mean():.2f} ± {cv_scores.std():.2f}")

regressor.get_booster().save_model("data/model_risk_regressor.json")
print("  ✓ Saved model_risk_regressor.json")


# ─────────────────────────────────────────────────────────────────────────────
# 5. TRAIN EARLY WARNING CLASSIFIER
#    "Will this user enter high-risk zone in the next 7 days?"
#    This powers the proactive intervention trigger.
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("  Training early warning classifier (XGBoost)...")
print("=" * 60)

classifier = xgb.XGBClassifier(
    n_estimators     = 200,
    max_depth        = 3,
    learning_rate    = 0.05,
    subsample        = 0.8,
    colsample_bytree = 0.8,
    scale_pos_weight = (yw_train == 0).sum() / max((yw_train == 1).sum(), 1),
    random_state     = SEED,
    verbosity        = 0,
    eval_metric      = "logloss",
)
classifier.fit(
    X_train, yw_train,
    eval_set=[(X_test, yw_test)],
    verbose=False,
)

yw_pred_prob = classifier.predict_proba(X_test)[:, 1]
yw_pred      = (yw_pred_prob >= 0.45).astype(int)

try:
    auc = roc_auc_score(yw_test, yw_pred_prob)
except Exception:
    auc = 0.0

report = classification_report(yw_test, yw_pred, output_dict=True)
print(f"\n  AUC-ROC   : {auc:.3f}  (0.5 = random, 1.0 = perfect)")
print(f"  Precision : {report.get('1', {}).get('precision', 0):.3f}")
print(f"  Recall    : {report.get('1', {}).get('recall', 0):.3f}")
print(f"  F1        : {report.get('1', {}).get('f1-score', 0):.3f}")

classifier.get_booster().save_model("data/model_early_warning.json")
print("  ✓ Saved model_early_warning.json")


# ─────────────────────────────────────────────────────────────────────────────
# 6. SHAP EXPLAINABILITY
#    Every prediction comes with a human-readable explanation.
#    This is what powers "why did we trigger this intervention?"
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("  Computing SHAP explainability values...")
print("=" * 60)

explainer   = shap.TreeExplainer(regressor)
shap_values = explainer.shap_values(X_test)

# Top 15 most impactful features
shap_importance = pd.DataFrame({
    "feature":    feature_cols,
    "importance": np.abs(shap_values).mean(axis=0)
}).sort_values("importance", ascending=False).head(15)

print("\n  Top 10 most predictive features:")
for _, row in shap_importance.head(10).iterrows():
    bar = "█" * int(row["importance"] * 3)
    print(f"    {row['feature']:<45} {row['importance']:.3f}  {bar}")


# ─────────────────────────────────────────────────────────────────────────────
# 7. SAVE EVALUATION METRICS (for pitch deck)
# ─────────────────────────────────────────────────────────────────────────────

evaluation = {
    "risk_regressor": {
        "test_mae":        round(float(mae), 2),
        "test_r2":         round(float(r2), 3),
        "cv_mae_mean":     round(float(-cv_scores.mean()), 2),
        "cv_mae_std":      round(float(cv_scores.std()), 2),
        "n_features":      len(feature_cols),
        "train_rows":      len(X_train),
        "test_rows":       len(X_test),
    },
    "early_warning_classifier": {
        "auc_roc":         round(float(auc), 3),
        "precision":       round(float(report.get("1", {}).get("precision", 0)), 3),
        "recall":          round(float(report.get("1", {}).get("recall", 0)), 3),
        "f1":              round(float(report.get("1", {}).get("f1-score", 0)), 3),
    },
    "top_predictive_features": shap_importance["feature"].tolist(),
}

with open("data/model_evaluation.json", "w") as f:
    json.dump(evaluation, f, indent=2)
print("\n  ✓ Saved model_evaluation.json")


# ─────────────────────────────────────────────────────────────────────────────
# 8. VISUALISATIONS
# ─────────────────────────────────────────────────────────────────────────────

print("\n  Generating charts...")
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("Discovery LifeOS — Risk Model Evaluation", fontsize=14, fontweight="bold")

TEAL   = "#1D9E75"
CORAL  = "#D85A30"
PURPLE = "#7F77DD"
AMBER  = "#BA7517"

# Panel 1: Predicted vs actual risk score
ax = axes[0, 0]
test_days = featured[test_mask]["day_index"].values
ax.plot(test_days, y_test.values,  color=TEAL,  linewidth=2,   label="Actual risk score",    alpha=0.9)
ax.plot(test_days, y_pred,         color=CORAL, linewidth=2,   label="Predicted risk score", linestyle="--", alpha=0.9)
ax.axvspan(42, 70, alpha=0.08, color="red")
ax.axvspan(71, 84, alpha=0.08, color="green")
ax.axvline(42, color="red",   linewidth=1, linestyle=":", alpha=0.6)
ax.axvline(71, color="green", linewidth=1, linestyle=":", alpha=0.6)
ax.fill_between(test_days,
                (y_pred - mae).clip(0), (y_pred + mae).clip(0, 100),
                alpha=0.15, color=CORAL, label=f"±MAE ({mae:.1f}pts)")
ax.set_title(f"Predicted vs Actual Risk Score (MAE = {mae:.1f}, R² = {r2:.3f})")
ax.set_xlabel("Day index")
ax.set_ylabel("Risk score (0–100)")
ax.legend(fontsize=8)
ax.grid(axis="y", alpha=0.3)
ax.set_ylim(0, 80)

# Panel 2: SHAP feature importance (top 12)
ax2 = axes[0, 1]
top12 = shap_importance.head(12).iloc[::-1]
colors_bar = [TEAL if "7d" in f or "3d" in f or "stress" in f or "risk" in f
              else PURPLE for f in top12["feature"]]
bars = ax2.barh(range(len(top12)), top12["importance"], color=colors_bar, alpha=0.85)
ax2.set_yticks(range(len(top12)))
ax2.set_yticklabels(
    [f.replace("_7d_mean","(7d avg)").replace("_7d_delta","(7d Δ)")
      .replace("_3d_mean","(3d avg)") for f in top12["feature"]],
    fontsize=8
)
ax2.set_title("Feature importance (SHAP values)\nTeal = trend features, Purple = raw signals")
ax2.set_xlabel("Mean |SHAP value|")
ax2.grid(axis="x", alpha=0.3)
legend_patches = [
    mpatches.Patch(color=TEAL,   label="Trend / rolling features"),
    mpatches.Patch(color=PURPLE, label="Point-in-time features"),
]
ax2.legend(handles=legend_patches, fontsize=8)

# Panel 3: Early warning probability over time (USR_005)
ax3 = axes[1, 0]
warn_prob = yw_pred_prob
ax3.fill_between(test_days, warn_prob, alpha=0.3, color=AMBER)
ax3.plot(test_days, warn_prob, color=AMBER, linewidth=1.8, label="7-day risk probability")
ax3.axhline(0.45, color=CORAL, linewidth=1.5, linestyle="--", label="Intervention threshold (0.45)")
ax3.axvspan(42, 70, alpha=0.08, color="red")
ax3.axvspan(71, 84, alpha=0.08, color="green")

# Mark where intervention would fire
trigger_days = test_days[yw_pred_prob >= 0.45]
if len(trigger_days):
    first_trigger = trigger_days[0]
    ax3.axvline(first_trigger, color=CORAL, linewidth=2, linestyle="-",
                label=f"First trigger: day {first_trigger}")
    ax3.annotate("⚡ Intervention\nwould fire here",
                 xy=(first_trigger, 0.45),
                 xytext=(first_trigger + 3, 0.60),
                 fontsize=8, color=CORAL,
                 arrowprops=dict(arrowstyle="->", color=CORAL))

ax3.set_title("Early Warning System — 7-day risk probability (USR_005)")
ax3.set_xlabel("Day index")
ax3.set_ylabel("Probability of high-risk event")
ax3.set_ylim(0, 1)
ax3.legend(fontsize=8)
ax3.grid(axis="y", alpha=0.3)

# Panel 4: Example SHAP waterfall for one high-risk day
ax4 = axes[1, 1]
# Find the highest-risk day for USR_005
high_risk_idx = np.argmax(y_pred)
shap_day      = shap_values[high_risk_idx]
base_val      = float(explainer.expected_value)

# Top contributors for that day
top_n = 8
contrib_df = pd.DataFrame({
    "feature": feature_cols,
    "shap":    shap_day,
}).reindex(pd.Series(shap_day).abs().nlargest(top_n).index)
contrib_df = contrib_df.sort_values("shap")

bar_colors = [CORAL if v > 0 else TEAL for v in contrib_df["shap"]]
ax4.barh(range(len(contrib_df)), contrib_df["shap"], color=bar_colors, alpha=0.85)
ax4.set_yticks(range(len(contrib_df)))
ax4.set_yticklabels(
    [f.replace("_7d_mean","(7d avg)").replace("_7d_delta","(7d Δ)")
      for f in contrib_df["feature"]],
    fontsize=8
)
ax4.axvline(0, color="black", linewidth=0.8)
ax4.set_title(f"SHAP explanation — highest risk day\n"
              f"Base score: {base_val:.1f} → Predicted: {y_pred[high_risk_idx]:.1f}")
ax4.set_xlabel("SHAP contribution (red = increases risk, teal = reduces risk)")
ax4.grid(axis="x", alpha=0.3)

plt.tight_layout()
plt.savefig("data/model_evaluation_chart.png", dpi=150, bbox_inches="tight")
print("  ✓ Saved model_evaluation_chart.png")


# ─────────────────────────────────────────────────────────────────────────────
# 9. INFERENCE FUNCTION — what FastAPI will call
#    This is the exact function the backend imports and calls per request.
# ─────────────────────────────────────────────────────────────────────────────

INFERENCE_CODE = '''"""
Discovery LifeOS — Model Inference Module
==========================================
Drop this file into the backend/ folder.
FastAPI imports predict_risk() and predict_early_warning() directly.
"""

import json
import numpy as np
import pandas as pd
import xgboost as xgb
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "ml" / "data"

# Load models once at startup (not per request)
_regressor  = xgb.XGBRegressor()
_classifier = xgb.XGBClassifier()
_regressor.load_model(MODEL_DIR / "model_risk_regressor.json")
_classifier.load_model(MODEL_DIR / "model_early_warning.json")

with open(MODEL_DIR / "model_feature_names.json") as f:
    FEATURE_NAMES = json.load(f)["features"]


def predict_risk(features: dict) -> dict:
    """
    Given a dict of user features for one day, returns:
      - risk_score       : float 0–100
      - early_warning    : bool (will user enter high-risk in 7 days?)
      - warning_prob     : float 0–1 (confidence)
      - top_risk_drivers : list of top 3 feature names driving the score
    """
    X = pd.DataFrame([features]).reindex(columns=FEATURE_NAMES, fill_value=0)

    risk_score    = float(np.clip(_regressor.predict(X)[0], 0, 100))
    warn_prob     = float(_classifier.predict_proba(X)[0, 1])
    early_warning = bool(warn_prob >= 0.45)

    # Feature importance as proxy for top drivers (lightweight — no SHAP per request)
    importances   = _regressor.feature_importances_
    top_idx       = np.argsort(importances)[::-1][:3]
    top_drivers   = [FEATURE_NAMES[i] for i in top_idx]

    return {
        "risk_score":       round(risk_score, 1),
        "early_warning":    early_warning,
        "warning_prob":     round(warn_prob, 3),
        "top_risk_drivers": top_drivers,
        "risk_band":        (
            "low"      if risk_score < 30 else
            "moderate" if risk_score < 55 else
            "high"
        ),
    }
'''

with open("data/model_inference.py", "w") as f:
    f.write(INFERENCE_CODE)
print("  ✓ Saved model_inference.py (copy this to backend/)")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  TRAINING COMPLETE")
print("=" * 60)
print(f"""
  Risk Score Regressor
    MAE  : {mae:.2f} pts on 0–100 scale
    R²   : {r2:.3f}

  Early Warning Classifier
    AUC  : {auc:.3f}
    F1   : {report.get("1", {}).get("f1-score", 0):.3f}

  Files saved to ml/data/:
    model_risk_regressor.json
    model_early_warning.json
    model_feature_names.json
    model_evaluation.json
    model_inference.py          ← copy to backend/
    model_evaluation_chart.png
""")
print("✅ Step 2 complete. Ready for Step 3 — FastAPI backend.\n")