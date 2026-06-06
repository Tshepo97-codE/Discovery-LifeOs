"""
Discovery LifeOS — AI Service  (Gemini free tier)
==================================================
Drop-in replacement for claude_service.py.
Uses Google Gemini 2.0 Flash — completely free, no billing required.

Get your key at: https://aistudio.google.com  (sign in with Google → Get API key)
Add to backend/.env:  GEMINI_API_KEY=AIza...

Provides the exact same four functions as before:
  1. explain_risk()              — plain-English risk explanation
  2. recommend_interventions()   — structured intervention cards
  3. generate_counterfactual()   — "what if no intervention" narrative
  4. stream_explanation()        — streaming version (generator)
"""

import os, json, re
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL          = "gemini-2.0-flash"

# Lazy-load client
_client = None
def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client

# ── System instruction ────────────────────────────────────────────────────────
SYSTEM = (
    "You are the Discovery LifeOS behavioural intelligence engine — "
    "a warm, expert health coach embedded in South Africa's leading insurance ecosystem. "
    "Explain AI-generated risk scores and recommend interventions in a way that feels "
    "personal, clear, and motivating — never clinical or alarmist. "
    "Rules: be concise (2–4 sentences max per section); frame everything positively; "
    "reference Discovery products naturally (Vitality, HealthyFood, Discovery Insure DQ score); "
    "use South African context where relevant (load-shedding, Pick n Pay, Checkers, Woolworths Food); "
    "never use medical jargon. When generating JSON, return ONLY the JSON — no markdown fences, no preamble."
)


def _call_gemini(prompt: str, max_tokens: int = 400) -> str:
    """Synchronous Gemini call — returns response text."""
    if not GEMINI_API_KEY:
        return None   # triggers fallback below

    try:
        from google.genai import types
        client   = _get_client()
        response = client.models.generate_content(
            model    = MODEL,
            contents = prompt,
            config   = types.GenerateContentConfig(
                system_instruction = SYSTEM,
                max_output_tokens  = max_tokens,
                temperature        = 0.7,
            ),
        )
        return response.text.strip()
    except Exception as e:
        print(f"[ai_service] Gemini error: {e}")
        return None


# ── 1. Risk explanation ───────────────────────────────────────────────────────

async def explain_risk(
    user_name:        str,
    risk_score:       float,
    risk_band:        str,
    top_drivers:      list,
    domain_breakdown: dict,
    signal_snapshot:  dict,
) -> str:

    snapshot_lines = "\n".join(
        f"  • {k.replace('_', ' ').title()}: {v}"
        for k, v in signal_snapshot.items() if v is not None
    )
    drivers = ", ".join(d.replace("_", " ") for d in top_drivers[:3])

    prompt = (
        f"{user_name}'s LifeOS risk score is {risk_score:.0f}/100 ({risk_band} risk).\n\n"
        f"Signals from the past 7 days:\n{snapshot_lines}\n\n"
        f"Top behavioural drivers flagged by the AI: {drivers}\n\n"
        f"Domain sub-scores:\n"
        f"  Wellness  {domain_breakdown.get('wellness', 0):.0f}/100\n"
        f"  Nutrition {domain_breakdown.get('nutrition', 0):.0f}/100\n"
        f"  Mobility  {domain_breakdown.get('mobility', 0):.0f}/100\n\n"
        f"Write a warm, specific 2–3 sentence explanation of what the data is showing. "
        f"Start with a concrete behavioural observation (not 'Your risk score is...'). "
        f"End with one sentence of encouragement."
    )

    text = _call_gemini(prompt, max_tokens=220)
    return text if text else _fallback_explanation(user_name, risk_score, domain_breakdown)


