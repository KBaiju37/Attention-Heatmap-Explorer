#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

if [[ ! -x backend/.venv/bin/python ]]; then
  echo "Backend environment is missing. Run bash .devcontainer/post-create.sh first." >&2
  exit 1
fi

if [[ ! -x frontend/node_modules/.bin/webpack ]]; then
  echo "Frontend dependencies are missing. Run npm --prefix frontend ci first." >&2
  exit 1
fi

export P17_MODEL_CACHE_DIR="${P17_MODEL_CACHE_DIR:-$ROOT_DIR/model_cache}"
export P17_ENVIRONMENT="${P17_ENVIRONMENT:-development}"

backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 &
backend_pid=$!
npm --prefix frontend run dev -- --host 0.0.0.0 &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$backend_pid" "$frontend_pid"
