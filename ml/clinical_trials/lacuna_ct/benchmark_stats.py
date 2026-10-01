"""Statistical controls for the ClinicalTrials.gov TensorFlow benchmark.

This module intentionally contains no TensorFlow imports so the evaluation,
governance, and split logic can be tested in ordinary CI.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from typing import Any, Callable, Iterable

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)

BOOTSTRAP_SEED = 1729
DEFAULT_BOOTSTRAP_RESAMPLES = 2000
CALIBRATION_BINS = 10
EPSILON = 1e-7


def _safe_probabilities(probabilities: np.ndarray) -> np.ndarray:
    values = np.asarray(probabilities, dtype=float)
    return np.clip(values, EPSILON, 1.0 - EPSILON)


def reliability_bins(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    *,
    n_bins: int = CALIBRATION_BINS,
) -> list[dict[str, float | int | None]]:
    """Return equal-width reliability bins with explicit empty bins."""
    y = np.asarray(y_true, dtype=int)
    probs = _safe_probabilities(probabilities)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    result: list[dict[str, float | int | None]] = []

    for idx in range(n_bins):
        lower = float(edges[idx])
        upper = float(edges[idx + 1])
        if idx == n_bins - 1:
            mask = (probs >= lower) & (probs <= upper)
        else:
            mask = (probs >= lower) & (probs < upper)

        count = int(mask.sum())
        if count == 0:
            result.append(
                {
                    "lower": lower,
                    "upper": upper,
                    "count": 0,
                    "mean_probability": None,
                    "event_rate": None,
                    "absolute_gap": None,
                }
            )
            continue

        mean_probability = float(np.mean(probs[mask]))
        event_rate = float(np.mean(y[mask]))
        result.append(
            {
                "lower": lower,
                "upper": upper,
                "count": count,
                "mean_probability": mean_probability,
                "event_rate": event_rate,
                "absolute_gap": abs(mean_probability - event_rate),
            }
        )

    return result


def expected_calibration_error(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    *,
    n_bins: int = CALIBRATION_BINS,
) -> float:
    """Weighted expected calibration error over equal-width bins."""
    total = len(y_true)
    if total == 0:
        return 0.0

    weighted_gap = 0.0
    for item in reliability_bins(y_true, probabilities, n_bins=n_bins):
        count = int(item["count"])
        gap = item["absolute_gap"]
        if count and gap is not None:
            weighted_gap += (count / total) * float(gap)
    return float(weighted_gap)


def probability_metrics(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    *,
    threshold: float = 0.5,
) -> dict[str, Any]:
    """Compute discrimination, calibration, and thresholded diagnostics."""
    y = np.asarray(y_true, dtype=int)
    probs = _safe_probabilities(probabilities)
    predictions = (probs >= threshold).astype(int)
    base_rate = float(np.mean(y))
    majority = float(max(np.mean(y == 0), np.mean(y == 1)))
    brier = float(np.mean(np.square(probs - y)))

    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy_score(y, predictions)),
        "precision": float(precision_score(y, predictions, zero_division=0)),
        "recall": float(recall_score(y, predictions, zero_division=0)),
        "f1": float(f1_score(y, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, probs)),
        "pr_auc": float(average_precision_score(y, probs)),
        "brier": brier,
        "log_loss": float(log_loss(y, probs, labels=[0, 1])),
        "expected_calibration_error": expected_calibration_error(y, probs),
        "reliability_bins": reliability_bins(y, probs),
        "positive_rate": base_rate,
        "majority_baseline_accuracy": majority,
        "base_rate_brier": float(base_rate * (1.0 - base_rate)),
    }


def _bootstrap_ci(values: list[float]) -> tuple[float, float]:
    if not values:
        return 0.0, 0.0
    lower, upper = np.percentile(np.asarray(values), [2.5, 97.5])
    return float(lower), float(upper)


def paired_bootstrap_comparison(
    y_true: np.ndarray,
    baseline_probabilities: np.ndarray,
    challenger_probabilities: np.ndarray,
    *,
    n_resamples: int = DEFAULT_BOOTSTRAP_RESAMPLES,
    seed: int = BOOTSTRAP_SEED,
) -> dict[str, Any]:
    """Paired bootstrap of challenger-minus-baseline metric deltas."""
    y = np.asarray(y_true, dtype=int)
    baseline = _safe_probabilities(baseline_probabilities)
    challenger = _safe_probabilities(challenger_probabilities)

    if not (len(y) == len(baseline) == len(challenger)):
        raise ValueError("Paired bootstrap arrays must have equal length.")
    if len(np.unique(y)) < 2:
        raise ValueError("Paired bootstrap requires both outcome classes.")

    point = {
        "roc_auc_delta": float(
            roc_auc_score(y, challenger) - roc_auc_score(y, baseline)
        ),
        "pr_auc_delta": float(
            average_precision_score(y, challenger)
            - average_precision_score(y, baseline)
        ),
        "brier_delta": float(
            np.mean(np.square(challenger - y))
            - np.mean(np.square(baseline - y))
        ),
        "log_loss_delta": float(
            log_loss(y, challenger, labels=[0, 1])
            - log_loss(y, baseline, labels=[0, 1])
        ),
    }

    samples: dict[str, list[float]] = {key: [] for key in point}
    rng = np.random.default_rng(seed)
    accepted = 0

    for _ in range(n_resamples):
        idx = rng.integers(0, len(y), len(y))
        y_sample = y[idx]
        if len(np.unique(y_sample)) < 2:
            continue

        base_sample = baseline[idx]
        challenger_sample = challenger[idx]
        samples["roc_auc_delta"].append(
            float(
                roc_auc_score(y_sample, challenger_sample)
                - roc_auc_score(y_sample, base_sample)
            )
        )
        samples["pr_auc_delta"].append(
            float(
                average_precision_score(y_sample, challenger_sample)
                - average_precision_score(y_sample, base_sample)
            )
        )
        samples["brier_delta"].append(
            float(
                np.mean(np.square(challenger_sample - y_sample))
                - np.mean(np.square(base_sample - y_sample))
            )
        )
        samples["log_loss_delta"].append(
            float(
                log_loss(y_sample, challenger_sample, labels=[0, 1])
                - log_loss(y_sample, base_sample, labels=[0, 1])
            )
        )
        accepted += 1

    result: dict[str, Any] = {
        "method": "paired_nonparametric_bootstrap",
        "requested_resamples": int(n_resamples),
        "accepted_resamples": int(accepted),
        "seed": int(seed),
        "direction": {
            "roc_auc_delta": "positive_favors_tensorflow",
            "pr_auc_delta": "positive_favors_tensorflow",
            "brier_delta": "negative_favors_tensorflow",
            "log_loss_delta": "negative_favors_tensorflow",
        },
    }

    for metric_name, point_value in point.items():
        lower, upper = _bootstrap_ci(samples[metric_name])
        result[metric_name] = {
            "point": point_value,
            "ci_95_lower": lower,
            "ci_95_upper": upper,
        }

    return result


def canonical_record_hash(records: Iterable[Any]) -> str:
    """Hash the model-relevant public trial snapshot independent of row order."""
    rows: list[dict[str, Any]] = []
    for record in records:
        rows.append(
            {
                "nct_id": record.nct_id,
                "title": record.title,
                "phase": record.phase,
                "status": record.status,
                "condition": record.condition,
                "sponsor": record.sponsor,
                "enrollment": int(record.enrollment),
                "interventions": record.interventions,
                "label_completed": record.label_completed,
                "source_query": record.source_query,
                "has_results": bool(record.has_results),
                "study_type": record.study_type,
                "start_year": record.start_year,
                "sponsor_class": record.sponsor_class,
            }
        )

    rows.sort(key=lambda item: (item["nct_id"], item["source_query"]))
    canonical = json.dumps(
        rows,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def split_hash(
    records: list[Any],
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    development_idx: np.ndarray,
    validation_idx: np.ndarray,
) -> str:
    payload = {
        "train": sorted(records[int(i)].nct_id for i in train_idx),
        "test": sorted(records[int(i)].nct_id for i in test_idx),
        "development": sorted(records[int(i)].nct_id for i in development_idx),
        "validation": sorted(records[int(i)].nct_id for i in validation_idx),
    }
    canonical = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _year_range(records: list[Any], indices: np.ndarray) -> dict[str, int | None]:
    years = [
        int(records[int(i)].start_year)
        for i in indices
        if records[int(i)].start_year is not None
    ]
    return {
        "min": min(years) if years else None,
        "max": max(years) if years else None,
    }


def cohort_audit(
    records: list[Any],
    labels: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
) -> dict[str, Any]:
    """Describe temporal separation, class balance, and sponsor overlap."""
    train_sponsors = {
        records[int(i)].sponsor.strip().casefold()
        for i in train_idx
        if records[int(i)].sponsor.strip()
    }
    test_sponsors = [
        records[int(i)].sponsor.strip().casefold()
        for i in test_idx
        if records[int(i)].sponsor.strip()
    ]
    seen_test_sponsors = [sponsor for sponsor in test_sponsors if sponsor in train_sponsors]

    train_ids = {records[int(i)].nct_id for i in train_idx}
    test_ids = {records[int(i)].nct_id for i in test_idx}

    return {
        "train_class_counts": {
            str(key): int(value)
            for key, value in sorted(Counter(labels[train_idx]).items())
        },
        "test_class_counts": {
            str(key): int(value)
            for key, value in sorted(Counter(labels[test_idx]).items())
        },
        "train_start_year_range": _year_range(records, train_idx),
        "test_start_year_range": _year_range(records, test_idx),
        "nct_id_overlap_count": len(train_ids & test_ids),
        "unique_train_sponsors": len(train_sponsors),
        "test_rows_with_known_sponsor": len(test_sponsors),
        "test_rows_with_sponsor_seen_in_train": len(seen_test_sponsors),
        "test_sponsor_overlap_fraction": (
            float(len(seen_test_sponsors) / len(test_sponsors))
            if test_sponsors
            else 0.0
        ),
    }


def seed_robustness(
    baseline_metrics: dict[str, Any],
    tensorflow_seed_metrics: list[dict[str, Any]],
) -> dict[str, Any]:
    """Summarize whether the direction of improvement survives seed changes."""
    if not tensorflow_seed_metrics:
        return {
            "seed_count": 0,
            "seeds_beating_baseline_auc_and_brier": 0,
            "fraction_beating_baseline_auc_and_brier": 0.0,
            "all_seeds_beat_baseline_auc_and_brier": False,
        }

    wins = sum(
        1
        for metrics in tensorflow_seed_metrics
        if float(metrics["roc_auc"]) > float(baseline_metrics["roc_auc"])
        and float(metrics["brier"]) < float(baseline_metrics["brier"])
    )
    count = len(tensorflow_seed_metrics)
    return {
        "seed_count": count,
        "seeds_beating_baseline_auc_and_brier": wins,
        "fraction_beating_baseline_auc_and_brier": float(wins / count),
        "all_seeds_beat_baseline_auc_and_brier": wins == count,
    }


def promotion_gate(
    *,
    training_source: str,
    split_strategy: str,
    cohort: dict[str, Any],
    paired: dict[str, Any],
    robustness: dict[str, Any],
) -> dict[str, Any]:
    """Research promotion gate; passing does not authorize production serving."""
    test_counts = {
        int(key): int(value)
        for key, value in cohort.get("test_class_counts", {}).items()
    }

    checks = {
        "non_synthetic_snapshot": training_source
        in {"ctgov_cached", "ctgov_live_snapshot"},
        "temporal_holdout": split_strategy == "start_year_holdout",
        "no_nct_overlap": int(cohort.get("nct_id_overlap_count", 1)) == 0,
        "both_test_classes_at_least_20": min(
            test_counts.get(0, 0),
            test_counts.get(1, 0),
        )
        >= 20,
        "auc_delta_ci_excludes_zero": float(
            paired["roc_auc_delta"]["ci_95_lower"]
        )
        > 0.0,
        "brier_delta_ci_excludes_zero": float(
            paired["brier_delta"]["ci_95_upper"]
        )
        < 0.0,
        "log_loss_delta_ci_excludes_zero": float(
            paired["log_loss_delta"]["ci_95_upper"]
        )
        < 0.0,
        "all_declared_seeds_improve_auc_and_brier": bool(
            robustness.get("all_seeds_beat_baseline_auc_and_brier", False)
        ),
    }
    failures = [name for name, passed in checks.items() if not passed]

    return {
        "gate_version": "institutional-benchmark-v1",
        "candidate_for_model_risk_review": not failures,
        "production_authorized": False,
        "checks": checks,
        "failed_checks": failures,
        "interpretation": (
            "Passing permits formal model-risk review only. It does not authorize "
            "runtime serving, clinical claims, investment use, or artifact promotion."
        ),
    }


def metric_seed_summary(
    seed_metrics: list[dict[str, Any]],
    metric_names: tuple[str, ...] = (
        "roc_auc",
        "pr_auc",
        "brier",
        "log_loss",
        "expected_calibration_error",
    ),
) -> dict[str, Any]:
    """Mean, sample standard deviation, min, and max across declared seeds."""
    result: dict[str, Any] = {}
    for metric_name in metric_names:
        values = np.asarray(
            [float(metrics[metric_name]) for metrics in seed_metrics],
            dtype=float,
        )
        result[metric_name] = {
            "mean": float(np.mean(values)),
            "std": float(np.std(values, ddof=1)) if len(values) > 1 else 0.0,
            "min": float(np.min(values)),
            "max": float(np.max(values)),
        }
    return result
