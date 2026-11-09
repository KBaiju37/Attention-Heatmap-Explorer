from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

from app.api.routes.bert import router as bert_router
from app.api.routes.comparison import router as comparison_router
from app.api.routes.export import router as export_router
from app.api.routes.experiments import router as experiments_router
from app.api.routes.gpt2 import router as gpt2_router
from app.api.routes.health import router as health_router
from app.api.routes.hooks import router as hooks_router
from app.api.routes.models import router as models_router
from app.api.routes.vision import router as vision_router
from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS, CORS_ORIGIN_REGEX
from app.core.exceptions import ModelLoadError

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(bert_router, prefix="/api")
app.include_router(comparison_router, prefix="/api")
app.include_router(gpt2_router, prefix="/api")
app.include_router(vision_router, prefix="/api")
app.include_router(hooks_router, prefix="/api")
app.include_router(experiments_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.exception_handler(ModelLoadError)
async def model_load_error_handler(_request: Request, exc: ModelLoadError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})
