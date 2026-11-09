import app.models.model_manager as manager_module
from app.models.model_manager import ModelManager


def test_model_is_cached_only_when_config_and_weights_are_present(monkeypatch) -> None:
    missing = object()
    cached = {
        "config.json": "C:/cache/config.json",
        "model.safetensors": "C:/cache/model.safetensors",
    }

    monkeypatch.setattr(
        manager_module,
        "try_to_load_from_cache",
        lambda _checkpoint, filename: cached.get(filename),
    )
    assert ModelManager()._cached("bert") is True

    monkeypatch.setattr(
        manager_module,
        "try_to_load_from_cache",
        lambda _checkpoint, filename: (
            "C:/cache/config.json" if filename == "config.json" else missing
        ),
    )
    assert ModelManager()._cached("bert") is False
