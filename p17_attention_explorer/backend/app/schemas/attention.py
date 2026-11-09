from typing import Literal

from pydantic import BaseModel, Field


class AttentionRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=12000,
        json_schema_extra={"examples": ["The researcher reviewed the results."]},
    )
    layer: int = Field(default=0, ge=0)
    head: int | None = Field(default=None, ge=0)
    query_token: int | None = Field(default=None, ge=0)


class AttentionPair(BaseModel):
    query_index: int
    query_token: str
    key_index: int
    key_token: str
    score: float


class AttentionResponse(BaseModel):
    model_id: str
    model_name: str
    tokens: list[str]
    layer_count: int
    head_count: int
    layer: int
    head: int | None
    aggregation: Literal["single_head", "mean_heads"]
    attention: list[list[float]]
    query_distribution: list[float] | None
    query_entropy: float | None
    top_pairs: list[AttentionPair]
    truncated: bool
    scientific_note: str
