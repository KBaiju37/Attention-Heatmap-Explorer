from fastapi import APIRouter

from app.models.model_manager import model_manager
from app.schemas.models import ModelsResponse

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=ModelsResponse)
def get_models() -> ModelsResponse:
    active_model_id, models = model_manager.statuses()
    return ModelsResponse(device=model_manager.device, active_model_id=active_model_id, models=models)
