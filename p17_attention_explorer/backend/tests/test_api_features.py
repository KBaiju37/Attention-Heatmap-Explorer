import io
import json

from fastapi.testclient import TestClient
from PIL import Image

from app.core.exceptions import ModelLoadError
from app.main import app

client = TestClient(app)

EXPORT_PAYLOAD = {
    "model_id": "bert",
    "model_name": "BERT base uncased",
    "tokens": ["[CLS]", "word"],
    "attention": [[1.0, 0.0], [0.25, 0.75]],
    "layer": 0,
    "head": None,
    "aggregation": "mean_heads",
}


def test_text_and_experiment_routes_validate_without_loading_models() -> None:
    attention = client.post(
        "/api/bert/attention",
        json={"text": "   ", "layer": 0, "head": None},
    )
    bias = client.post(
        "/api/experiments/bias",
        json={"occupations": ["astronaut"], "pronouns": ["she", "they"]},
    )
    explanation = client.post(
        "/api/experiments/explain",
        json={
            "tokens": ["a", "b"],
            "attention": [[1.0]],
            "query_index": 0,
            "layer": 0,
        },
    )

    assert attention.status_code == 422
    assert bias.status_code == 422
    assert explanation.status_code == 422


def test_comparison_route_runs_models_sequentially_and_returns_separate_tokenizations(monkeypatch) -> None:
    from app.api.routes import comparison

    calls = []

    def fake_extract(model_id, text, layer, head, query_token):
        calls.append(model_id)
        token = "[CLS]" if model_id == "bert" else "Ġtext"
        return {
            "model_id": model_id,
            "model_name": model_id,
            "tokens": [token],
            "layer_count": 12,
            "head_count": 12,
            "layer": layer,
            "head": head,
            "aggregation": "mean_heads" if head is None else "single_head",
            "attention": [[1.0]],
            "query_distribution": None,
            "query_entropy": None,
            "top_pairs": [],
            "truncated": False,
            "scientific_note": "Observed attention only.",
        }

    monkeypatch.setattr(comparison, "extract_attention", fake_extract)
    response = client.post(
        "/api/comparison",
        json={"text": "Shared text", "layer": 2, "head": None},
    )

    assert response.status_code == 200
    assert calls == ["bert", "gpt2"]
    assert response.json()["bert"]["tokens"] != response.json()["gpt2"]["tokens"]
    assert "not aligned" in response.json()["note"]


def test_comparison_route_reports_model_load_failure_as_service_unavailable(monkeypatch) -> None:
    from app.api.routes import comparison

    def fail(*_args, **_kwargs):
        raise ModelLoadError("blocked dependency")

    monkeypatch.setattr(comparison, "extract_attention", fail)
    response = client.post(
        "/api/comparison",
        json={"text": "Shared text", "layer": 0, "head": None},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "blocked dependency"


def test_export_json_preserves_real_attention_payload_and_attachment_name() -> None:
    response = client.post("/api/export/json", json=EXPORT_PAYLOAD)

    assert response.status_code == 200
    assert response.headers["content-disposition"].endswith(
        'filename="bert-layer-0-attention.json"'
    )
    assert json.loads(response.content)["attention"] == EXPORT_PAYLOAD["attention"]


def test_export_renders_png_and_svg_with_token_labels() -> None:
    png = client.post("/api/export/png", json=EXPORT_PAYLOAD)
    svg = client.post("/api/export/svg", json=EXPORT_PAYLOAD)

    assert png.status_code == 200
    assert png.headers["content-type"] == "image/png"
    assert png.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert svg.status_code == 200
    assert svg.headers["content-type"] == "image/svg+xml"
    assert b"[CLS]" in svg.content
    assert b"word" in svg.content


def test_export_rejects_mismatched_attention_dimensions() -> None:
    payload = {**EXPORT_PAYLOAD, "attention": [[1.0]]}

    response = client.post("/api/export/png", json=payload)

    assert response.status_code == 422


def test_vision_route_rejects_invalid_image_before_model_loading() -> None:
    response = client.post(
        "/api/vision/attention",
        files={"file": ("bad.png", io.BytesIO(b"not an image"), "image/png")},
        data={"layer": "0"},
    )

    assert response.status_code == 400
    assert "safely decoded" in response.json()["detail"]


def test_vision_route_enforces_upload_size_before_model_loading() -> None:
    oversized = io.BytesIO(b"x" * (5 * 1024 * 1024 + 1))

    response = client.post(
        "/api/vision/attention",
        files={"file": ("large.png", oversized, "image/png")},
        data={"layer": "0"},
    )

    assert response.status_code == 413


def test_clip_route_validates_candidate_count_before_model_loading() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buffer, format="PNG")

    response = client.post(
        "/api/vision/clip",
        files={"file": ("image.png", buffer.getvalue(), "image/png")},
        data=[],
    )

    assert response.status_code == 422
