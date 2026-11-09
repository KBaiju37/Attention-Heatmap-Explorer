from __future__ import annotations

import io
import json
import re
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas.export import ExportRequest

router = APIRouter(prefix="/export", tags=["Export"])


def _safe_name(value: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-_").lower()
    return sanitized[:60] or "attention-export"


def _validate(request: ExportRequest) -> np.ndarray:
    matrix = np.asarray(request.attention, dtype=np.float64)
    size = len(request.tokens)
    if matrix.shape != (size, size):
        raise HTTPException(status_code=422, detail="Attention matrix dimensions must match tokens")
    if not np.isfinite(matrix).all() or np.any(matrix < 0):
        raise HTTPException(status_code=422, detail="Attention values must be finite and non-negative")
    return matrix


@router.post("/{file_format}")
def export_attention(file_format: str, request: ExportRequest) -> Response:
    if file_format not in {"png", "svg", "json"}:
        raise HTTPException(status_code=422, detail="Format must be png, svg, or json")
    matrix = _validate(request)
    timestamp = datetime.now(timezone.utc).isoformat()
    name = _safe_name(request.model_id)
    filename = f"{name}-layer-{request.layer}-attention.{file_format}"
    if file_format == "json":
        payload = {
            "model_id": request.model_id,
            "model_name": request.model_name,
            "layer": request.layer,
            "head": request.head,
            "aggregation": request.aggregation,
            "tokens": request.tokens,
            "attention": matrix.tolist(),
            "exported_at": timestamp,
        }
        return Response(
            content=json.dumps(payload, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    output = io.BytesIO()
    figure_width = min(16, max(6, len(request.tokens) * 0.42))
    figure, axis = plt.subplots(figsize=(figure_width, figure_width * 0.8))
    heatmap = axis.imshow(matrix, cmap="magma", aspect="auto")
    axis.set_xticks(range(len(request.tokens)), labels=request.tokens, rotation=70, ha="right")
    axis.set_yticks(range(len(request.tokens)), labels=request.tokens)
    axis.set_xlabel("Key token")
    axis.set_ylabel("Query token")
    axis.set_title(
        f"{request.model_name} · layer {request.layer} · "
        f"{'mean heads' if request.head is None else f'head {request.head}'}"
    )
    figure.colorbar(heatmap, ax=axis, label="Attention weight")
    figure.tight_layout()
    if file_format == "png":
        figure.savefig(output, format=file_format, dpi=300)
    else:
        figure.savefig(output, format=file_format)
    plt.close(figure)
    content_type = "image/png" if file_format == "png" else "image/svg+xml"
    return Response(
        content=output.getvalue(),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
