import os
from pathlib import Path

APP_NAME = "P17 Attention Heatmap Explorer"
APP_VERSION = "0.1.0"
ENVIRONMENT = os.getenv("P17_ENVIRONMENT", "development")
CORS_ORIGINS = tuple(
    origin.strip()
    for origin in os.getenv(
        "P17_CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",")
    if origin.strip()
)
CODESPACES_CORS_ORIGIN_REGEX = r"^https://[a-z0-9-]+-5173\.app\.github\.dev$"
CORS_ORIGIN_REGEX = (
    CODESPACES_CORS_ORIGIN_REGEX
    if os.getenv("CODESPACES", "").lower() == "true"
    else None
)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_CACHE_DIR = Path(
    os.getenv("P17_MODEL_CACHE_DIR", str(PROJECT_ROOT / "model_cache"))
).resolve()
MAX_TEXT_CHARACTERS = int(os.getenv("P17_MAX_TEXT_CHARACTERS", "12000"))
MAX_SEQUENCE_LENGTH = int(os.getenv("P17_MAX_SEQUENCE_LENGTH", "128"))
MAX_IMAGE_BYTES = int(os.getenv("P17_MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))

os.environ.setdefault("HF_HOME", str(MODEL_CACHE_DIR))
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
