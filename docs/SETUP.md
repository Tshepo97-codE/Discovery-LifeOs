# Environment Setup Guide

> Complete setup from a fresh Windows 11 machine to a running development environment.
> Estimated time: **20–30 minutes** (mostly download time).

---

## Prerequisites — install these first

### 1. Git
Download from **[git-scm.com](https://git-scm.com/download/win)** and install with default options.

Verify:
```bash
git --version
# Should print: git version 2.x.x
```

### 2. Python 3.11
Download from **[python.org/downloads](https://www.python.org/downloads/)**.

> ⚠️ **Critical:** During installation, tick **"Add Python to PATH"** before clicking Install.

Verify:
```bash
python --version
# Should print: Python 3.11.x
```

### 3. Node.js 20 LTS
Download from **[nodejs.org](https://nodejs.org/)** — choose the **LTS** version.

Verify:
```bash
node --version   # Should print: v20.x.x
npm --version    # Should print: 10.x.x
```

### 4. VSCode
Download from **[code.visualstudio.com](https://code.visualstudio.com/)**.

---

## VSCode extensions

Open VSCode, press `Ctrl+Shift+X` to open Extensions, and install these:

### Essential
| Extension | Publisher | Why |
|---|---|---|
| **Python** | Microsoft | IntelliSense, linting, debugging for all ML/backend code |
| **Pylance** | Microsoft | Fast Python type checking and autocomplete |
| **GitLens** | GitKraken | See git history inline, blame, branch visualization |
| **GitHub Pull Requests** | GitHub | Manage PRs without leaving VSCode |

### Frontend
| Extension | Publisher | Why |
|---|---|---|
| **ES7+ React Snippets** | dsznajder | React boilerplate in seconds |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Autocomplete for all Tailwind classes |
| **Prettier** | Prettier | Auto-format JS/JSX on save |

### Productivity
| Extension | Publisher | Why |
|---|---|---|
| **Thunder Client** | Rangav | Test FastAPI endpoints inside VSCode (like Postman) |
| **Better Comments** | Aaron Bond | Colour-coded TODO/FIXME/NOTE comments |
| **Error Lens** | Alexander | Inline error highlighting |
| **Auto Rename Tag** | Jun Han | Renames paired HTML/JSX tags simultaneously |
| **DotENV** | mikestead | Syntax highlighting for .env files |

### Install all at once (paste in terminal)
```bash
code --install-extension ms-python.python
code --install-extension ms-python.pylance
code --install-extension eamodio.gitlens
code --install-extension GitHub.vscode-pull-request-github
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension rangav.vscode-thunder-client
code --install-extension aaron-bond.better-comments
code --install-extension usernamehw.errorlens
code --install-extension formulahendry.auto-rename-tag
code --install-extension mikestead.dotenv
```

---

## VSCode workspace settings

Create `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.python",
    "editor.formatOnSave": true
  },
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/Scripts/python.exe",
  "editor.tabSize": 2,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/node_modules": true,
    "**/.venv": true
  },
  "emmet.includeLanguages": { "javascript": "javascriptreact" },
  "tailwindCSS.includeLanguages": { "javascript": "javascript", "html": "HTML" },
  "editor.wordWrap": "on",
  "terminal.integrated.defaultProfile.windows": "Git Bash"
}
```

---

## Clone the repository

```bash
# Open Git Bash or VSCode terminal (Ctrl+`)
cd C:\Users\YourName\Projects    # or wherever you keep code

git clone https://github.com/YOUR_USERNAME/discovery-lifeos.git
cd discovery-lifeos

# Open in VSCode
code .
```

---

## Backend — Python virtual environment

```bash
# From the project root in VSCode terminal
cd backend

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# You should now see (venv) at the start of your terminal line

# Install dependencies
pip install -r requirements.txt
```

> 💡 **VSCode tip:** After creating the venv, press `Ctrl+Shift+P` → "Python: Select Interpreter" → choose the one inside `backend/venv/`.

### Set up environment variables

```bash
# Copy the template
copy .env.example .env

# Open .env in VSCode and fill in your Gemini API key
# Get a FREE key at: https://aistudio.google.com
```

Your `backend/.env` should look like:
```
GEMINI_API_KEY=AIzaSy...your-key-here
ENVIRONMENT=development
PORT=8000
```

---

## ML pipeline — generate data and train models

```bash
# From the project root (not inside backend/)
cd ..   # back to project root

# Create a separate venv for ML (or reuse backend venv)
cd ml

# Install ML dependencies (in the backend venv or a new one)
pip install pandas numpy scikit-learn xgboost shap faker matplotlib --break-system-packages

# Generate synthetic data
python synthetic_data_generator.py

# Train the risk model
python risk_model.py
```

You should see output ending with:
```
✅ Data generation complete.
✅ Step 2 complete. Ready for Step 3 — FastAPI backend.
```

And these files created in `ml/data/`:
- `combined_signals.csv`
- `model_risk_regressor.json`
- `model_early_warning.json`
- `model_feature_names.json`
- `model_evaluation.json`

---

## Frontend — Node dependencies

```bash
# From the project root
cd frontend

npm install
```

This installs React, Vite, Tailwind, Recharts, and all other dependencies (~200MB in node_modules).

---

## Gemini API key — free setup

1. Go to **[aistudio.google.com](https://aistudio.google.com)**
2. Sign in with your Google account
3. Click **"Get API key"** in the left sidebar
4. Click **"Create API key"**
5. Copy the key (starts with `AIza...`)
6. Paste it into `backend/.env` as `GEMINI_API_KEY=...`

**Free tier limits:** 1,500 requests/day, 1M tokens/minute. More than sufficient for development and demos.

---

## Verify everything is ready

Run this checklist before your first full start:

```bash
# ✅ Python version
python --version          # 3.11.x

# ✅ Node version  
node --version            # v20.x.x

# ✅ Backend venv active
cd backend
venv\Scripts\activate
python -c "import fastapi, xgboost; print('backend deps OK')"

# ✅ ML data exists
ls ..\ml\data\            # should list 6+ files

# ✅ Gemini key is set
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('Key set:', bool(os.getenv('GEMINI_API_KEY')))"

# ✅ Frontend deps installed
cd ..\frontend
ls node_modules           # should exist
```

---

## Next step

→ **[RUNNING.md](RUNNING.md)** — how to start the full stack and run the project