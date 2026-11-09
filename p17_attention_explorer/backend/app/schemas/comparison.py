from pydantic import BaseModel, Field

from app.schemas.attention import AttentionResponse


class ComparisonRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=12000,
        json_schema_extra={"examples": ["The engineer explained the design."]},
    )
    layer: int = Field(default=0, ge=0)
    head: int | None = Field(default=None, ge=0)


class ComparisonResponse(BaseModel):
    bert: AttentionResponse
    gpt2: AttentionResponse
    note: str
