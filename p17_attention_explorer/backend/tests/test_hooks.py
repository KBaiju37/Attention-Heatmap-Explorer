import pytest
import torch

from app.attention.hooks import capture_module_output


def test_attention_is_only_flagged_at_explicit_output_position() -> None:
    module = torch.nn.Identity()
    hidden = torch.randn(1, 2, 3, 3)
    probabilities = torch.full((1, 2, 3, 3), 1 / 3)

    result = capture_module_output(
        module,
        lambda: module((hidden, probabilities)),
        expected_attention_output_index=1,
    )

    assert result["attention_probabilities_captured"] is True
    assert not result["outputs"][0].get("attention_probability_candidate", False)
    assert result["outputs"][1]["attention_probability_candidate"] is True


def test_hook_is_removed_when_forward_fails() -> None:
    module = torch.nn.Identity()

    def fail() -> None:
        raise RuntimeError("forward failed")

    with pytest.raises(RuntimeError, match="forward failed"):
        capture_module_output(module, fail, expected_attention_output_index=1)

    assert len(module._forward_hooks) == 0
