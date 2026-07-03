"""Export sklearn TF-IDF + logistic / GBM pipelines to portable JSON for TypeScript inference."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def export_tfidf_logistic(
    pipeline: Pipeline,
    *,
    model_id: str,
    task: str,
    metrics: dict[str, float | int],
    positive_label: str,
    feature_names_extra: list[str] | None = None,
    extra_coefficients: list[float] | None = None,
) -> dict[str, Any]:
    vectorizer: TfidfVectorizer = pipeline.named_steps["tfidf"]
    classifier: LogisticRegression = pipeline.named_steps["clf"]

    vocab = vectorizer.vocabulary_
    # invert to index -> term for stable JSON array
    max_idx = max(vocab.values()) if vocab else -1
    terms: list[str] = [""] * (max_idx + 1)
    for term, idx in vocab.items():
        terms[idx] = term

    coef = classifier.coef_[0].tolist()
    if extra_coefficients:
        coef = coef + list(extra_coefficients)

    return {
        "id": model_id,
        "modelType": "tfidf_logistic_binary",
        "task": task,
        "trainedAt": date.today().isoformat(),
        "metrics": metrics,
        "positiveLabel": positive_label,
        "vocabulary": terms,
        "idf": vectorizer.idf_.tolist(),
        "coefficients": coef,
        "intercept": float(classifier.intercept_[0]),
        "numericFeatureNames": feature_names_extra or [],
    }


def write_artifact(artifact: dict[str, Any], repo_root: Path, relative: str) -> Path:
    out = repo_root / relative
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    return out


def softmax_score(logit: float) -> float:
    return float(1.0 / (1.0 + np.exp(-logit)))
