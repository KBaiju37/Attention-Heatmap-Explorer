from __future__ import annotations

from typing import Any

import numpy as np

from app.attention.processing import attention_array, select_attention, summarize_attention
from app.core.config import MAX_SEQUENCE_LENGTH
from app.core.exceptions import ModelLoadError
from app.models.model_manager import ModelManager, model_manager


ATTENTION_NOTES = {
    "bert": (
        "BERT attention is bidirectional. Attention weights describe routing in this "
        "forward pass and are not, on their own, causal explanations."
    ),
    "gpt2": (
        "GPT-2 attention is causal and cannot attend to future tokens. Attention weights "
        "are not vocabulary probabilities or, on their own, causal explanations."
    ),
}


def _encoded_input(tokenizer: Any, text: str) -> tuple[dict[str, Any], list[str], bool]:
    if not text.strip():
        raise ValueError("Text cannot contain only whitespace")
    full_ids = tokenizer(text, add_special_tokens=True, truncation=False)["input_ids"]
    truncated = len(full_ids) > MAX_SEQUENCE_LENGTH
    encoded = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_SEQUENCE_LENGTH,
    )
    tokens = tokenizer.convert_ids_to_tokens(encoded["input_ids"][0].tolist())
    return encoded, tokens, truncated


def _inference_error(exc: Exception) -> ModelLoadError:
    return ModelLoadError(
        f"Model inference could not complete: {type(exc).__name__}: {exc}"
    )


def extract_attention(
    model_id: str,
    text: str,
    layer: int,
    head: int | None,
    query_token: int | None,
    manager: ModelManager = model_manager,
) -> dict[str, Any]:
    try:
        with manager.using(model_id, "attention") as loaded:
            encoded, tokens, truncated = _encoded_input(loaded.tokenizer, text)
            import torch

            with torch.inference_mode():
                output = loaded.model(**encoded, output_attentions=True, return_dict=True)
            if output.attentions is None:
                raise ValueError("The selected model did not return attention tensors")
            causal = model_id == "gpt2"
            matrix, layer_count, head_count = select_attention(
                output.attentions, layer, head, causal=causal
            )
            summary = summarize_attention(matrix, tokens, query_token)
            return {
                "model_id": model_id,
                "model_name": loaded.model.config.name_or_path,
                "tokens": tokens,
                "layer_count": layer_count,
                "head_count": head_count,
                "layer": layer,
                "head": head,
                "aggregation": "mean_heads" if head is None else "single_head",
                "attention": matrix.tolist(),
                **summary,
                "truncated": truncated,
                "scientific_note": ATTENTION_NOTES[model_id],
            }
    except (ValueError, ModelLoadError):
        raise
    except Exception as exc:
        raise _inference_error(exc) from exc


def bert_masked_probabilities(
    text: str,
    top_k: int,
    manager: ModelManager = model_manager,
) -> dict[str, Any]:
    try:
        with manager.using("bert", "masked_lm") as loaded:
            tokenizer = loaded.tokenizer
            if not tokenizer.mask_token:
                raise ValueError("The selected tokenizer has no mask token")
            encoded, tokens, truncated = _encoded_input(tokenizer, text)
            mask_id = tokenizer.mask_token_id
            mask_positions = (encoded["input_ids"][0] == mask_id).nonzero().flatten()
            if len(mask_positions) != 1:
                raise ValueError("Provide exactly one [MASK] token in the input")
            position = int(mask_positions[0].item())
            import torch

            with torch.inference_mode():
                output = loaded.model(**encoded, return_dict=True)
                probabilities = torch.softmax(output.logits[0, position].float(), dim=-1)
                values, indices = torch.topk(probabilities, k=min(top_k, probabilities.numel()))
            ids = indices.tolist()
            candidates = [
                {
                    "token_id": token_id,
                    "token": tokenizer.convert_ids_to_tokens(token_id),
                    "display": tokenizer.decode(
                        [token_id], clean_up_tokenization_spaces=False
                    ),
                    "probability": float(probability),
                    "rank": rank,
                }
                for rank, (token_id, probability) in enumerate(
                    zip(ids, values.tolist(), strict=True), start=1
                )
            ]
            return {
                "model_id": "bert",
                "model_name": loaded.model.config.name_or_path,
                "tokens": tokens,
                "selected_position": position,
                "prediction_type": "BERT masked-token prediction using left and right context",
                "candidates": candidates,
                "vocabulary_size": int(probabilities.numel()),
                "top_k_probability_mass": float(values.sum().item()),
                "truncated": truncated,
                "note": (
                    "Probabilities are softmax values over the complete vocabulary; "
                    "top-k mass is generally less than 1.0 and is not calibrated confidence. "
                    "Masking one WordPiece does not mask an entire multi-piece word."
                ),
            }
    except (ValueError, ModelLoadError):
        raise
    except Exception as exc:
        raise _inference_error(exc) from exc


def gpt2_next_token_probabilities(
    text: str,
    top_k: int,
    manager: ModelManager = model_manager,
) -> dict[str, Any]:
    try:
        with manager.using("gpt2", "causal_lm") as loaded:
            encoded, tokens, truncated = _encoded_input(loaded.tokenizer, text)
            import torch

            with torch.inference_mode():
                output = loaded.model(
                    **encoded,
                    output_attentions=False,
                    use_cache=False,
                    return_dict=True,
                )
                probabilities = torch.softmax(output.logits[0, -1].float(), dim=-1)
                values, indices = torch.topk(probabilities, k=min(top_k, probabilities.numel()))
            candidates = []
            for rank, (token_id, probability) in enumerate(
                zip(indices.tolist(), values.tolist(), strict=True), start=1
            ):
                token = loaded.tokenizer.convert_ids_to_tokens(token_id)
                candidates.append(
                    {
                        "token_id": token_id,
                        "token": token,
                        "display": loaded.tokenizer.decode(
                            [token_id], clean_up_tokenization_spaces=False
                        ),
                        "probability": float(probability),
                        "rank": rank,
                    }
                )
            return {
                "model_id": "gpt2",
                "model_name": loaded.model.config.name_or_path,
                "tokens": tokens,
                "selected_position": len(tokens) - 1,
                "prediction_type": "GPT-2 next-token prediction from the final input position",
                "candidates": candidates,
                "vocabulary_size": int(probabilities.numel()),
                "top_k_probability_mass": float(values.sum().item()),
                "truncated": truncated,
                "note": (
                    "GPT-2 logits at the last context position predict the next token. "
                    "The listed softmax values are vocabulary probabilities, not attention weights "
                    "or calibrated confidence."
                ),
            }
    except (ValueError, ModelLoadError):
        raise
    except Exception as exc:
        raise _inference_error(exc) from exc


def attention_numpy_layers(attentions: Any) -> np.ndarray:
    if not attentions:
        raise ValueError("The model returned no attention layers")
    return np.stack([attention_array(layer) for layer in attentions], axis=0)
