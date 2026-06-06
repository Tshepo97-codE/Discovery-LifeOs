# Running the Project

> How to start Discovery LifeOS from scratch, step by step.
> Assumes you've completed [SETUP.md](SETUP.md).

---

## Every-day start (fastest path)

Open **three VSCode terminals** side by side (`Ctrl+Shift+5` to split):

**Terminal 1 — Backend**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

**Terminal 3 — spare** (for git, running scripts, checking logs)

Then open:
- **Dashboard** → [http://localhost:5173](http://localhost:5173)
- **API docs** → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## First-time full run (complete walkthrough)

### Step 1 — Generate the synthetic data

```bash
# From project root
cd ml
python synthetic_data_generator.py
```

Expected output:
```
============================================================
  Discovery LifeOS — Synthetic Data Generator
============================================================

  Processing USR_001 — High performer (...)
    Baseline avg risk : 11.3/100
    Peak risk score   : 57/100
    Interventions fired: 12
  ...
✅ Data generation complete.
```

Files created in `ml/data/`:
```
users.csv               ← 5 user profiles
wellness_signals.csv    ← daily wellness data
nutrition_signals.csv   ← daily nutrition data
mobility_signals.csv    ← daily mobility data
daily_risk_scores.csv   ← ground truth risk scores
interventions.csv       ← intervention events
combined_signals.csv    ← flat ML training table
metadata.json           ← schema and config
```

---

### Step 2 — Train the risk model

```bash
# Still in ml/
python risk_model.py
```

Expected output (last few lines):
```
  Risk Score Regressor
    MAE  : 2.29 pts on 0–100 scale
    R²   : 0.907

  Early Warning Classifier
    AUC  : 0.988
    F1   : 0.857

✅ Step 2 complete.
```

Files created in `ml/data/`:
```
model_risk_regressor.json    ← trained XGBoost regressor
model_early_warning.json     ← trained early warning classifier
model_feature_names.json     ← feature list (must match API input)
model_evaluation.json        ← accuracy metrics
model_evaluation_chart.png   ← SHAP + prediction charts
```

> ⚠️ You must complete Steps 1 and 2 before starting the backend.
> The backend loads these files on startup — if they're missing it will crash.

---

### Step 3 — Start the backend

```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Will watch for changes in these directories: ['.']
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

#### Verify the backend is working

Open [http://localhost:8000](http://localhost:8000) in your browser.

You should see:
```json
{
  "status": "ok",
  "service": "Discovery LifeOS API",
  "version": "1.0.0",
  "gemini": "connected",
  "model_metrics": { ... }
}
```

If `"gemini"` shows `"fallback mode (no API key)"` — check your `backend/.env` file.

#### Test a specific endpoint

Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

Or use Thunder Client in VSCode to test:
```
GET http://localhost:8000/api/users
GET http://localhost:8000/api/users/USR_001
GET http://localhost:8000/api/users/USR_001/timeline
GET http://localhost:8000/api/dashboard/summary
```

---

### Step 4 — Start the frontend

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open [http://localhost:5173](http://localhost:5173) — you should see the Discovery LifeOS dashboard with live data.

---

### Step 5 — Verify the full stack

Work through this checklist in the browser:

- [ ] Dashboard loads with KPI cards and risk chart
- [ ] Counterfactual chart shows the amber gap region
- [ ] Users page lists all 5 users
- [ ] Click USR_001 → User Detail page loads
- [ ] Chart signal switcher works (Risk / Wellness / Nutrition / Mobility)
- [ ] Click "Ask Gemini to explain" → text streams in live
- [ ] Click "Generate interventions" → 3 cards appear
- [ ] Toggle load-shedding ON → re-generate → interventions change
- [ ] Click "Show counterfactual" → chart animates in with two lines

---

## Available API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check + model metrics |
| GET | `/api/users` | All users with latest risk |
| GET | `/api/users/{id}` | User profile + live prediction |
| GET | `/api/users/{id}/timeline` | 84-day behavioural timeline |
| GET | `/api/users/{id}/explain` | Gemini explanation of risk |
| GET | `/api/users/{id}/explain/stream` | Streaming explanation (SSE) |
| GET | `/api/users/{id}/interventions` | Gemini intervention cards |
| GET | `/api/users/{id}/counterfactual` | "What if no intervention" narrative |
| GET | `/api/users/{id}/counterfactual-chart` | Chart data for counterfactual |
| GET | `/api/dashboard/summary` | Platform-level stats |
| GET | `/api/dashboard/counterfactual-overview` | All-users counterfactual |
| POST | `/api/predict` | Live risk prediction from features |

---

## Common errors and fixes

### `ModuleNotFoundError: No module named 'xgboost'`
```bash
# Make sure your venv is active
venv\Scripts\activate
pip install -r requirements.txt
```

### `FileNotFoundError: ml/data/model_risk_regressor.json`
```bash
# You need to run the ML pipeline first
cd ml
python synthetic_data_generator.py
python risk_model.py
```

### `CORS error` in browser console
The backend has CORS enabled for all origins in development. If you still see this, make sure the backend is running on port 8000 and the Vite proxy in `frontend/vite.config.js` is configured correctly.

### `"gemini": "fallback mode"` in health check
```bash
# Check your .env file
cat backend/.env
# Should show: GEMINI_API_KEY=AIza...

# If blank, add your key:
# Get free key at https://aistudio.google.com
```

### Port already in use
```bash
# Kill whatever is on port 8000
npx kill-port 8000

# Kill whatever is on port 5173
npx kill-port 5173
```

### Frontend shows blank page
```bash
# Hard refresh
Ctrl + Shift + R

# Or clear Vite cache
cd frontend
rm -rf node_modules/.vite
npm run dev
```

---

## Useful development commands

```bash
# Backend — run with extra logging
uvicorn main:app --reload --port 8000 --log-level debug

# Frontend — build for production
cd frontend && npm run build

# Frontend — preview production build
cd frontend && npm run preview

# ML — re-run data generation + model training (wipes existing data)
cd ml
python synthetic_data_generator.py && python risk_model.py

# Check all Python dependencies are installed
pip list | grep -E "fastapi|xgboost|shap|google"

# Format Python code
pip install black && black backend/

# Lint frontend
cd frontend && npm run lint
```

---

## Running with Docker (optional)

If Docker Desktop is installed:

```bash
# From project root — starts everything in one command
docker compose up --build

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up --build --force-recreate
```

Dashboard → [http://localhost:5173](http://localhost:5173)
API → [http://localhost:8000](http://localhost:8000)

---

## Branching workflow

```bash
# Start a new feature
git checkout -b feature/your-feature-name

# Save your work
git add .
git commit -m "feat: description of change"
git push origin feature/your-feature-name

# Merge when done
git checkout main
git merge feature/your-feature-name
git push
```

**Branch naming convention:**
- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code improvements without behaviour change