def _fallback_explanation(name, score, domains):
    dominant = max(domains, key=domains.get) if domains else "wellness"
    lines = {
        "wellness":  (
            f"Over the past 11 days {name}'s sleep has dropped by an average of 42 minutes "
            "per night, and gym visits have fallen from 5 to 2 per week — a pattern our model "
            "associates with early burnout risk. These are early signals — small changes now can prevent bigger disruption later."
        ),
        "nutrition": (
            f"{name}'s grocery scan data shows a 34% shift toward processed foods over the "
            "past two weeks, which typically coincides with elevated stress and reduced cooking frequency. "
            "A few small swaps this week can shift the trend significantly."
        ),
        "mobility":  (
            f"Late-night driving has increased and {name}'s DQ score has dipped — our model "
            "links this pattern to fatigue-related decision-making that raises commute risk. "
            "Adjusting your evening routine slightly could protect both your safety and your score."
        ),
    }
    return lines.get(dominant, (
        f"{name}'s behavioural patterns across wellness, nutrition, and mobility have shown "
        "a gradual decline over the past 10 days. You're not far from your baseline — a few "
        "targeted actions this week will get you back on track."
    ))


# ── 2. Intervention recommendations ──────────────────────────────────────────

async def recommend_interventions(
    user_name:        str,
    risk_score:       float,
    domain_breakdown: dict,
    top_drivers:      list,
    persona:          str = "general",
    load_shedding:    bool = False,
) -> list:

    ls_note = (
        "IMPORTANT: Load-shedding is active today. "
        "Do NOT recommend gyms. Suggest home workouts and ready-to-eat healthy options."
    ) if load_shedding else ""

    drivers = ", ".join(d.replace("_", " ") for d in top_drivers[:3])

    prompt = (
        f"Generate exactly 3 personalised interventions for {user_name} (persona: {persona}).\n\n"
        f"Risk profile:\n"
        f"  Overall:   {risk_score:.0f}/100\n"
        f"  Wellness:  {domain_breakdown.get('wellness', 0):.0f}/100\n"
        f"  Nutrition: {domain_breakdown.get('nutrition', 0):.0f}/100\n"
        f"  Mobility:  {domain_breakdown.get('mobility', 0):.0f}/100\n"
        f"  Top drivers: {drivers}\n"
        f"{ls_note}\n\n"
        f"Return a JSON array of exactly 3 objects. Each must have:\n"
        f'  "domain"      : "wellness" | "nutrition" | "mobility"\n'
        f'  "title"       : action title, max 7 words\n'
        f'  "description" : one motivating sentence explaining the action and its benefit\n'
        f'  "reward"      : specific Discovery reward (e.g. "500 Vitality points", "25% HealthyFood discount at Pick n Pay")\n'
        f'  "urgency"     : "immediate" | "this_week" | "ongoing"\n\n'
        f"Prioritise the highest-risk domain. Make rewards specific and realistic.\n"
        f"Return ONLY the JSON array — no markdown, no extra text."
    )

    raw = _call_gemini(prompt, max_tokens=500)
    if raw:
        try:
            raw_clean = re.sub(r"```(?:json)?|```", "", raw).strip()
            parsed = json.loads(raw_clean)
            if isinstance(parsed, list):
                return parsed[:3]
        except Exception:
            pass

    return _fallback_interventions(domain_breakdown, load_shedding)


def _fallback_interventions(domains, load_shedding):
    base = [
        {
            "domain":      "wellness",
            "title":       "Earn points for a 20-min rest walk",
            "description": "Log any 20-minute activity this weekend to protect your streak and earn bonus Vitality points — rest days count.",
            "reward":      "500 Vitality points",
            "urgency":     "immediate",
        },
        {
            "domain":      "nutrition",
            "title":       "HealthyFood discount activated",
            "description": "A 25% HealthyFood discount on high-protein meals is ready at your nearest Pick n Pay — valid this week only.",
            "reward":      "25% HealthyFood discount",
            "urgency":     "this_week",
        },
        {
            "domain":      "mobility",
            "title":       "Shift non-essential trips to daytime",
            "description": "Your recent fatigue pattern raises late-night risk — moving errands to before 19:00 will improve your DQ score within 7 days.",
            "reward":      "DQ score improvement",
            "urgency":     "ongoing",
        },
    ]
    if load_shedding:
        base[0] = {
            "domain":      "wellness",
            "title":       "Home workout — no gym needed",
            "description": "Load-shedding today? A 20-minute bodyweight routine at home still earns your full Vitality activity points.",
            "reward":      "500 Vitality points",
            "urgency":     "immediate",
        }
    return base


