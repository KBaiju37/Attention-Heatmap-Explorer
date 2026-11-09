from typing import Literal

from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    model_id: str = Field(min_length=1, max_length=80)
    model_name: str = Field(min_length=1, max_length=120)
    tokens: list[str] = Field(min_length=1, max_length=128)
    attention: list[list[float]] = Field(
        max_length=128,
        json_schema_extra={"examples": [[[1.0, 0.0], [0.25, 0.75]]]},
    )
    layer: int = Field(ge=0)
    head: int | None = Field(default=None, ge=0)
    aggregation: str = Field(max_length=40)


class ExportFormat(BaseModel):
    format: Literal["png", "svg", "json"]
