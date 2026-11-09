from fastapi import APIRouter, HTTPException

from app.attention.hooks import capture_module_output
from app.core.exceptions import ModelLoadError
from app.models.model_manager import model_manager

router = APIRouter(prefix="/hooks", tags=["Hooks"])


@router.post("/{model_id}/{layer}")
def inspect_layer(model_id: str, layer: int) -> dict[str, object]:
    if model_id not in {"bert", "gpt2"}:
        raise HTTPException(status_code=422, detail="Hooks currently support BERT and GPT-2 text layers")
    if layer < 0:
        raise HTTPException(status_code=422, detail="Layer must be non-negative")
    try:
        with model_manager.using(model_id, "attention") as loaded:
            if model_id == "bert":
                layers = loaded.model.encoder.layer
                module_name = f"encoder.layer.{layer}.attention.self"
                module = layers[layer].attention.self if layer < len(layers) else None
            else:
                layers = loaded.model.transformer.h
                module_name = f"transformer.h.{layer}.attn"
                module = layers[layer].attn if layer < len(layers) else None
            if module is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Layer must be between 0 and {len(layers) - 1}",
                )
            encoded = loaded.tokenizer(
                "A short hook inspection input.",
                return_tensors="pt",
                truncation=True,
            )
            import torch

            def forward() -> object:
                with torch.inference_mode():
                    return loaded.model(
                        **encoded,
                        output_attentions=True,
                        return_dict=True,
                        **({"use_cache": False} if model_id == "gpt2" else {}),
                    )

            result = capture_module_output(
                module,
                forward,
                expected_attention_output_index=1,
            )
            return {
                "model_id": model_id,
                "module_name": module_name,
                "layer": layer,
                "hook_status": "registered and removed",
                "outputs": result["outputs"],
                "attention_probabilities_captured": result[
                    "attention_probabilities_captured"
                ],
                "note": (
                    "The hook records the selected module's actual forward outputs. "
                    "Tensor shape and normalization are evidence only that an output resembles "
                    "attention; the expected attention output position and probability "
                    "normalization are checked for the supported model module."
                ),
            }
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except IndexError as exc:
        raise HTTPException(status_code=422, detail="Requested layer does not exist") from exc