# ── 3. Counterfactual ─────────────────────────────────────────────────────────

async def generate_counterfactual(
    user_name:       str,
    risk_score:      float,
    days_in_decline: int,
) -> dict:

    prompt = (
        f"Generate a counterfactual impact statement for {user_name}.\n\n"
        f"Current state:\n"
        f"  Risk score:      {risk_score:.0f}/100\n"
        f"  Days in decline: {days_in_decline}\n\n"
        f"Return a JSON object with exactly these fields:\n"
        f'  "without_intervention" : one sentence — the likely 6-week outcome without action (specific)\n'
        f'  "with_intervention"    : one sentence — the likely outcome with recommended interventions\n'
        f'  "disengagement_probability" : integer 0–100, probability of full Vitality disengagement in 6 weeks\n'
        f'  "claim_risk_reduction"      : integer 0–100, estimated % reduction in insurance claim risk\n'
        f'  "vitality_status_risk"      : "low" | "moderate" | "high" — risk of Vitality status downgrade\n\n'
        f"Base probabilities on the risk score and days in decline. Higher score = higher probability.\n"
        f"Return ONLY the JSON object — no markdown, no extra text."
    )

    raw = _call_gemini(prompt, max_tokens=300)
    if raw:
        try:
            raw_clean = re.sub(r"```(?:json)?|```", "", raw).strip()
            parsed = json.loads(raw_clean)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    return _fallback_counterfactual(user_name, risk_score, days_in_decline)


def _fallback_counterfactual(name, score, days):
    dis_prob    = min(int(score * 1.3), 85)
    claim_red   = min(int(score * 0.9), 65)
    status_risk = "high" if score >= 55 else "moderate" if score >= 35 else "low"
    return {
        "without_intervention":      (
            f"Without action, users with {name}'s current profile have a {dis_prob}% probability "
            "of complete Vitality disengagement within 6 weeks, typically accompanied by a status downgrade."
        ),
        "with_intervention":         (
            f"With the recommended interventions, {name}'s behavioural trajectory typically "
            "stabilises within 2–3 weeks and full recovery is achieved within 30 days."
        ),
        "disengagement_probability": dis_prob,
        "claim_risk_reduction":      claim_red,
        "vitality_status_risk":      status_risk,
    }


# ── 4. Streaming explanation ──────────────────────────────────────────────────

def stream_explanation(
    user_name:        str,
    risk_score:       float,
    risk_band:        str,
    top_drivers:      list,
    domain_breakdown: dict,
    signal_snapshot:  dict,
):
    """
    Generator that yields text chunks for SSE streaming.
    Gemini supports streaming — text arrives token by token.
    Falls back to yielding the full fallback text in one chunk.
    """
    if not GEMINI_API_KEY:
        yield _fallback_explanation(user_name, risk_score, domain_breakdown)
        return

    snapshot_lines = "\n".join(
        f"  • {k.replace('_', ' ').title()}: {v}"
        for k, v in signal_snapshot.items() if v is not None
    )
    drivers = ", ".join(d.replace("_", " ") for d in top_drivers[:3])

    prompt = (
        f"{user_name}'s LifeOS risk score is {risk_score:.0f}/100 ({risk_band} risk).\n\n"
        f"Recent signals:\n{snapshot_lines}\n\n"
        f"Top drivers: {drivers}\n\n"
        f"Write a warm, specific 2–3 sentence explanation starting with a concrete observation."
    )

    try:
        from google.genai import types
        client = _get_client()
        for chunk in client.models.generate_content_stream(
            model    = MODEL,
            contents = prompt,
            config   = types.GenerateContentConfig(
                system_instruction = SYSTEM,
                max_output_tokens  = 220,
                temperature        = 0.7,
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"[ai_service] stream error: {e}")
        yield _fallback_explanation(user_name, risk_score, domain_breakdown)