from fastapi import APIRouter, HTTPException

from app.attention.inference import extract_attention
from app.core.exceptions import ModelLoadError
from app.schemas.comparison import ComparisonRequest, ComparisonResponse
from app.schemas.attention import AttentionResponse

router = APIRouter(prefix="/comparison", tags=["Comparison"])


@router.post(
    "",
    response_model=ComparisonResponse,
    summary="Compare BERT and GPT-2 attention",
    description=(
        "Runs the same text through BERT and GPT-2 sequentially on CPU. "
        "The models use different tokenizers, so their token positions and heatmap "
        "dimensions must be interpreted separately."
    ),
)
def compare_models(request: ComparisonRequest) -> ComparisonResponse:
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Text must not be blank")
    try:
        bert = AttentionResponse(
            **extract_attention("bert", request.text, request.layer, request.head, None)
        )
        gpt2 = AttentionResponse(
            **extract_attention("gpt2", request.text, request.layer, request.head, None)
        )
        return ComparisonResponse(
            bert=bert,
            gpt2=gpt2,
            note=(
                "The attention maps use each model's own tokenizer. Token positions are not "
                "aligned across models, and BERT's bidirectional attention is not directly "
                "equivalent to GPT-2's causal attention."
            ),
        )
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
