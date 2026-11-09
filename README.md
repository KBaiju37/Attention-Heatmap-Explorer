# Attention Heatmap Explorer

A CPU-first research workspace for exploring real Transformer attention and prediction outputs across text and vision models. The React and TypeScript frontend communicates with a FastAPI backend. Model weights are loaded only when a model-backed feature is requested; the application does not replace inference results with fabricated data.

## Features

- Inspect BERT or GPT-2 attention by token, layer, and head.
- Explore masked-token or next-token probabilities.
- Compare BERT and GPT-2 outputs while preserving each model's tokenization.
- Visualize ViT image-patch attention and inspect model hooks.
- Run exploratory bias investigations and export attention data as PNG, SVG, or JSON.
- View backend health and model inventory from the dashboard.

Attention weights describe a model's forward pass; they are not, by themselves, proof of causal reasoning. Model inference runs on CPU. The first request for a model may download its weights and requires network access, disk space, and sufficient RAM.

## Project layout

The application source and full setup guide are in [`p17_attention_explorer/`](./p17_attention_explorer/):

- `frontend/` — React, TypeScript, Webpack, and Jest
- `backend/` — FastAPI, PyTorch, Transformers, and pytest
- `docs/` — architecture and implementation notes

See the [full project README](./p17_attention_explorer/README.md) for detailed Windows and GitHub Codespaces setup instructions, API documentation, configuration, and troubleshooting.

## Quick start on Windows

Run these commands from the repository root in PowerShell. Backend packages are installed in the project's virtual environment, not globally:

```powershell
Set-Location p17_attention_explorer
py -3.14 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location frontend
npm ci
```

In one PowerShell terminal, start the backend:

```powershell
Set-Location p17_attention_explorer\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, start the frontend:

```powershell
Set-Location p17_attention_explorer\frontend
npm run dev
```

Open the frontend at <http://127.0.0.1:5173>. Backend health is at <http://127.0.0.1:8000/api/health>, model inventory at <http://127.0.0.1:8000/api/models>, and interactive API documentation at <http://127.0.0.1:8000/docs>.

## Tests and build

From `p17_attention_explorer\backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

From `p17_attention_explorer\frontend`:

```powershell
npm test -- --runInBand
npm run build
```

The backend tests use controlled fixtures and do not download model checkpoints. In a local verification, all 31 backend tests and 10 frontend tests passed, and the production build succeeded. A live BERT attention request also succeeded; live inference for GPT-2, ViT, and CLIP was not verified. The production build reports that its main JavaScript bundle exceeds Webpack's recommended size, so code-splitting or lazy-loading the charting library may improve initial load time.
