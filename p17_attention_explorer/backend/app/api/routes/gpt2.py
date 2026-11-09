from fastapi import APIRouter, HTTPException

from app.attention.inference import extract_attention, gpt2_next_token_probabilities
from app.core.exceptions import ModelLoadError
from app.schemas.attention import AttentionRequest, AttentionResponse
from app.schemas.probability import GptNextRequest, ProbabilityResponse

router = APIRouter(prefix="/gpt2", tags=["GPT-2"])


@router.post(
    "/attention",
    response_model=AttentionResponse,
    summary="Extract GPT-2 causal attention",
    description="Runs GPT-2 small on CPU and validates that future positions receive no attention.",
)
def post_attention(request: AttentionRequest) -> AttentionResponse:
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be blank")
    try:
        return AttentionResponse(
            **extract_attention(
                "gpt2",
                request.text,
                request.layer,
                request.head,
                request.query_token,
            )
        )
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/probabilities",
    response_model=ProbabilityResponse,
    summary="Predict the next GPT-2 token",
    description="Returns top-k vocabulary probabilities from the final context position.",
)
def post_probabilities(request: GptNextRequest) -> ProbabilityResponse:
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be blank")
    try:
        return ProbabilityResponse(
            **gpt2_next_token_probabilities(request.text, request.top_k)
        )
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
