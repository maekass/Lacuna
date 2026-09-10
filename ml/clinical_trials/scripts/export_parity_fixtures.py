#!/usr/bin/env python3
"""
Export sklearn-scored parity fixtures for TypeScript inference.

Reconstructs TfidfVectorizer scoring from a committed artifact:
CountVectorizer (same vocab / ngram_range) × idf, L2-normalize the text
vector, then logistic. Does not retrain.

Usage:
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/export_parity_fixtures.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.preprocessing import normalize

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "__tests__/lib/ml/clinicalTrials/parityFixtures.json"
TOKEN_PATTERN = r"(?u)\b\w\w+\b"

CASES: list[dict] = [
    {
        "id": "wh-endometriosis",
        "model": "wh-relevance-v1",
        "input": {
            "title": "Phase 2 Study of LP-101 for Endometriosis Pain",
            "condition": "Endometriosis",
            "sponsor": "Gynecology Pharma",
            "interventions": ["LP-101", "placebo"],
            "phase": "PHASE2",
            "status": "RECRUITING",
            "enrollment": 240,
            "hasResults": False,
        },
    },
    {
        "id": "wh-diabetes",
        "model": "wh-relevance-v1",
        "input": {
            "title": "Phase 3 Metformin for Type 2 Diabetes",
            "condition": "Type 2 Diabetes Mellitus",
            "sponsor": "Metabolic Pharma",
            "interventions": ["Metformin"],
            "phase": "PHASE3",
            "status": "COMPLETED",
            "enrollment": 800,
            "hasResults": True,
        },
    },
    {
        "id": "completion-endometriosis",
        "model": "completion-proxy-v2",
        "input": {
            "title": "Phase 2 Study of LP-101 for Endometriosis Pain",
            "condition": "Endometriosis",
            "sponsor": "Gynecology Pharma",
            "interventions": ["LP-101", "placebo"],
            "phase": "PHASE2",
            "status": "RECRUITING",
            "enrollment": 240,
            "hasResults": False,
        },
    },
    {
        "id": "completion-empty-text",
        "model": "completion-proxy-v2",
        "input": {
            "title": "",
            "condition": "",
            "sponsor": "",
            "interventions": [],
            "phase": "PHASE1",
            "status": "COMPLETED",
            "enrollment": 10,
            "hasResults": False,
        },
    },
]


def trial_text(inp: dict) -> str:
    interventions = ", ".join(inp.get("interventions") or [])
    return " ".join(
        part
        for part in (inp.get("title"), inp.get("condition"), interventions, inp.get("sponsor"))
        if part
    )


def phase_num(phase: str) -> float:
    mapping = {
        "EARLY_PHASE1": 0.5,
        "PHASE1": 1.0,
        "PHASE2": 2.0,
        "PHASE3": 3.0,
        "PHASE4": 4.0,
        "NA": 0.0,
        "Not Applicable": 0.0,
    }
    return mapping.get(phase, mapping.get(phase.upper(), 0.0))


def numeric_by_name(inp: dict, names: list[str]) -> np.ndarray:
    enrollment = max(int(inp.get("enrollment") or 0), 1)
    by_name = {
        "phase_num": phase_num(str(inp.get("phase") or "")),
        "enrollment_log10": math.log10(enrollment),
        "intervention_count": float(len([x for x in (inp.get("interventions") or []) if x])),
        "has_results_flag": 1.0 if inp.get("hasResults") else 0.0,
    }
    return np.array([by_name.get(name, 0.0) for name in names], dtype=float)


def score_artifact(artifact: dict, inp: dict) -> float:
    vocabulary: list[str] = artifact["vocabulary"]
    vocab_dict = {term: idx for idx, term in enumerate(vocabulary) if term}
    text = trial_text(inp)
    vectorizer = CountVectorizer(
        vocabulary=vocab_dict,
        ngram_range=(1, 2),
        lowercase=True,
        token_pattern=TOKEN_PATTERN,
    )
    counts = vectorizer.transform([text]).toarray().astype(float)
    # Align to full artifact width (empty vocab slots stay zero).
    wide = np.zeros((1, len(vocabulary)), dtype=float)
    for term, idx in vocab_dict.items():
        sklearn_idx = vectorizer.vocabulary_[term]
        wide[0, idx] = counts[0, sklearn_idx]
    weighted = wide * np.array(artifact["idf"], dtype=float)
    text_vec = normalize(weighted, norm="l2")[0]
    logit = float(artifact["intercept"]) + float(
        np.dot(text_vec, np.array(artifact["coefficients"], dtype=float))
    )
    names = artifact.get("numericFeatureNames") or []
    coefs = artifact.get("numericCoefficients")
    means = artifact.get("numericMeans")
    scales = artifact.get("numericScales")
    if names and coefs and means and scales:
        numeric = numeric_by_name(inp, names)
        scaled = (numeric - np.array(means, dtype=float)) / np.array(scales, dtype=float)
        logit += float(np.dot(scaled, np.array(coefs, dtype=float)))
    return float(1.0 / (1.0 + math.exp(-logit)))


def load_artifact(name: str) -> dict:
    return json.loads(
        (REPO / "src/data/ml/clinical-trials" / f"{name}.json").read_text(encoding="utf-8")
    )


def main() -> None:
    artifacts = {
        "wh-relevance-v1": load_artifact("wh-relevance-v1"),
        "completion-proxy-v2": load_artifact("completion-proxy-v2"),
    }
    cases = []
    for case in CASES:
        probability = score_artifact(artifacts[case["model"]], case["input"])
        cases.append({**case, "probability": probability})
        print(f"{case['id']}: {probability:.12f}")
    payload = {
        "generatedBy": "ml/clinical_trials/scripts/export_parity_fixtures.py",
        "tolerance": 1e-6,
        "cases": cases,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
