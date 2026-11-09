from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import MAX_IMAGE_BYTES
from app.core.exceptions import InvalidImageError, ModelLoadError
from app.models.model_manager import model_manager
from app.schemas.vision import ClipCandidate, ClipResponse, VisionResponse
from app.vision.images import run_vit_attention

router = APIRouter(prefix="/vision", tags=["Vision"])


@router.post(
    "/attention",
    response_model=VisionResponse,
    summary="Extract ViT patch attention",
    description="Validates an image upload, runs ViT on CPU, and returns CLS-to-patch attention plus an overlay.",
)
def post_vit_attention(
    file: UploadFile = File(...),
    layer: int = Form(default=0, ge=0),
    head: int | None = Form(default=None, ge=0),
) -> VisionResponse:
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the upload size limit")
    try:
        return VisionResponse(**run_vit_attention(data, layer, head))
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/clip",
    response_model=ClipResponse,
    summary="Rank CLIP text candidates",
    description="Returns cosine similarity between CLIP's separate image and text encoders; scores are not probabilities.",
)
def post_clip_similarity(
    file: UploadFile = File(...),
    candidates: list[str] = Form(...),
) -> ClipResponse:
    from app.vision.images import open_valid_image

    if not 1 <= len(candidates) <= 50:
        raise HTTPException(status_code=422, detail="Provide between 1 and 50 text candidates")
    if any(not candidate.strip() or len(candidate) > 512 for candidate in candidates):
        raise HTTPException(
            status_code=422,
            detail="Each text candidate must contain 1 to 512 non-whitespace characters",
        )
    candidates = [candidate.strip() for candidate in candidates]
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the upload size limit")
    try:
        image = open_valid_image(data)
        with model_manager.using("clip", "clip") as loaded:
            import torch
            import torch.nn.functional as functional

            inputs = loaded.processor(
                text=candidates,
                images=image,
                return_tensors="pt",
                padding=True,
                truncation=True,
            )
            with torch.inference_mode():
                output = loaded.model(**inputs)
                image_features = functional.normalize(output.image_embeds.float(), dim=-1)
                text_features = functional.normalize(output.text_embeds.float(), dim=-1)
                similarities = (image_features @ text_features.T)[0]
            ranked = sorted(
                zip(candidates, similarities.tolist(), strict=True),
                key=lambda item: item[1],
                reverse=True,
            )
            return ClipResponse(
                model_id="clip",
                model_name=loaded.model.config.name_or_path,
                candidates=[
                    ClipCandidate(text=text, cosine_similarity=score, rank=index)
                    for index, (text, score) in enumerate(ranked, start=1)
                ],
                note=(
                    "These are cosine similarities between separate CLIP image and text encoders. "
                    "They are not probabilities and do not represent direct text-image cross-attention."
                ),
            )
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
