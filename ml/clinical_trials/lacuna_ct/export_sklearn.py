"""Export sklearn pipelines to portable JSON for TypeScript inference."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def export_tfidf_logistic(
    pipeline: Pipeline,
    *,
    model_id: str,
    task: str,
    metrics: dict[str, float | int],
    positive_label: str,
    numeric_feature_names: list[str] | None = None,
    numeric_coefficients: list[float] | None = None,
    numeric_means: list[float] | None = None,
    numeric_scales: list[float] | None = None,
) -> dict[str, Any]:
    vectorizer: TfidfVectorizer = pipeline.named_steps["tfidf"]
    classifier: LogisticRegression = pipeline.named_steps["clf"]

    vocab = vectorizer.vocabulary_
    max_idx = max(vocab.values()) if vocab else -1
    terms: list[str] = [""] * (max_idx + 1)
    for term, idx in vocab.items():
        terms[idx] = term

    text_coef_len = len(terms)
    if numeric_coefficients is not None:
        text_coefficients = classifier.coef_[0][:text_coef_len].tolist()
        numeric_coef = numeric_coefficients
    else:
        text_coefficients = classifier.coef_[0].tolist()
        numeric_coef = None

    artifact: dict[str, Any] = {
        "id": model_id,
        "modelType": "tfidf_logistic_binary",
        "task": task,
        "trainedAt": date.today().isoformat(),
        "metrics": metrics,
        "positiveLabel": positive_label,
        "vocabulary": terms,
        "idf": vectorizer.idf_.tolist(),
        "coefficients": text_coefficients,
        "intercept": float(classifier.intercept_[0]),
    }
    if numeric_feature_names and numeric_coef is not None:
        artifact["numericFeatureNames"] = numeric_feature_names
        artifact["numericCoefficients"] = numeric_coef
        if numeric_means is not None:
            artifact["numericMeans"] = numeric_means
        if numeric_scales is not None:
            artifact["numericScales"] = numeric_scales
    return artifact


def export_hybrid_from_fitted(
    *,
    model_id: str,
    task: str,
    metrics: dict[str, float | int],
    positive_label: str,
    vectorizer: TfidfVectorizer,
    scaler: StandardScaler,
    classifier: LogisticRegression,
    numeric_dim: int,
    numeric_feature_names: list[str],
) -> dict[str, Any]:
    vocab = vectorizer.vocabulary_
    max_idx = max(vocab.values()) if vocab else -1
    terms = [""] * (max_idx + 1)
    for term, idx in vocab.items():
        terms[idx] = term

    text_coef = classifier.coef_[0][: len(terms)].tolist()
    numeric_coef = classifier.coef_[0][len(terms) : len(terms) + numeric_dim].tolist()

    return {
        "id": model_id,
        "modelType": "tfidf_logistic_binary",
        "task": task,
        "trainedAt": date.today().isoformat(),
        "metrics": metrics,
        "positiveLabel": positive_label,
        "vocabulary": terms,
        "idf": vectorizer.idf_.tolist(),
        "coefficients": text_coef,
        "intercept": float(classifier.intercept_[0]),
        "numericFeatureNames": numeric_feature_names,
        "numericCoefficients": numeric_coef,
        "numericMeans": scaler.mean_.tolist(),
        "numericScales": scaler.scale_.tolist(),
    }


def write_artifact(artifact: dict[str, Any], repo_root: Path, relative: str) -> Path:
    out = repo_root / relative
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    return out


def softmax_score(logit: float) -> float:
    return float(1.0 / (1.0 + np.exp(-logit)))
