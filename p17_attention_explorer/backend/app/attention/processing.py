from __future__ import annotations

import math
from typing import Any

import numpy as np


class AttentionValidationError(ValueError):
    """Raised when a model output is not a valid attention tensor."""


def attention_array(value: Any) -> np.ndarray:
    if hasattr(value, "detach"):
        value = value.detach().to("cpu").numpy()
    array = np.asarray(value, dtype=np.float64)
    if array.ndim != 4 or array.shape[0] != 1:
        raise AttentionValidationError(
            f"Expected attention shape [1, heads, sequence, sequence], got {array.shape}"
        )
    if (
        array.shape[1] == 0
        or array.shape[2] == 0
        or array.shape[2] != array.shape[3]
        or not np.isfinite(array).all()
    ):
        raise AttentionValidationError("Attention must be a finite square matrix per head")
    if np.any(array < -1e-7):
        raise AttentionValidationError("Attention contains negative values")
    return array[0]


def select_attention(
    attention: Any,
    layer_index: int,
    head_index: int | None,
    *,
    causal: bool,
) -> tuple[np.ndarray, int, int]:
    layers = tuple(attention)
    if not layers:
        raise AttentionValidationError("The model returned no attention layers")
    if layer_index < 0 or layer_index >= len(layers):
        raise AttentionValidationError(f"Layer must be between 0 and {len(layers) - 1}")
    selected = attention_array(layers[layer_index])
    head_count, sequence_length, _ = selected.shape
    if head_index is None:
        matrix = selected.mean(axis=0)
    else:
        if head_index < 0 or head_index >= head_count:
            raise AttentionValidationError(f"Head must be between 0 and {head_count - 1}")
        matrix = selected[head_index]
    row_sums = matrix.sum(axis=-1)
    if not np.allclose(row_sums, 1.0, atol=2e-2, rtol=2e-2):
        raise AttentionValidationError("Attention rows are not normalized over key positions")
    if causal and sequence_length > 1:
        if np.any(np.triu(matrix, k=1) > 1e-6):
            raise AttentionValidationError("Causal attention assigned weight to a future token")
    return matrix, len(layers), head_count


def summarize_attention(matrix: np.ndarray, tokens: list[str], query_index: int | None) -> dict[str, Any]:
    pairs = [
        {
            "query_index": row,
            "query_token": tokens[row],
            "key_index": column,
            "key_token": tokens[column],
            "score": float(matrix[row, column]),
        }
        for row in range(matrix.shape[0])
        for column in range(matrix.shape[1])
    ]
    pairs.sort(key=lambda pair: pair["score"], reverse=True)
    distribution = None
    entropy = None
    if query_index is not None:
        if query_index < 0 or query_index >= len(tokens):
            raise AttentionValidationError(f"Query token must be between 0 and {len(tokens) - 1}")
        distribution = matrix[query_index].tolist()
        entropy = float(
            -sum(value * math.log(value) for value in distribution if value > 0)
        )
    return {
        "query_distribution": distribution,
        "query_entropy": entropy,
        "top_pairs": pairs[:10],
    }
