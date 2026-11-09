# Implementation status

## Project foundation and Codespaces

- FastAPI app, configuration, local and Codespaces CORS, Pydantic response schemas, live health endpoint, and backend tests.
- React/TypeScript/Tailwind dashboard with routed research workspaces and live backend/model-status requests.
- Python 3.12 + Node 22 Linux devcontainer, forwarded-port API routing, CPU-only PyTorch setup, and a two-service launch script.

## CPU-first inference workspaces

- Lazy BERT attention and masked-token probabilities.
- Lazy GPT-2 causal attention and next-token probabilities.
- Side-by-side BERT/GPT-2 attention comparison with separate tokenization.
- ViT patch attention with upload validation and an attention overlay.
- CLIP image/text cosine-similarity ranking using separate encoders.
- PyTorch module hooks with cleanup and guarded interpretation of attention outputs.
- Matched occupation/pronoun attention observations and deterministic summaries.
- PNG, SVG, and JSON exports from actual attention data.

## Remaining work

- Optional LLM-generated explanations, if a provider and privacy constraints are explicitly selected.
- Exercise the devcontainer setup and real inference in an actual Codespace; a local test suite does not establish that an external model download or inference will succeed there.
- Additional browser-level integration and UI coverage for model-dependent paths.
- On the Windows host, Application Control blocks native modules required for model inference. The frontend uses Webpack and Tailwind CSS 3, rather than Rollup, to avoid the separately blocked Rollup binary.

No pretrained model weights are committed or fetched during setup. First inference may download model files to the ignored local cache; running each model's inference remains an explicit user action.
