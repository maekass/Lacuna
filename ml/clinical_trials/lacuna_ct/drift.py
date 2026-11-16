"""Population Stability Index (PSI) drift checks for the completion model.

Thresholds follow the common credit-risk convention:

* PSI < 0.10  -> ``stable``
* 0.10 - 0.20 -> ``warn`` (reported, does not fail)
* PSI > 0.20  -> ``drift`` (fails the check)

The reference profile is computed at training time from the frozen snapshot
and committed next to each model artifact, so the scheduled check does not
need the gitignored raw snapshot.
"""

from __future__ import annotations

from typing import Any

import numpy as np

PSI_WARN = 0.10
PSI_ALERT = 0.20
PSI_EPSILON = 1e-4
MAX_CATEGORICAL_LEVELS = 10
QUANTILE_BINS = 10
DRIFT_SCHEMA = "lacuna-psi-reference-v1"


def _proportions(counts: np.ndarray) -> list[float]:
    total = float(counts.sum())
    if total == 0:
        return [0.0] * len(counts)
    return [float(c) / total for c in counts]


def _bin_spec(values: np.ndarray) -> dict[str, Any]:
    uniq = np.unique(values)
    if len(uniq) <= MAX_CATEGORICAL_LEVELS:
        return {"kind": "categorical", "levels": [float(u) for u in uniq]}
    qs = np.quantile(values, np.linspace(0, 1, QUANTILE_BINS + 1)[1:-1])
    edges = sorted({float(q) for q in qs})
    return {"kind": "quantile", "edges": edges}


def _bin_counts(values: np.ndarray, spec: dict[str, Any]) -> np.ndarray:
    values = np.asarray(values, dtype=float)
    if spec["kind"] == "categorical":
        levels = spec["levels"]
        counts = np.zeros(len(levels) + 1)  # last bucket = unseen level
        for v in values:
            matched = False
            for i, lvl in enumerate(levels):
                if np.isclose(v, lvl):
                    counts[i] += 1
                    matched = True
                    break
            if not matched:
                counts[-1] += 1
        return counts
    edges = np.asarray(spec["edges"], dtype=float)
    # right-closed bins: (-inf, e0], (e0, e1], ..., (e_k, inf)
    idx = np.searchsorted(edges, values, side="left")
    return np.bincount(idx, minlength=len(edges) + 1).astype(float)


def _score_spec() -> dict[str, Any]:
    return {"kind": "quantile", "edges": [round(x, 2) for x in np.linspace(0.1, 0.9, 9)]}


def psi(expected: list[float] | np.ndarray, actual: list[float] | np.ndarray) -> float:
    e = np.clip(np.asarray(expected, dtype=float), PSI_EPSILON, None)
    a = np.clip(np.asarray(actual, dtype=float), PSI_EPSILON, None)
    return float(np.sum((a - e) * np.log(a / e)))


def classify(value: float) -> str:
    if value > PSI_ALERT:
        return "drift"
    if value >= PSI_WARN:
        return "warn"
    return "stable"


def build_reference_profile(
    features: np.ndarray, feature_names: list[str], scores: np.ndarray
) -> dict[str, Any]:
    features = np.asarray(features, dtype=float)
    profile: dict[str, Any] = {
        "schema": DRIFT_SCHEMA,
        "n_reference": int(features.shape[0]),
        "thresholds": {"warn": PSI_WARN, "alert": PSI_ALERT},
        "features": {},
    }
    for j, name in enumerate(feature_names):
        spec = _bin_spec(features[:, j])
        profile["features"][name] = {
            **spec,
            "expected": _proportions(_bin_counts(features[:, j], spec)),
        }
    spec = _score_spec()
    profile["score"] = {**spec, "expected": _proportions(_bin_counts(scores, spec))}
    return profile


def compare_to_reference(
    profile: dict[str, Any],
    features: np.ndarray,
    feature_names: list[str],
    scores: np.ndarray,
    *,
    alert: float = PSI_ALERT,
) -> dict[str, Any]:
    features = np.asarray(features, dtype=float)
    if features.shape[0] == 0:
        raise ValueError("No current rows to compare against the reference profile.")
    results: dict[str, Any] = {}
    for j, name in enumerate(feature_names):
        spec = profile["features"][name]
        actual = _proportions(_bin_counts(features[:, j], spec))
        value = psi(spec["expected"], actual)
        results[name] = {"psi": value, "status": classify(value), "actual": actual}
    score_spec = profile["score"]
    score_actual = _proportions(_bin_counts(scores, score_spec))
    score_psi = psi(score_spec["expected"], score_actual)
    drifted = [n for n, r in results.items() if r["psi"] > alert]
    if score_psi > alert:
        drifted.append("prediction_score")
    warned = [n for n, r in results.items() if r["status"] == "warn"]
    if classify(score_psi) == "warn":
        warned.append("prediction_score")
    return {
        "n_current": int(features.shape[0]),
        "n_reference": int(profile.get("n_reference", 0)),
        "thresholds": {"warn": PSI_WARN, "alert": alert},
        "features": results,
        "prediction_score": {
            "psi": score_psi,
            "status": classify(score_psi),
            "actual": score_actual,
        },
        "drifted": drifted,
        "warned": warned,
        "status": "drift" if drifted else ("warn" if warned else "stable"),
    }
