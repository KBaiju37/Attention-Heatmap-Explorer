# P17 — Attention Heatmap Explorer

P17 is a CPU-first research workspace for inspecting real Transformer attention and prediction outputs across text and vision models. The React client talks to a FastAPI backend. Model weights are loaded lazily only when a model-backed action is requested; setup does not download weights, and the application never substitutes fabricated inference results.

## Technology

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript 5, Webpack 5, Tailwind CSS 3 |
| Navigation and UI | React Router 7, Lucide React |
| API and charts | Axios, Plotly.js |
| Backend | FastAPI, Uvicorn, Pydantic 2 |
| Models and image processing | PyTorch, Transformers, NumPy, Pillow, Matplotlib |
| Tests | pytest, HTTPX, Jest, React Testing Library |

Dependency versions are pinned in `backend/requirements.txt` and `frontend/package.json`; npm resolutions are locked in `frontend/package-lock.json`. The Codespaces image uses Python 3.12 and Node 22. Locally, use a supported Python version in the isolated backend environment. There is no CUDA or NVIDIA requirement.

## Project structure

```text
p17_attention_explorer/
├── .devcontainer/             # GitHub Codespaces image, ports, and setup
├── backend/
│   ├── app/
│   │   ├── api/routes/        # Health, models, inference, experiments, exports
│   │   ├── attention/         # Text inference, processing, and hooks
│   │   ├── core/              # Configuration and application errors
│   │   ├── models/            # Lazy CPU model lifecycle manager
│   │   ├── schemas/           # Typed API request and response schemas
│   │   └── vision/            # Image validation and patch overlays
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/components/        # Shared layouts, workbenches, visualizations
│   ├── src/pages/             # Dashboard and analysis workspaces
│   ├── src/services/api.ts    # Central Axios API client
│   └── src/types/api.ts       # API data contracts
├── docs/
│   ├── architecture.md
│   └── implementation_plan.md
└── scripts/start-dev.sh       # Starts both services in Codespaces/Linux
```

## Run locally on Windows PowerShell

Commands below are run from the project root unless noted. Backend packages are installed only into `backend\.venv`.

Create and install the backend environment:

```powershell
py -3.14 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

If Python 3.14 is unavailable or a pinned wheel cannot be installed, use an installed Python release supported by the pinned packages; do not install packages globally. Activation is optional. When desired, in a PowerShell session where activation is permitted:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

The root `.env.example` lists optional backend environment variables. In PowerShell, set any desired variables in the backend terminal before launching Uvicorn, for example:

```powershell
$env:P17_ENVIRONMENT = "development"
$env:P17_MODEL_CACHE_DIR = "..\model_cache"
```

Install frontend packages locally:

```powershell
Set-Location frontend
npm ci
Copy-Item .env.example .env
```

The frontend example sets `VITE_API_BASE_URL=http://127.0.0.1:8000` for local use. In Codespaces, leave the variable unset or blank so the browser derives the backend forwarded hostname.

Start the backend in one PowerShell terminal:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
Set-Location frontend
npm run dev
```

Open:

- Frontend: <http://127.0.0.1:5173>
- Health: <http://127.0.0.1:8000/api/health>
- Model inventory: <http://127.0.0.1:8000/api/models>
- Interactive API documentation: <http://127.0.0.1:8000/docs>

The dashboard fetches health and model inventory from the live API. It displays loading, connected, and unavailable states based on the request result.

## GitHub Codespaces

Open this repository in a Codespace and wait for the devcontainer post-create setup to finish. It creates a Linux virtual environment, installs backend dependencies with the PyTorch CPU wheel index, and runs `npm ci`. Start both services from the project root:

```bash
bash scripts/start-dev.sh
```

Open the forwarded port 5173 for the UI. The UI derives the API hostname on forwarded port 8000, and the backend accepts only the corresponding `*.app.github.dev` frontend-origin pattern while `CODESPACES=true`. Both ports are configured private by default; change visibility only through the Codespaces port controls if access is needed. The devcontainer setup downloads dependencies but not model checkpoints. The first inference request may download weights to `model_cache/`.

Local run commands, Codespaces settings, and environment values are also described in `.devcontainer/devcontainer.json`, `.devcontainer/post-create.sh`, `.env.example`, and `frontend/.env.example`.

## Available workspaces and API

| Workspace | Backend operation | Function |
|---|---|---|
| Text attention | `POST /api/bert/attention`, `POST /api/gpt2/attention` | Actual selected-layer/head attention values |
| Probability explorer | `POST /api/bert/probabilities`, `POST /api/gpt2/probabilities` | BERT masked-token or GPT-2 next-token vocabulary probabilities |
| Model comparison | `POST /api/comparison` | Sequential BERT and GPT-2 inference, preserving separate token axes |
| Image attention | `POST /api/vision/attention` | Validated image upload and ViT patch attention/overlay |
| Hook inspector | `POST /api/hooks/{model_id}/{layer}` | Captured PyTorch module outputs with guarded interpretation |
| Bias investigation | `POST /api/experiments/bias` | Attention observations for user-edited sentence sets; exploratory only |
| Export center | `POST /api/export/{png,svg,json}` | Export supplied attention values |
| Dashboard | `GET /api/health`, `GET /api/models` | Live service health and model/cache inventory |

Every model-dependent page reports API errors rather than displaying generated placeholder results. Request and response schemas, examples, validation limits, and error responses are available through `/docs`. BERT and GPT-2 tokenizers differ; their maps must not be interpreted as aligned token positions.

## Model loading, hardware, and safety

Inference runs on CPU and the model manager keeps at most one model resident to reduce memory use. Weights are loaded only after an explicit model request and cached under the ignored `model_cache/` directory. First inference needs network access to the configured Hugging Face model repository, disk space, and sufficient RAM.

On some Windows systems, Application Control may block a native dependency required by Transformers (for example `regex._regex`). In that case, health and model inventory remain available and inference returns a visible error; do not disable or bypass Windows security controls. Use the supported Codespaces/Linux environment or request review through the organization's approved software-allow process. The project does not weaken system policy.

## Tests and build

Backend, from the project root:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -v
```

Frontend, from `frontend`:

```powershell
npm test
npx tsc -b
npm run build
npm audit
```

The backend tests use controlled unit fixtures for deterministic route behavior and validate request limits, image validation, exports, attention processing, and model-load errors. They do not download checkpoints or claim live model inference. Frontend tests cover the dashboard, navigation, API URL resolution, probability masking, image input validation, side-by-side comparison, and the attention export request flow. A successful mocked test suite does not prove that pretrained model inference is available on a given host.

## Scientific limitations

Attention weights describe internal routing for a particular forward pass. They are not, on their own, faithful explanations or proof of causal reasoning. BERT and GPT-2 use different objectives and tokenizers; head selection and aggregation affect the view. Image attention maps do not establish which pixels caused a prediction. CLIP similarity is not cross-attention. Small occupation/pronoun experiments are exploratory and cannot establish model bias. Caveats accompany the corresponding outputs.

## Scope and next work

This project includes the foundation and CPU-first text/vision workspaces. Optional generated explanations, additional integration/visual testing, and future model or interpretability work are not claimed as complete. No pretrained weights, generated model outputs, exports, or secrets belong in source control.
