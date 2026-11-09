import numpy as np
import pytest

from app.attention.processing import (
    AttentionValidationError,
    attention_array,
    select_attention,
    summarize_attention,
)


def test_attention_array_accepts_expected_batch_head_sequence_shape() -> None:
    tensor = np.full((1, 2, 2, 2), 0.5)

    result = attention_array(tensor)

    assert result.shape == (2, 2, 2)


@pytest.mark.parametrize(
    "tensor",
    [
        np.ones((2, 2, 2)),
        np.ones((2, 1, 2, 2)),
        np.ones((1, 1, 2, 3)),
        np.array([[[[np.nan]]]]),
        np.array([[[[-0.1]]]]),
    ],
)
def test_attention_array_rejects_invalid_attention_shapes_and_values(tensor) -> None:
    with pytest.raises(AttentionValidationError):
        attention_array(tensor)


def test_select_attention_averages_heads_and_checks_causal_mask() -> None:
    first = np.array([[1.0, 0.0], [0.2, 0.8]])
    second = np.array([[1.0, 0.0], [0.6, 0.4]])

    matrix, layer_count, head_count = select_attention(
        [np.stack((first, second))[None, ...]],
        0,
        None,
        causal=True,
    )

    np.testing.assert_allclose(matrix, [[1.0, 0.0], [0.4, 0.6]])
    assert layer_count == 1
    assert head_count == 2


def test_select_attention_rejects_future_attention_and_bad_indices() -> None:
    future_attention = np.array([[[[0.5, 0.5], [0.0, 1.0]]]])

    with pytest.raises(AttentionValidationError, match="future token"):
        select_attention([future_attention], 0, 0, causal=True)

    normalized = np.array([[[[1.0, 0.0], [0.2, 0.8]]]])
    with pytest.raises(AttentionValidationError, match="Layer"):
        select_attention([normalized], 1, None, causal=False)
    with pytest.raises(AttentionValidationError, match="Head"):
        select_attention([normalized], 0, 1, causal=False)


def test_summarize_attention_rejects_negative_query_index() -> None:
    matrix = np.array([[1.0, 0.0], [0.5, 0.5]])

    with pytest.raises(AttentionValidationError, match="Query token"):
        summarize_attention(matrix, ["a", "b"], -1)
