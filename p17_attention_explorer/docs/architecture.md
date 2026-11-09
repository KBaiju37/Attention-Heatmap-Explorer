# Architecture

P17 separates a browser-based React client from a Python inference API. The frontend calls FastAPI over HTTP. Checkpoints are loaded lazily by the backend only when an inference route is requested; the API does not expose fabricated predictions or attention matrices.

## Backend

- `app/core/config.py` owns application metadata, CORS origins, resource limits, and the project-local Hugging Face cache directory.
- `app/api/routes/` exposes health, model inventory, BERT, GPT-2, vision, hook, experiment, and export APIs.
- `app/schemas/` validates requests and shapes responses.
- `app/models/model_manager.py` serializes access to model loading and inference, runs on CPU, and keeps at most one model resident.
- `app/attention/` contains text inference, tensor validation/summary, and temporary PyTorch hooks.
- `app/vision/` validates image uploads and derives ViT patch overlays.
- `ModelLoadError` is returned as an explicit service-unavailable response. Invalid inputs return client errors with useful detail.

`GET /api/health` is independent of model loading. `GET /api/models` reports active memory state and checkpoint cache state. A model is considered cached only if both its configuration and a supported weight artifact are locally available. Model state is not inferred from frontend assumptions.

## Frontend

`App.tsx` composes React Router routes and fetches the real health and model-inventory endpoints. Model inventory refreshes sequentially to avoid piling up requests while the backend is unavailable. The dashboard renders the returned backend state, including failures.

`AppLayout`, `PageLayout`, and the common workbench/visualization components provide consistent navigation and presentation. `services/api.ts` is the Axios boundary; `types/api.ts` defines API data contracts. Text, probability, comparison, image, hook, bias, and export pages submit actual requests and only display output returned by the backend.

Webpack serves the React/TypeScript application and creates production assets. Tailwind CSS 3 is processed through PostCSS, avoiding native Rollup and Tailwind Oxide modules. Jest with jsdom runs the frontend tests without Vite. The dashboard and research workspace styles use semantic CSS classes in `src/index.css`. Plotly renders returned attention, probability, and experiment values only.

The devcontainer selects Python 3.12 and Node 22. Its post-create hook builds a local backend virtual environment, installs the CPU PyTorch wheel and locked frontend packages, but does not fetch model weights. `scripts/start-dev.sh` binds both services to the Codespaces container interface. In Codespaces, frontend API resolution maps the forwarded 5173 hostname to 8000, and FastAPI enables a narrowly scoped forwarded-origin regular expression only when `CODESPACES=true`. Locally, the API defaults to `http://127.0.0.1:8000`.

## Model lifecycle and safety

1. Server startup imports route and schema code but does not instantiate pretrained model weights.
2. The first request for a model enters the serialized model manager and downloads/loads its checkpoint if needed.
3. Inference runs on CPU under `torch.inference_mode()`.
4. On model switch, the previously active model is released before loading the next one.
5. Uploaded images and text are bounded; accepted image types and dimensions are validated before image-model inference.

The local checkpoint cache and generated exports are excluded from Git. No credentials or external LLM provider are required.

## API surface

- `GET /api/health`, `GET /api/models`
- `POST /api/bert/attention`, `POST /api/bert/probabilities`
- `POST /api/gpt2/attention`, `POST /api/gpt2/probabilities`
- `POST /api/comparison` runs BERT and GPT-2 sequentially and returns separate tokenizations.
- `POST /api/vision/attention`, `POST /api/vision/clip`
- `POST /api/hooks/{model_id}/{layer}`
- `POST /api/experiments/bias`, `POST /api/experiments/explain`
- `POST /api/export/{file_format}` for PNG, SVG, or JSON.

FastAPI's `/docs` provides interactive schemas and endpoint descriptions. Export endpoints render the attention data included in the request; they do not trigger inference. Comparison responses explicitly warn that BERT and GPT-2 positions are not aligned.

## Scientific interpretation

Attention weights are reported as observations of a forward pass, not as proof of causal reasoning or faithful explanations. GPT-2 causal masking, BERT masked prediction, tokenizer differences, ViT patch attention, CLIP's separate encoders, and exploratory bias probes are described with their respective caveats in the UI and API.
