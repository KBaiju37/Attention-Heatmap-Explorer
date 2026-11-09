import builtins

import pytest

from app.core.exceptions import ModelLoadError
from app.models.model_manager import ModelManager


def test_dependency_import_failure_is_reported_as_model_error(monkeypatch) -> None:
    manager = ModelManager()
    monkeypatch.setattr(manager, "_cached", lambda _model_id: False)
    original_import = builtins.__import__

    def blocked_transformers_import(name, *args, **kwargs):
        if name == "transformers":
            raise ImportError("Application Control policy has blocked a native module")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", blocked_transformers_import)

    with pytest.raises(ModelLoadError, match="Application Control policy has blocked"):
        manager._load("bert", "attention")

    _, models = manager.statuses()
    bert = next(model for model in models if model["id"] == "bert")
    assert bert["state"] == "error"
    assert "Application Control policy has blocked" in bert["detail"]
