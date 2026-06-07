# Discovery LifeOS

> **Unified Predictive Behavioural Intelligence Platform**
> GradHack 2026 — Discovery Group

LifeOS is an AI-powered behavioural intelligence layer that predicts wellness decline, nutrition drift, and mobility risk **before** negative outcomes occur — then delivers personalised, contextual interventions through Discovery's existing ecosystem (Vitality, HealthyFood, Insure).

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────┐
│                   React Dashboard                   │  ← localhost:5173
│         (Vite + Tailwind + Recharts)                │
└────────────────────┬────────────────────────────────┘
                     │ REST + SSE
┌────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                    │  ← localhost:8000
│         (Python · XGBoost · Gemini AI)              │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  ML Models  │          │   Gemini API    │
│  (XGBoost)  │          │  (free tier)    │
└──────┬──────┘          └─────────────────┘
       │
┌──────▼──────┐
│  CSV Data   │
│  (ml/data/) │
└─────────────┘
```

---

## Project structure

```
discovery-lifeos/
├── backend/                  # FastAPI backend
│   ├── main.py               # All API routes (10 endpoints)
│   ├── ai_service.py         # Gemini AI integration
│   ├── model_inference.py    # XGBoost risk model loader
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables template
│
├── frontend/                 # React + Vite dashboard
│   ├── src/
│   │   ├── App.jsx           # Routing + nav shell
│   │   ├── api.js            # Axios + EventSource calls
│   │   ├── components.jsx    # Shared UI components
│   │   ├── CounterfactualChart.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── UsersPage.jsx
│   │       └── UserDetail.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── ml/                       # Machine learning pipeline
│   ├── synthetic_data_generator.py
│   ├── risk_model.py
│   └── data/                 # Generated files (git-ignored)
│       ├── combined_signals.csv
│       ├── model_risk_regressor.json
│       ├── model_early_warning.json
│       ├── model_feature_names.json
│       └── model_evaluation.json
│
├── docs/                     # Documentation
│   ├── SETUP.md              # Environment setup guide
│   ├── RUNNING.md            # Step-by-step run guide
│   └── demo_script.html      # Interactive demo script
│
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI/CD pipeline
│
├── docker-compose.yml        # Run entire stack with one command
├── .gitignore
└── README.md                 # This file
```

---

## Quick start (3 commands)

```bash
# 1. Clone and enter the project
git clone https://github.com/YOUR_USERNAME/discovery-lifeos.git
cd discovery-lifeos

# 2. Start with Docker (recommended)
docker compose up --build

# 3. Open in browser
#    Dashboard → http://localhost:5173
#    API docs  → http://localhost:8000/docs
```

> **No Docker?** See [docs/SETUP.md](docs/SETUP.md) for the manual setup guide.

---

## Model performance

| Metric | Value | Description |
|---|---|---|
| Risk Score MAE | **2.29** | Average prediction error (0–100 scale) |
| Risk Score R² | **0.907** | Variance explained by model |
| Early Warning AUC | **0.988** | 7-day advance detection accuracy |
| Early Warning F1 | **0.857** | Precision × recall balance |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML | XGBoost, scikit-learn, SHAP, Prophet |
| AI | Google Gemini 2.0 Flash (free tier) |
| Data | Pandas, NumPy, Faker |
| DevOps | Docker, GitHub Actions |

---

## Documentation

- **[Environment setup →](docs/SETUP.md)** — VSCode, Python, Node, extensions
- **[Running the project →](docs/RUNNING.md)** — step-by-step run guide
- **[Demo script →](docs/demo_script.html)** — open in browser

---
## Screenshots

### Platform Dashboard
![Dashboard](https://raw.githubusercontent.com/Tshepo97-codE/discovery-lifeos/main/docs/screenshots/01_dashboard.jpeg)

### Behavioural Timeline
![Timeline](https://raw.githubusercontent.com/Tshepo97-codE/discovery-lifeos/main/docs/screenshots/02_user_timeline.png)

### AI Risk Explanation (live streaming)
![AI Explanation](https://raw.githubusercontent.com/Tshepo97-codE/discovery-lifeos/main/docs/screenshots/03_ai_explanation.png)

### Counterfactual Impact
![Counterfactual](https://raw.githubusercontent.com/Tshepo97-codE/discovery-lifeos/main/docs/screenshots/04_counterfactual.png)

### Monitored Users
![Users](https://raw.githubusercontent.com/Tshepo97-codE/discovery-lifeos/main/docs/screenshots/05_users_list.png)

## Licence

Built for Discovery GradHack 2024. All rights reserved.
