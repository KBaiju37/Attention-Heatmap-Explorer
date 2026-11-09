from pydantic import BaseModel, Field


class VisionResponse(BaseModel):
    model_id: str
    model_name: str
    image_width: int
    image_height: int
    patch_grid: int
    layer_count: int
    head_count: int
    layer: int
    head: int | None
    attention: list[list[float]]
    overlay_png: str
    note: str


class ClipRequest(BaseModel):
    candidates: list[str] = Field(min_length=1, max_length=50)


class ClipCandidate(BaseModel):
    text: str
    cosine_similarity: float
    rank: int


class ClipResponse(BaseModel):
    model_id: str
    model_name: str
    candidates: list[ClipCandidate]
    note: str
