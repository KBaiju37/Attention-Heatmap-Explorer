from __future__ import annotations

import io
import warnings
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.config import MAX_IMAGE_BYTES
from app.core.exceptions import InvalidImageError
from app.models.model_manager import ModelManager, model_manager

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def open_valid_image(data: bytes) -> Image.Image:
    if not data:
        raise InvalidImageError("The uploaded image is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise InvalidImageError(
            f"Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MiB upload limit"
        )
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ALLOWED_FORMATS:
                    raise InvalidImageError("Use a JPEG, PNG, or WebP image")
                if image.width * image.height > 20_000_000:
                    raise InvalidImageError("Image dimensions exceed the safe 20-megapixel limit")
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                return image.convert("RGB")
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImageError(f"Image could not be safely decoded: {exc}") from exc


def attention_overlay(image: Image.Image, weights: np.ndarray) -> str:
    import base64
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import Normalize
    from PIL import Image as PILImage

    grid = np.asarray(weights, dtype=np.float64)
    if grid.ndim != 2 or not np.isfinite(grid).all():
        raise ValueError("Image attention must be a finite 2D patch grid")
    resized = PILImage.fromarray(np.uint8(np.clip(grid / max(grid.max(), 1e-12), 0, 1) * 255))
    resized = resized.resize(image.size, PILImage.Resampling.BICUBIC)
    overlay = io.BytesIO()
    fig, axis = plt.subplots(figsize=(6, 6), dpi=120)
    axis.imshow(image)
    axis.imshow(np.asarray(resized) / 255.0, cmap="magma", norm=Normalize(0, 1), alpha=0.48)
    axis.set_axis_off()
    fig.tight_layout(pad=0)
    fig.savefig(overlay, format="png", dpi=120, bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    return "data:image/png;base64," + base64.b64encode(overlay.getvalue()).decode("ascii")


def run_vit_attention(
    data: bytes,
    layer: int,
    head: int | None,
    manager: ModelManager = model_manager,
) -> dict[str, Any]:
    image = open_valid_image(data)
    with manager.using("vit", "vision") as loaded:
        import torch

        inputs = loaded.processor(images=image, return_tensors="pt")
        with torch.inference_mode():
            output = loaded.model(**inputs, output_attentions=True, return_dict=True)
        if output.attentions is None:
            raise ValueError("The vision model did not return attention tensors")
        if layer < 0 or layer >= len(output.attentions):
            raise ValueError(f"Layer must be between 0 and {len(output.attentions) - 1}")
        values = output.attentions[layer][0].detach().cpu().numpy()
        head_count, sequence_length, _ = values.shape
        if head is None:
            cls_attention = values[:, 0, 1:].mean(axis=0)
        else:
            if head < 0 or head >= head_count:
                raise ValueError(f"Head must be between 0 and {head_count - 1}")
            cls_attention = values[head, 0, 1:]
        patch_count = len(cls_attention)
        grid_size = int(np.sqrt(patch_count))
        if grid_size * grid_size != patch_count:
            raise ValueError(f"Patch count {patch_count} does not form a square grid")
        patch_grid = cls_attention.reshape(grid_size, grid_size)
        return {
            "model_id": "vit",
            "model_name": loaded.model.config.name_or_path,
            "image_width": image.width,
            "image_height": image.height,
            "patch_grid": grid_size,
            "layer_count": len(output.attentions),
            "head_count": head_count,
            "layer": layer,
            "head": head,
            "attention": patch_grid.tolist(),
            "overlay_png": attention_overlay(image, patch_grid),
            "note": (
                "The map shows CLS-token attention to image patches for the selected layer/head. "
                "It is an attention visualization, not definitive evidence of which regions caused "
                "the classifier's output."
            ),
        }
