"""Leakage-screened featurizer for the completion-proxy production models.

This file is dependency-free on purpose. An identical copy lives at
``services/python-api/app/completion_features.py`` so the FastAPI service can
featurize requests without importing the training package. A unit test in
``ml/clinical_trials/tests`` fails if the two copies diverge.

Only registration-time design fields are used. Fields that encode or are
updated by the final status (overall status, results posting, actual
enrollment, completion dates, why-stopped) are excluded; see
``EXCLUDED_FIELDS``.
"""

from __future__ import annotations

from typing import Any, Mapping

FEATURIZER_VERSION = "completion-features-v3"

PHASE_TO_NUM: dict[str, float] = {
    "EARLY_PHASE1": 0.5,
    "PHASE1": 1.0,
    "PHASE2": 2.0,
    "PHASE3": 3.0,
    "PHASE4": 4.0,
    "NA": 0.0,
    "NOT_APPLICABLE": 0.0,
}

NUMERIC_FEATURE_NAMES: tuple[str, ...] = (
    "phase_num",
    "intervention_count",
    "condition_count",
    "is_interventional",
    "sponsor_academic",
    "sponsor_industry",
    "title_word_count",
)

# Field -> reason it is excluded from the production feature set.
EXCLUDED_FIELDS: dict[str, str] = {
    "status": "Outcome itself; the label is derived from overall status.",
    "has_results": (
        "Results are posted after a trial ends and are far more common for "
        "completed trials (post-outcome information)."
    ),
    "ResultsFirstPostDate": "Post-outcome timestamp; same leakage as has_results.",
    "enrollment": (
        "CT.gov overwrites anticipated enrollment with ACTUAL enrollment when a "
        "trial ends. Withdrawn trials are reset to 0 (99.4% of WITHDRAWN rows in "
        "the frozen snapshot have enrollment 0), so the field encodes the label."
    ),
    "completion_date / primary_completion_date": (
        "Updated to the actual stop date at closure; not ingested."
    ),
    "why_stopped": "Only populated for stopped trials; not ingested.",
    "start_year": (
        "Temporal split key. Excluded as a feature so the model cannot "
        "extrapolate a calendar trend across the holdout boundary."
    ),
    "source_query / label_wh": (
        "Artifacts of how the training cohort was assembled; not available "
        "for an arbitrary trial at inference time."
    ),
}


def phase_to_num(phase: str | None) -> float:
    key = str(phase or "").strip().upper().replace(" ", "_")
    return PHASE_TO_NUM.get(key, 0.0)


def sponsor_class(name: str | None) -> str:
    lower = str(name or "").lower()
    if any(
        token in lower
        for token in ("university", "college", "nih", "hospital", "medical center")
    ):
        return "academic"
    if any(token in lower for token in ("inc", "pharma", "therapeutics", "ltd", "gmbh")):
        return "industry"
    return "other"


def _split_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        items = [str(item) for item in value]
    else:
        items = str(value).split(",")
    return [item.strip() for item in items if item and item.strip()]


def text_corpus(trial: Mapping[str, Any]) -> str:
    """Same text recipe as ``TrialRecord.text_corpus`` (title, condition, interventions, sponsor)."""
    return " ".join(
        [
            str(trial.get("title") or ""),
            ", ".join(_split_list(trial.get("condition"))),
            ", ".join(_split_list(trial.get("interventions"))),
            str(trial.get("sponsor") or ""),
        ]
    ).strip()


def numeric_features(trial: Mapping[str, Any]) -> list[float]:
    s_class = sponsor_class(trial.get("sponsor"))
    study_type = str(trial.get("study_type") or "INTERVENTIONAL").strip().upper()
    return [
        phase_to_num(trial.get("phase")),
        float(len(_split_list(trial.get("interventions")))),
        float(len(_split_list(trial.get("condition")))),
        1.0 if study_type == "INTERVENTIONAL" else 0.0,
        1.0 if s_class == "academic" else 0.0,
        1.0 if s_class == "industry" else 0.0,
        float(len(str(trial.get("title") or "").split())),
    ]


def model_row(trial: Mapping[str, Any]) -> list[Any]:
    """One model input row: ``[text, *numeric_features]``."""
    return [text_corpus(trial), *numeric_features(trial)]
