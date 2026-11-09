from __future__ import annotations

from collections import defaultdict
from statistics import fmean
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException

from app.core.exceptions import ModelLoadError
from app.models.model_manager import model_manager
from app.schemas.experiments import (
    BiasObservation,
    BiasRequest,
    BiasResponse,
    BiasSummary,
    ExplainRequest,
    ExplainResponse,
)

router = APIRouter(prefix="/experiments", tags=["Experiments"])

TEMPLATES = (
    ("said", "The {occupation} said that {pronoun} would complete the task."),
    ("asked", "Everyone asked the {occupation} whether {pronoun} had finished."),
    ("shared", "The {occupation} shared that {pronoun} was ready."),
)
ALLOWED_OCCUPATIONS = {
    "doctor", "engineer", "nurse", "teacher",
    "scientist", "pilot", "programmer", "receptionist",
}
ALLOWED_PRONOUNS = {"he", "she", "they"}


@router.post("/bias", response_model=BiasResponse)
def run_bias_experiment(request: BiasRequest) -> BiasResponse:
    occupations = [value.strip().lower() for value in request.occupations]
    pronouns = [value.strip().lower() for value in request.pronouns]
    if len(set(occupations)) != len(occupations) or any(
        value not in ALLOWED_OCCUPATIONS for value in occupations
    ):
        raise HTTPException(status_code=422, detail="Choose unique occupations from the documented set")
    if len(set(pronouns)) != len(pronouns) or any(
        value not in ALLOWED_PRONOUNS for value in pronouns
    ):
        raise HTTPException(status_code=422, detail="Choose unique pronouns from he, she, they")

    cases = [
        {
            "template_id": template_id,
            "occupation": occupation,
            "pronoun": pronoun,
            "sentence": template.format(occupation=occupation, pronoun=pronoun),
        }
        for template_id, template in TEMPLATES
        for occupation in occupations
        for pronoun in pronouns
    ]
    try:
        with model_manager.using("bert", "attention") as loaded:
            import torch

            tokenizer = loaded.tokenizer
            encoded = tokenizer(
                [case["sentence"] for case in cases],
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128,
                return_offsets_mapping=True,
            )
            offsets = encoded.pop("offset_mapping").tolist()
            with torch.inference_mode():
                output = loaded.model(**encoded, output_attentions=True, return_dict=True)
            if output.attentions is None:
                raise ValueError("BERT did not return attention probabilities")
            attention = np.stack(
                [layer.detach().cpu().numpy() for layer in output.attentions], axis=0
            ).mean(axis=(0, 2))
            observations: list[BiasObservation] = []
            grouped: dict[tuple[str, str], list[tuple[float, float]]] = defaultdict(list)
            for index, case in enumerate(cases):
                occupation_start = case["sentence"].index(case["occupation"])
                pronoun_start = case["sentence"].index(case["pronoun"])
                occupation_positions = [
                    token_index
                    for token_index, (start, end) in enumerate(offsets[index])
                    if start >= occupation_start
                    and end <= occupation_start + len(case["occupation"])
                    and end > start
                ]
                pronoun_positions = [
                    token_index
                    for token_index, (start, end) in enumerate(offsets[index])
                    if start >= pronoun_start
                    and end <= pronoun_start + len(case["pronoun"])
                    and end > start
                ]
                if not occupation_positions or not pronoun_positions:
                    raise ValueError(
                        f"Tokenizer could not map matched terms in: {case['sentence']}"
                    )
                matrix = attention[index]
                occupation_to_pronoun = float(
                    matrix[np.ix_(occupation_positions, pronoun_positions)].mean()
                )
                pronoun_to_occupation = float(
                    matrix[np.ix_(pronoun_positions, occupation_positions)].mean()
                )
                grouped[(case["occupation"], case["pronoun"])].append(
                    (occupation_to_pronoun, pronoun_to_occupation)
                )
                observations.append(
                    BiasObservation(
                        **case,
                        occupation_tokens=tokenizer.convert_ids_to_tokens(
                            encoded["input_ids"][index][occupation_positions].tolist()
                        ),
                        pronoun_tokens=tokenizer.convert_ids_to_tokens(
                            encoded["input_ids"][index][pronoun_positions].tolist()
                        ),
                        attention_occupation_to_pronoun=occupation_to_pronoun,
                        attention_pronoun_to_occupation=pronoun_to_occupation,
                    )
                )
        summaries = [
            BiasSummary(
                occupation=occupation,
                pronoun=pronoun,
                sample_count=len(values),
                mean_occupation_to_pronoun=fmean(value[0] for value in values),
                mean_pronoun_to_occupation=fmean(value[1] for value in values),
            )
            for (occupation, pronoun), values in sorted(grouped.items())
        ]
        return BiasResponse(
            model_id="bert",
            model_name=loaded.model.config.name_or_path,
            observations=observations,
            summaries=summaries,
            note=(
                "Exploratory matched-template attention statistics only. Prompt wording, "
                "tokenization, layers and heads affect these measurements. They do not establish "
                "gender bias or causality; attention weights are not faithful explanations by default."
            ),
        )
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/explain", response_model=ExplainResponse)
def explain_attention(request: ExplainRequest) -> ExplainResponse:
    length = len(request.tokens)
    if len(request.attention) != length or any(len(row) != length for row in request.attention):
        raise HTTPException(status_code=422, detail="Attention matrix dimensions must match tokens")
    if request.query_index >= length:
        raise HTTPException(status_code=422, detail="Query index is outside the token sequence")
    matrix = np.asarray(request.attention, dtype=np.float64)
    if not np.isfinite(matrix).all() or np.any(matrix < 0):
        raise HTTPException(status_code=422, detail="Attention values must be finite and non-negative")
    if not np.allclose(matrix.sum(axis=1), 1.0, atol=2e-2, rtol=2e-2):
        raise HTTPException(status_code=422, detail="Attention rows must sum approximately to one")
    row = matrix[request.query_index]
    ranked = np.argsort(row)[::-1][: min(3, length)]
    destinations = ", ".join(
        f"{request.tokens[int(index)]!r} ({row[index]:.3f})" for index in ranked
    )
    selected = request.tokens[request.query_index]
    return ExplainResponse(
        source="deterministic",
        explanation=(
            f"For query token {selected!r} at layer {request.layer}"
            f"{f', head {request.head}' if request.head is not None else ' with mean-head aggregation'}, "
            f"the highest attention values go to {destinations}."
        ),
        note=(
            "This deterministic description summarizes supplied attention values. "
            "It does not infer intent, causality, or a faithful explanation of the model."
        ),
    )
