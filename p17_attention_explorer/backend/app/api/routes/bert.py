from fastapi import APIRouter, HTTPException

from app.attention.inference import bert_masked_probabilities, extract_attention
from app.core.exceptions import ModelLoadError
from app.schemas.attention import AttentionRequest, AttentionResponse
from app.schemas.probability import BertMaskRequest, ProbabilityResponse

router = APIRouter(prefix="/bert", tags=["BERT"])


@router.post(
    "/attention",
    response_model=AttentionResponse,
    summary="Extract BERT attention",
    description="Runs BERT base uncased on CPU and returns its real attention matrix for the requested layer and head.",
)
def post_attention(request: AttentionRequest) -> AttentionResponse:
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be blank")
    try:
        return AttentionResponse(
            **extract_attention(
                "bert",
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
    summary="Predict a BERT masked token",
    description="Requires exactly one [MASK] token and returns top-k vocabulary softmax probabilities.",
)
def post_probabilities(request: BertMaskRequest) -> ProbabilityResponse:
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be blank")
    try:
        return ProbabilityResponse(**bert_masked_probabilities(request.text, request.top_k))
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
