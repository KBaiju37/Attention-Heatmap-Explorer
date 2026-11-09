from __future__ import annotations

import gc
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator, Literal

from app.core.config import MODEL_CACHE_DIR
from app.core.exceptions import ModelLoadError

from huggingface_hub import try_to_load_from_cache

ModelPurpose = Literal["attention", "masked_lm", "causal_lm", "vision", "clip"]

MODEL_SPECS = {
    "bert": {
        "name": "BERT base uncased",
        "checkpoint": "google-bert/bert-base-uncased",
        "purpose": "Bidirectional text attention and masked-token prediction",
    },
    "gpt2": {
        "name": "GPT-2 small",
        "checkpoint": "openai-community/gpt2",
        "purpose": "Causal attention and next-token prediction",
    },
    "vit": {
        "name": "ViT base patch16 224",
        "checkpoint": "google/vit-base-patch16-224",
        "purpose": "Image patch attention",
    },
    "clip": {
        "name": "CLIP ViT-B/32",
        "checkpoint": "openai/clip-vit-base-patch32",
        "purpose": "Separate image/text embeddings and cosine similarity",
    },
}


@dataclass
class LoadedModel:
    model_id: str
    purpose: ModelPurpose
    model: Any
    processor: Any
    tokenizer: Any | None = None


class ModelManager:
    """Keep one CPU model resident and serialize inference around model swaps."""

    def __init__(self) -> None:
        self._inference_lock = threading.RLock()
        self._state_lock = threading.Lock()
        self._loaded: LoadedModel | None = None
        self._state: dict[str, dict[str, str | None]] = {
            model_id: {"state": "not_downloaded", "detail": None}
            for model_id in MODEL_SPECS
        }

    @property
    def device(self) -> str:
        return "cpu"

    def _cached(self, model_id: str) -> bool:
        checkpoint = MODEL_SPECS[model_id]["checkpoint"]
        configuration_cached = try_to_load_from_cache(checkpoint, "config.json")
        weights_cached = any(
            isinstance(try_to_load_from_cache(checkpoint, filename), str)
            for filename in (
                "model.safetensors",
                "pytorch_model.bin",
                "model.safetensors.index.json",
                "pytorch_model.bin.index.json",
            )
        )
        return isinstance(configuration_cached, str) and weights_cached

    def statuses(self) -> tuple[str | None, list[dict[str, str | None]]]:
        active_id = self._loaded.model_id if self._loaded else None
        rows: list[dict[str, str | None]] = []
        with self._state_lock:
            for model_id, spec in MODEL_SPECS.items():
                state = self._state[model_id]["state"]
                detail = self._state[model_id]["detail"]
                if model_id == active_id:
                    state = "ready"
                    detail = "Loaded in CPU memory"
                elif state not in {"downloading", "loading", "error"}:
                    state = "cached" if self._cached(model_id) else "not_downloaded"
                    detail = "Cached locally; not loaded" if state == "cached" else None
                rows.append(
                    {
                        "id": model_id,
                        "name": spec["name"],
                        "checkpoint": spec["checkpoint"],
                        "purpose": spec["purpose"],
                        "state": state,
                        "detail": detail,
                    }
                )
        return active_id, rows

    def _set_state(self, model_id: str, state: str, detail: str | None = None) -> None:
        with self._state_lock:
            self._state[model_id] = {"state": state, "detail": detail}

    def _release_current(self) -> None:
        if self._loaded is not None:
            previous_id = self._loaded.model_id
            self._loaded = None
            gc.collect()
            self._set_state(previous_id, "cached", "Cached locally; not loaded")

    def _load(self, model_id: str, purpose: ModelPurpose) -> LoadedModel:
        checkpoint = MODEL_SPECS[model_id]["checkpoint"]
        cached = self._cached(model_id)
        self._set_state(model_id, "loading" if cached else "downloading")
        try:
            import torch
            from transformers import (
                AutoModel,
                AutoModelForCausalLM,
                AutoModelForMaskedLM,
                AutoTokenizer,
                CLIPModel,
                CLIPProcessor,
                ViTForImageClassification,
                ViTImageProcessor,
            )

            common = {"attn_implementation": "eager"}
            if purpose == "attention":
                tokenizer = AutoTokenizer.from_pretrained(checkpoint, use_fast=True)
                if model_id == "bert":
                    model = AutoModel.from_pretrained(checkpoint, **common)
                elif model_id == "gpt2":
                    model = AutoModelForCausalLM.from_pretrained(checkpoint, **common)
                else:
                    raise ValueError(f"{model_id} does not expose text attention")
                loaded = LoadedModel(model_id, purpose, model.eval().to("cpu"), tokenizer, tokenizer)
            elif purpose == "masked_lm":
                tokenizer = AutoTokenizer.from_pretrained(checkpoint, use_fast=True)
                model = AutoModelForMaskedLM.from_pretrained(checkpoint, **common)
                loaded = LoadedModel(model_id, purpose, model.eval().to("cpu"), tokenizer, tokenizer)
            elif purpose == "causal_lm":
                tokenizer = AutoTokenizer.from_pretrained(checkpoint, use_fast=True)
                model = AutoModelForCausalLM.from_pretrained(checkpoint, **common)
                loaded = LoadedModel(model_id, purpose, model.eval().to("cpu"), tokenizer, tokenizer)
            elif purpose == "vision":
                processor = ViTImageProcessor.from_pretrained(checkpoint)
                model = ViTForImageClassification.from_pretrained(checkpoint, **common)
                loaded = LoadedModel(model_id, purpose, model.eval().to("cpu"), processor)
            elif purpose == "clip":
                processor = CLIPProcessor.from_pretrained(checkpoint)
                model = CLIPModel.from_pretrained(checkpoint, **common)
                loaded = LoadedModel(model_id, purpose, model.eval().to("cpu"), processor)
            else:
                raise ValueError(f"Unsupported model purpose: {purpose}")
            self._loaded = loaded
            self._set_state(model_id, "ready", "Loaded in CPU memory")
            return loaded
        except Exception as exc:
            self._set_state(model_id, "error", f"{type(exc).__name__}: {exc}")
            raise ModelLoadError(
                f"Unable to load {MODEL_SPECS[model_id]['name']} "
                f"from {checkpoint}: {type(exc).__name__}: {exc}"
            ) from exc

    @contextmanager
    def using(self, model_id: str, purpose: ModelPurpose) -> Iterator[LoadedModel]:
        if model_id not in MODEL_SPECS:
            raise ValueError(f"Unknown model: {model_id}")
        with self._inference_lock:
            if (
                self._loaded is not None
                and self._loaded.model_id == model_id
                and self._loaded.purpose == purpose
            ):
                yield self._loaded
                return
            self._release_current()
            loaded = self._load(model_id, purpose)
            try:
                yield loaded
            finally:
                # Keep the active model resident for interactive layer/head changes.
                self._set_state(model_id, "ready", "Loaded in CPU memory")

    def unload(self) -> None:
        with self._inference_lock:
            self._release_current()


model_manager = ModelManager()
