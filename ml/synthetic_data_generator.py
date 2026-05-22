"""
Discovery LifeOS — Synthetic Behavioural Data Generator
========================================================
Generates 12 weeks of realistic daily behavioural signals for a test user
across three domains: Wellness, Nutrition, and Mobility.

Phases:
  Weeks 1-6  : Healthy baseline behaviour
  Weeks 7-10 : Gradual behavioural decline (stress event)
  Weeks 11-12: Partial recovery after AI intervention

Output files:
  data/users.csv                 — user profile
  data/wellness_signals.csv      — Vitality Pulse domain
  data/nutrition_signals.csv     — NutriSense domain
  data/mobility_signals.csv      — SafeRoute domain
  data/daily_risk_scores.csv     — ground truth risk scores (for model training)
  data/interventions.csv         — intervention events and outcomes
  data/combined_signals.csv      — all signals merged into one flat table
"""

import os
import json
import random
import numpy as np
import pandas as pd
from datetime import date, timedelta
from faker import Faker

# ── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
fake = Faker("en_GB")   # en_ZA not in this faker version; en_GB as closest proxy
fake.seed_instance(SEED)

# ── Output directory ──────────────────────────────────────────────────────────
os.makedirs("data", exist_ok=True)

# ── Simulation config ─────────────────────────────────────────────────────────
START_DATE    = date(2024, 1, 1)
NUM_DAYS      = 84          # 12 weeks
NUM_USERS     = 5           # generate 5 distinct user profiles

# Phase boundaries (day index, 0-based)
DECLINE_START = 42          # day 43 — week 7
DECLINE_PEAK  = 70          # day 71 — week 11 (worst point)
RECOVERY_START= 71          # day 72 — intervention fires
END_DAY       = NUM_DAYS    # day 84

