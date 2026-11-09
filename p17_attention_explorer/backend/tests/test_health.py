from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_expected_response() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "application": "P17 Attention Heatmap Explorer",
        "status": "healthy",
        "version": "0.1.0",
        "environment": "development",
    }


def test_health_response_has_no_unexpected_fields() -> None:
    response = client.get("/api/health")

    assert set(response.json()) == {
        "application",
        "status",
        "version",
        "environment",
    }


def test_model_inventory_reports_cpu_and_real_model_states() -> None:
    response = client.get("/api/models")

    assert response.status_code == 200
    body = response.json()
    assert body["device"] == "cpu"
    assert body["active_model_id"] is None
    assert {model["id"] for model in body["models"]} == {"bert", "gpt2", "vit", "clip"}
    assert all(model["state"] in {"not_downloaded", "cached"} for model in body["models"])
