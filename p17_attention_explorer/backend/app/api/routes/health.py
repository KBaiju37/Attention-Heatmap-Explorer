from fastapi import APIRouter

from app.core.config import APP_NAME, APP_VERSION, ENVIRONMENT
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        application=APP_NAME,
        status="healthy",
        version=APP_VERSION,
        environment=ENVIRONMENT,
    )
