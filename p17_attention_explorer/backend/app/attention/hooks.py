from __future__ import annotations

from typing import Any

import numpy as np


def _tensor_summaries(
    value: Any,
    path: str = "output",
    expected_attention_path: str | None = None,
) -> list[dict[str, Any]]:
    if hasattr(value, "detach") and hasattr(value, "shape"):
        tensor = value.detach().to("cpu")
        summary: dict[str, Any] = {
            "path": path,
            "shape": list(tensor.shape),
            "dtype": str(tensor.dtype),
        }
        if tensor.numel():
            summary.update(
                minimum=float(tensor.min().item()),
                maximum=float(tensor.max().item()),
                mean=float(tensor.float().mean().item()),
            )
        if (
            path == expected_attention_path
            and tensor.ndim == 4
            and tensor.shape[-1] == tensor.shape[-2]
        ):
            array = tensor.float().numpy()
            summary["attention_probability_candidate"] = bool(
                np.all(array >= -1e-7)
                and np.allclose(array.sum(axis=-1), 1.0, atol=2e-2, rtol=2e-2)
            )
        return [summary]
    if isinstance(value, (tuple, list)):
        return [
            item
            for index, child in enumerate(value)
            for item in _tensor_summaries(
                child,
                f"{path}[{index}]",
                expected_attention_path,
            )
        ]
    return [{"path": path, "type": type(value).__name__}]


def capture_module_output(
    module: Any,
    run_forward: Any,
    expected_attention_output_index: int | None = None,
) -> dict[str, Any]:
    captured: list[list[dict[str, Any]]] = []

    def hook(_module: Any, _inputs: Any, output: Any) -> None:
        expected_path = (
            f"output[{expected_attention_output_index}]"
            if expected_attention_output_index is not None
            else None
        )
        captured.append(_tensor_summaries(output, expected_attention_path=expected_path))

    handle = module.register_forward_hook(hook)
    try:
        run_forward()
    finally:
        handle.remove()
    if len(captured) != 1:
        raise RuntimeError(f"Expected exactly one hook capture, got {len(captured)}")
    return {
        "hook_removed": True,
        "capture_count": len(captured),
        "outputs": captured[0],
        "attention_probabilities_captured": any(
            output.get("attention_probability_candidate", False)
            for output in captured[0]
        ),
    }
