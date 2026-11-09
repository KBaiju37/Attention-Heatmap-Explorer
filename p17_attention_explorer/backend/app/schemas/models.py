from typing import Literal

from pydantic import BaseModel

ModelState = Literal["not_downloaded", "cached", "downloading", "loading", "ready", "error"]


class ModelStatus(BaseModel):
    id: str
    name: str
    checkpoint: str
    purpose: str
    state: ModelState
    detail: str | None = None


class ModelsResponse(BaseModel):
    device: str
    active_model_id: str | None
    models: list[ModelStatus]
