#!/usr/bin/env bash
set -euo pipefail

python -m venv backend/.venv
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/python -m pip install \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  -r backend/requirements.txt
npm --prefix frontend ci