# Load-shedding schedule (South Africa specific) — stage 2 on certain days
# True = load-shedding active that day (affects gym access, food prep, safe travel)
LOADSHEDDING_DAYS = {
    10, 11, 12, 24, 25, 38, 39, 40, 55, 56, 57, 58, 72, 73
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. USER PROFILES
# ─────────────────────────────────────────────────────────────────────────────

PROFILE_TEMPLATES = [
    {
        "persona":           "High performer",
        "age":               32,
        "vitality_status":   "Diamond",
        "base_steps":        10500,
        "base_sleep_hours":  7.4,
        "base_active_days":  5.5,
        "base_healthy_food_pct": 0.78,
        "base_drive_score":  88,
        "income_band":       "high",
        "has_gym_membership": True,
    },
    {
        "persona":           "Busy parent",
        "age":               41,
        "vitality_status":   "Gold",
        "base_steps":        7200,
        "base_sleep_hours":  6.5,
        "base_active_days":  3.5,
        "base_healthy_food_pct": 0.58,
        "base_drive_score":  76,
        "income_band":       "middle",
        "has_gym_membership": False,
    },
    {
        "persona":           "Young professional",
        "age":               27,
        "vitality_status":   "Gold",
        "base_steps":        8800,
        "base_sleep_hours":  7.0,
        "base_active_days":  4.0,
        "base_healthy_food_pct": 0.65,
        "base_drive_score":  81,
        "income_band":       "middle",
        "has_gym_membership": True,
    },
    {
        "persona":           "Senior employee",
        "age":               55,
        "vitality_status":   "Silver",
        "base_steps":        5500,
        "base_sleep_hours":  6.8,
        "base_active_days":  3.0,
        "base_healthy_food_pct": 0.62,
        "base_drive_score":  85,
        "income_band":       "middle",
        "has_gym_membership": False,
    },
    {
        "persona":           "Student",
        "age":               23,
        "vitality_status":   "Blue",
        "base_steps":        6500,
        "base_sleep_hours":  7.8,
        "base_active_days":  3.5,
        "base_healthy_food_pct": 0.45,
        "base_drive_score":  70,
        "income_band":       "low",
        "has_gym_membership": False,
    },
]


def build_users():
    rows = []
    for i, tmpl in enumerate(PROFILE_TEMPLATES):
        rows.append({
            "user_id":            f"USR_{i+1:03d}",
            "name":               fake.name(),
            "age":                tmpl["age"],
            "persona":            tmpl["persona"],
            "vitality_status":    tmpl["vitality_status"],
            "income_band":        tmpl["income_band"],
            "has_gym_membership": tmpl["has_gym_membership"],
            "city":               random.choice(["Johannesburg", "Cape Town", "Durban", "Pretoria"]),
            "province":           random.choice(["Gauteng", "Western Cape", "KwaZulu-Natal"]),
            "enrolled_date":      START_DATE - timedelta(days=random.randint(30, 365)),
        })
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PHASE MULTIPLIERS
#    Returns a dict of domain-specific multipliers for a given day index.
#    Baseline = 1.0. Decline = < 1.0. Recovery = trending back toward 1.0.
# ─────────────────────────────────────────────────────────────────────────────

def phase_multipliers(day_idx: int, profile: dict) -> dict:
    """
    Computes how much each signal is degraded/restored on a given day.
    Different signals degrade at different rates — sleep goes first, then
    activity, then nutrition, then driving behaviour.
    """
    if day_idx < DECLINE_START:
        # Healthy baseline — small natural variance handled in signal generators
        return dict(steps=1.0, sleep=1.0, activity=1.0,
                    nutrition=1.0, drive=1.0, app_engagement=1.0)

    if day_idx <= DECLINE_PEAK:
        # Decline phase: linear degradation, domain-specific depth
        progress = (day_idx - DECLINE_START) / (DECLINE_PEAK - DECLINE_START)
        return dict(
            sleep        = 1.0 - 0.30 * progress,   # sleep degrades first, most
            steps        = 1.0 - 0.40 * progress,
            activity     = 1.0 - 0.50 * progress,   # gym drops off sharply
            nutrition    = 1.0 - 0.35 * progress,
            drive        = 1.0 - 0.20 * progress,   # driving degrades last
            app_engagement= 1.0 - 0.55 * progress,  # app disengagement clear signal
        )

    # Recovery phase: partial — AI intervention helps but not instant
    recovery_progress = (day_idx - RECOVERY_START) / (END_DAY - RECOVERY_START)
    recovery_progress = min(recovery_progress, 1.0)
    # Recover to ~80% of baseline (realistic — not full recovery in 2 weeks)
    floor = dict(sleep=0.70, steps=0.60, activity=0.50,
                 nutrition=0.65, drive=0.80, app_engagement=0.45)
    return {
        k: floor[k] + (1.0 - floor[k]) * 0.80 * recovery_progress
        for k in floor
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. SIGNAL GENERATORS
# ─────────────────────────────────────────────────────────────────────────────

def _jitter(value: float, pct: float = 0.08) -> float:
    """Add Gaussian noise proportional to value."""
    return max(0.0, value + np.random.normal(0, value * pct))


def generate_wellness_signals(user_id: str, profile: dict) -> pd.DataFrame:
    rows = []
    for day_idx in range(NUM_DAYS):
        current_date = START_DATE + timedelta(days=day_idx)
        weekday      = current_date.weekday()          # 0=Mon … 6=Sun
        is_weekend   = weekday >= 5
        is_ls        = day_idx in LOADSHEDDING_DAYS
        mults        = phase_multipliers(day_idx, profile)

        # Steps
        weekend_boost = 1.15 if is_weekend else 1.0
        ls_penalty    = 0.75 if is_ls else 1.0
        steps = int(_jitter(
            profile["base_steps"] * mults["steps"] * weekend_boost * ls_penalty,
            pct=0.12
        ))

        # Sleep hours (people sleep less on week nights)
        weeknight_penalty = 0.93 if not is_weekend else 1.0
        sleep_hours = round(_jitter(
            profile["base_sleep_hours"] * mults["sleep"] * weeknight_penalty,
            pct=0.06
        ), 1)
        sleep_hours = min(sleep_hours, 10.0)

        # Sleep consistency score (0–100): how close to usual bedtime
        sleep_consistency = int(np.clip(
            _jitter(85 * mults["sleep"], pct=0.10), 10, 100
        ))

        # Heart rate resting (rises under stress/decline)
        hr_baseline  = 62 + (profile["age"] - 30) * 0.3
        hr_stress    = hr_baseline * (1 + (1 - mults["sleep"]) * 0.15)
        resting_hr   = int(_jitter(hr_stress, pct=0.04))

        # Gym / workout session (boolean — did they work out today?)
        base_workout_prob = (profile["base_active_days"] / 7.0) * mults["activity"]
        if is_ls:
            base_workout_prob *= 0.5   # load-shedding kills gym visits
        workout_today = int(random.random() < base_workout_prob)

        # Vitality points earned today
        points = 0
        points += min(steps // 1000 * 10, 100)
        points += 50 if workout_today else 0
        if sleep_hours >= 7.0:
            points += 20
        points = int(_jitter(points, pct=0.05))

        # App engagement score (0–100): opens, interactions, goal checks
        app_eng = int(np.clip(
            _jitter(75 * mults["app_engagement"], pct=0.15), 0, 100
        ))

        # Streak (days since last missed workout target)
        # simplified: streaks reset when no workout + low app engagement
        streak_broken = (not workout_today) and (app_eng < 30)

        rows.append({
            "user_id":              user_id,
            "date":                 current_date,
            "day_index":            day_idx,
            "week":                 day_idx // 7 + 1,
            "weekday":              current_date.strftime("%A"),
            "is_weekend":           is_weekend,
            "load_shedding":        is_ls,
            "steps":                steps,
            "sleep_hours":          sleep_hours,
            "sleep_consistency":    sleep_consistency,
            "resting_hr":           resting_hr,
            "workout_today":        workout_today,
            "vitality_points":      points,
            "app_engagement_score": app_eng,
            "streak_broken":        int(streak_broken),
        })
    return pd.DataFrame(rows)


def generate_nutrition_signals(user_id: str, profile: dict) -> pd.DataFrame:
    rows = []
    for day_idx in range(NUM_DAYS):
        current_date = START_DATE + timedelta(days=day_idx)
        is_weekend   = current_date.weekday() >= 5
        is_ls        = day_idx in LOADSHEDDING_DAYS
        mults        = phase_multipliers(day_idx, profile)

        # Healthy food purchase ratio (HealthyFood scanner data)
        # Declines during stress: people revert to comfort food
        ls_impact = -0.12 if is_ls else 0.0  # load-shedding → no cooking → takeaways
        healthy_pct = float(np.clip(
            _jitter(profile["base_healthy_food_pct"] * mults["nutrition"], pct=0.08)
            + ls_impact, 0.0, 1.0
        ))

        # Spend (ZAR) — proxy for food quality changes
        income_spend = {"high": 320, "middle": 185, "low": 95}
        base_spend   = income_spend[profile["income_band"]]
        # Stress eating: spend rises slightly during decline
        stress_premium = 1.0 + (1 - mults["nutrition"]) * 0.20
        food_spend = round(_jitter(base_spend * stress_premium, pct=0.15), 2)

        # Meal prep score (0–100): did they cook at home vs order in?
        # Low during load-shedding, low during decline
        cook_score = int(np.clip(
            _jitter(70 * mults["nutrition"], pct=0.12)
            - (30 if is_ls else 0), 0, 100
        ))

        # Number of HealthyFood items scanned this day
        scan_count = max(0, int(np.random.poisson(
            lam=max(0.5, 3.5 * mults["nutrition"])
        )))

        # Nutrition variety score (0–10): diverse food groups
        variety = round(np.clip(
            _jitter(7.5 * mults["nutrition"], pct=0.10), 0, 10
        ), 1)

        # Sugar / processed food index (0–10, higher = worse)
        # Inverts with nutrition multiplier
        sugar_index = round(np.clip(
            _jitter(4.0 * (1 + (1 - mults["nutrition"]) * 1.5), pct=0.10), 0, 10
        ), 1)

        rows.append({
            "user_id":           user_id,
            "date":              current_date,
            "day_index":         day_idx,
            "week":              day_idx // 7 + 1,
            "is_weekend":        is_weekend,
            "load_shedding":     is_ls,
            "healthy_food_pct":  round(healthy_pct, 3),
            "food_spend_zar":    food_spend,
            "meal_prep_score":   cook_score,
            "healthy_items_scanned": scan_count,
            "nutrition_variety": variety,
            "sugar_index":       sugar_index,
        })
    return pd.DataFrame(rows)


def generate_mobility_signals(user_id: str, profile: dict) -> pd.DataFrame:
    rows = []
    for day_idx in range(NUM_DAYS):
        current_date = START_DATE + timedelta(days=day_idx)
        is_weekend   = current_date.weekday() >= 5
        is_ls        = day_idx in LOADSHEDDING_DAYS
        mults        = phase_multipliers(day_idx, profile)

        # Drive score (Discovery Insure telematics)
        ls_drive_penalty = 0.90 if is_ls else 1.0  # load-shedding → no traffic lights
        drive_score = int(np.clip(
            _jitter(profile["base_drive_score"] * mults["drive"] * ls_drive_penalty,
                    pct=0.06),
            20, 100
        ))

        # Trips today
        avg_trips   = 3 if not is_weekend else 1.5
        trips_today = max(0, int(np.random.poisson(lam=avg_trips * mults["drive"])))

        # Distance driven (km)
        avg_km      = 42 if not is_weekend else 18
        km_driven   = round(max(0, _jitter(avg_km * mults["drive"], pct=0.20)), 1)

        # Late-night driving (23:00–04:00) — fatigue risk signal
        # Increases during decline (later nights → early morning drive)
        late_night_trip = int(random.random() < (0.05 + (1 - mults["drive"]) * 0.25))

        # Fatigue risk score (0–100): derived from sleep + late-night driving
        sleep_mlt = mults["sleep"]
        fatigue_risk = int(np.clip(
            _jitter((1 - sleep_mlt) * 85 + late_night_trip * 25, pct=0.10),
            0, 100
        ))

        # Hard braking events (telematics)
        hard_brake = max(0, int(np.random.poisson(
            lam=max(0.1, (1 - mults["drive"] * 0.8) * 3)
        )))

        # Route risk level (0=low, 1=medium, 2=high) — combines time, weather, ls
        route_risk = 0
        if is_ls:
            route_risk += 1
        if late_night_trip:
            route_risk += 1
        route_risk = min(route_risk, 2)

        rows.append({
            "user_id":          user_id,
            "date":             current_date,
            "day_index":        day_idx,
            "week":             day_idx // 7 + 1,
            "is_weekend":       is_weekend,
            "load_shedding":    is_ls,
            "drive_score":      drive_score,
            "trips_today":      trips_today,
            "km_driven":        km_driven,
            "late_night_trip":  late_night_trip,
            "fatigue_risk":     fatigue_risk,
            "hard_braking":     hard_brake,
            "route_risk_level": route_risk,
        })
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────
# 4. GROUND TRUTH RISK SCORE
#    Composite daily risk score (0–100). Higher = more at risk.
#    Weighted across all three domains. This is our prediction target.
# ─────────────────────────────────────────────────────────────────────────────

def compute_risk_scores(wellness: pd.DataFrame,
                        nutrition: pd.DataFrame,
                        mobility: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for day_idx in range(NUM_DAYS):
        w = wellness[wellness["day_index"] == day_idx].iloc[0]
        n = nutrition[nutrition["day_index"] == day_idx].iloc[0]
        m = mobility[mobility["day_index"] == day_idx].iloc[0]

        # Normalise each signal to a 0–1 risk contribution
        # Higher contribution = more risk
        sleep_risk    = max(0, (7.5 - w["sleep_hours"]) / 7.5)
        steps_risk    = max(0, (10000 - w["steps"]) / 10000)
        activity_risk = 1 - w["workout_today"]
        hr_risk       = max(0, (w["resting_hr"] - 60) / 40)
        engage_risk   = max(0, (70 - w["app_engagement_score"]) / 70)
        streak_risk   = float(w["streak_broken"])

        nutrition_risk = 1 - n["healthy_food_pct"]
        sugar_risk     = n["sugar_index"] / 10.0
        prep_risk      = max(0, (70 - n["meal_prep_score"]) / 70)

        drive_risk    = max(0, (85 - m["drive_score"]) / 85)
        fatigue_risk  = m["fatigue_risk"] / 100.0
        latenight_risk= float(m["late_night_trip"])

        # Weighted composite (weights reflect predictive importance)
        wellness_score  = (sleep_risk * 0.35 + steps_risk * 0.20 +
                           activity_risk * 0.20 + hr_risk * 0.10 +
                           engage_risk * 0.10 + streak_risk * 0.05)

        nutrition_score = (nutrition_risk * 0.50 + sugar_risk * 0.30 +
                           prep_risk * 0.20)

        mobility_score  = (drive_risk * 0.40 + fatigue_risk * 0.40 +
                           latenight_risk * 0.20)

        composite = (wellness_score * 0.45 +
                     nutrition_score * 0.30 +
                     mobility_score * 0.25)

        # Scale to 0–100 and add small noise
        risk_score = int(np.clip(_jitter(composite * 100, pct=0.05), 0, 100))

        # Intervention flag: fires on RECOVERY_START for high-risk users
        intervention_fired = int(
            day_idx == RECOVERY_START and risk_score >= 55
        )

        rows.append({
            "user_id":              w["user_id"],
            "date":                 w["date"],
            "day_index":            day_idx,
            "week":                 day_idx // 7 + 1,
            "risk_score":           risk_score,
            "wellness_risk":        round(wellness_score * 100, 1),
            "nutrition_risk":       round(nutrition_score * 100, 1),
            "mobility_risk":        round(mobility_score * 100, 1),
            "load_shedding":        int(day_idx in LOADSHEDDING_DAYS),
            "intervention_fired":   intervention_fired,
            "phase": (
                "baseline" if day_idx < DECLINE_START
                else "decline" if day_idx <= DECLINE_PEAK
                else "recovery"
            ),
        })
    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────
# 5. INTERVENTIONS TABLE
# ─────────────────────────────────────────────────────────────────────────────

INTERVENTION_TYPES = [
    {"type": "vitality_point_boost",   "domain": "wellness",   "channel": "push_notification"},
    {"type": "rest_day_encouragement", "domain": "wellness",   "channel": "in_app_message"},
    {"type": "healthy_food_discount",  "domain": "nutrition",  "channel": "push_notification"},
    {"type": "meal_prep_guide",        "domain": "nutrition",  "channel": "in_app_message"},
    {"type": "route_risk_alert",       "domain": "mobility",   "channel": "push_notification"},
    {"type": "fatigue_warning",        "domain": "mobility",   "channel": "push_notification"},
]


def generate_interventions(risk_scores: pd.DataFrame, user_id: str) -> pd.DataFrame:
    rows = []
    intervention_id = 1

    for _, row in risk_scores[risk_scores["risk_score"] >= 50].iterrows():
        # Select intervention mix based on which domain is highest risk
        candidates = INTERVENTION_TYPES.copy()
        random.shuffle(candidates)

        num_interventions = 1 if row["risk_score"] < 65 else 2
        selected = candidates[:num_interventions]

        for iv in selected:
            # Simulated outcome: recovery phase interventions more effective
            base_effectiveness = 0.65 if row["phase"] == "recovery" else 0.40
            effectiveness      = round(np.clip(
                base_effectiveness + np.random.normal(0, 0.10), 0, 1
            ), 2)

            rows.append({
                "intervention_id":   f"IV_{intervention_id:04d}",
                "user_id":           user_id,
                "date":              row["date"],
                "day_index":         row["day_index"],
                "week":              row["week"],
                "phase":             row["phase"],
                "trigger_risk_score": row["risk_score"],
                "intervention_type": iv["type"],
                "domain":            iv["domain"],
                "channel":           iv["channel"],
                "effectiveness":     effectiveness,
                "user_responded":    int(random.random() < effectiveness),
            })
            intervention_id += 1

    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────
# 6. ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

def run():
    print("=" * 60)
    print("  Discovery LifeOS — Synthetic Data Generator")
    print("=" * 60)

    users_df = build_users()
    users_df.to_csv("data/users.csv", index=False)
    print(f"\n✓ Generated {len(users_df)} user profiles")

    all_wellness   = []
    all_nutrition  = []
    all_mobility   = []
    all_risk       = []
    all_interventions = []

    for _, user in users_df.iterrows():
        uid     = user["user_id"]
        profile = PROFILE_TEMPLATES[int(uid.split("_")[1]) - 1]

        print(f"\n  Processing {uid} — {user['persona']} ({user['name']})")

        wellness  = generate_wellness_signals(uid, profile)
        nutrition = generate_nutrition_signals(uid, profile)
        mobility  = generate_mobility_signals(uid, profile)
        risk      = compute_risk_scores(wellness, nutrition, mobility)
        interventions = generate_interventions(risk, uid)

        all_wellness.append(wellness)
        all_nutrition.append(nutrition)
        all_mobility.append(mobility)
        all_risk.append(risk)
        all_interventions.append(interventions)

        peak_risk = risk["risk_score"].max()
        baseline_risk = risk[risk["phase"] == "baseline"]["risk_score"].mean()
        print(f"    Baseline avg risk : {baseline_risk:.1f}/100")
        print(f"    Peak risk score   : {peak_risk}/100")
        print(f"    Interventions fired: {len(interventions)}")

    # Combine and save
    wellness_df      = pd.concat(all_wellness, ignore_index=True)
    nutrition_df     = pd.concat(all_nutrition, ignore_index=True)
    mobility_df      = pd.concat(all_mobility, ignore_index=True)
    risk_df          = pd.concat(all_risk, ignore_index=True)
    interventions_df = pd.concat(all_interventions, ignore_index=True)

    wellness_df.to_csv("data/wellness_signals.csv", index=False)
    nutrition_df.to_csv("data/nutrition_signals.csv", index=False)
    mobility_df.to_csv("data/mobility_signals.csv", index=False)
    risk_df.to_csv("data/daily_risk_scores.csv", index=False)
    interventions_df.to_csv("data/interventions.csv", index=False)

    # Combined flat table for easy ML consumption
    combined = wellness_df.merge(
        nutrition_df.drop(columns=["week","is_weekend","load_shedding"]),
        on=["user_id","date","day_index"]
    ).merge(
        mobility_df.drop(columns=["week","is_weekend","load_shedding"]),
        on=["user_id","date","day_index"]
    ).merge(
        risk_df[["user_id","date","day_index","risk_score",
                 "wellness_risk","nutrition_risk","mobility_risk","phase"]],
        on=["user_id","date","day_index"]
    )
    combined.to_csv("data/combined_signals.csv", index=False)

    # Summary stats
    print("\n" + "=" * 60)
    print("  Output files written to ./data/")
    print("=" * 60)
    print(f"  users.csv              — {len(users_df)} rows")
    print(f"  wellness_signals.csv   — {len(wellness_df)} rows")
    print(f"  nutrition_signals.csv  — {len(nutrition_df)} rows")
    print(f"  mobility_signals.csv   — {len(mobility_df)} rows")
    print(f"  daily_risk_scores.csv  — {len(risk_df)} rows")
    print(f"  interventions.csv      — {len(interventions_df)} rows")
    print(f"  combined_signals.csv   — {len(combined)} rows, {len(combined.columns)} features")

    # Quick validation
    print("\n" + "=" * 60)
    print("  Risk score summary by phase (USR_001 — High performer)")
    print("=" * 60)
    usr1 = risk_df[risk_df["user_id"] == "USR_001"]
    print(usr1.groupby("phase")["risk_score"].agg(["mean","min","max"]).round(1).to_string())

    print("\n  Decline visible? (week-by-week risk, USR_001)")
    print("  " + "-" * 30)
    weekly = usr1.groupby("week")["risk_score"].mean().round(1)
    for week, score in weekly.items():
        bar   = "█" * int(score / 5)
        phase = ("baseline" if week <= 6 else
                 "DECLINE ⚠" if week <= 10 else
                 "recovery ✓")
        print(f"  Week {week:2d} | {score:5.1f} | {bar:<20} | {phase}")

    # Save metadata
    meta = {
        "generated_at":   str(date.today()),
        "num_users":      NUM_USERS,
        "num_days":       NUM_DAYS,
        "start_date":     str(START_DATE),
        "phases": {
            "baseline":  f"days 1–{DECLINE_START}",
            "decline":   f"days {DECLINE_START+1}–{DECLINE_PEAK+1}",
            "recovery":  f"days {RECOVERY_START+1}–{END_DAY}",
        },
        "features":       list(combined.columns),
        "loadshedding_days": sorted(LOADSHEDDING_DAYS),
    }
    with open("data/metadata.json", "w") as f:
        json.dump(meta, f, indent=2)
    print("\n  metadata.json written.")
    print("\n✅ Data generation complete.\n")


if __name__ == "__main__":
    run()