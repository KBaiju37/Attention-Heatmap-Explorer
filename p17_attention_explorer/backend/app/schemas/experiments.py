from pydantic import BaseModel, Field


class BiasRequest(BaseModel):
    occupations: list[str] = Field(
        default=["doctor", "engineer", "nurse", "teacher", "scientist", "pilot", "programmer", "receptionist"],
        min_length=1,
        max_length=8,
    )
    pronouns: list[str] = Field(default=["he", "she", "they"], min_length=2, max_length=3)


class BiasObservation(BaseModel):
    template_id: str
    occupation: str
    pronoun: str
    sentence: str
    occupation_tokens: list[str]
    pronoun_tokens: list[str]
    attention_occupation_to_pronoun: float
    attention_pronoun_to_occupation: float


class BiasSummary(BaseModel):
    occupation: str
    pronoun: str
    sample_count: int
    mean_occupation_to_pronoun: float
    mean_pronoun_to_occupation: float


class BiasResponse(BaseModel):
    model_id: str
    model_name: str
    observations: list[BiasObservation]
    summaries: list[BiasSummary]
    note: str


class ExplainRequest(BaseModel):
    tokens: list[str] = Field(min_length=1, max_length=256)
    attention: list[list[float]]
    query_index: int = Field(ge=0)
    layer: int = Field(ge=0)
    head: int | None = Field(default=None, ge=0)


class ExplainResponse(BaseModel):
    source: str
    explanation: str
    note: str
