from pydantic import BaseModel, Field


class BertMaskRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=12000,
        json_schema_extra={"examples": ["The scientist presented the [MASK]."]},
    )
    top_k: int = Field(default=10, ge=1, le=50)


class GptNextRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=12000,
        json_schema_extra={"examples": ["The scientist presented the results"]},
    )
    top_k: int = Field(default=10, ge=1, le=50)


class TokenCandidate(BaseModel):
    token_id: int
    token: str
    display: str
    probability: float
    rank: int


class ProbabilityResponse(BaseModel):
    model_id: str
    model_name: str
    tokens: list[str]
    selected_position: int
    prediction_type: str
    candidates: list[TokenCandidate]
    vocabulary_size: int
    top_k_probability_mass: float
    truncated: bool
    note: str
