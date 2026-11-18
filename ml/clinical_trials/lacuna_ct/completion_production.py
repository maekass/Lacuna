"""Production training run for the completion-proxy classifier (v3).

Builds on ``completion-proxy-v2`` (TF-IDF + numeric hybrid logistic) and the
governance controls already in ``benchmark_stats``:

* frozen, provenance-verified CT.gov snapshot (never the synthetic seed);
* the repository's pre-declared start-year holdout rule (75th percentile of
  labeled start years; train ``<= cutoff``, test ``> cutoff``);
* a stratified calibration split carved out of the *training* cohort only;
* (a) calibrated logistic baseline and (b) calibrated gradient-boosted
  challenger, both scored on the same untouched holdout rows;
* majority-class and base-rate reference predictors;
* paired bootstrap 95% CIs on the challenger-minus-baseline deltas;
* the existing conjunction export gate (``train.passes_export_gate``);
* a label-leakage audit, including the v2 recipe as a *leaky reference*.

The champion is the challenger only if the paired AUC-delta CI lower bound is
above zero **and** the challenger passes the export gate. Otherwise the
baseline stays champion.
"""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import math
import platform
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from lacuna_ct import completion_features as cf
from lacuna_ct.benchmark_stats import (
    DEFAULT_BOOTSTRAP_RESAMPLES,
    canonical_record_hash,
    cohort_audit,
    paired_bootstrap_comparison,
    probability_metrics,
)
from lacuna_ct.drift import build_reference_profile
from lacuna_ct.fetch_training_data import TrialRecord
from lacuna_ct.train import bootstrap_auc_ci, passes_export_gate

MODEL_ID = "completion-proxy-v3"
BASELINE_VERSION = "3.0.0-logreg"
CHALLENGER_VERSION = "3.0.0-hgb"
SPLIT_SEED = 42
HOLDOUT_QUANTILE = 0.75  # same rule as train.py / tensorflow_benchmark.py
CALIBRATION_FRACTION = 0.20
CALIBRATION_METHOD = "sigmoid"  # Platt scaling, pre-declared for both models
SVD_COMPONENTS = 100
DISCLAIMER = (
    "Operational-status proxy only: estimates the probability that a "
    "ClinicalTrials.gov record ends as COMPLETED rather than TERMINATED, "
    "WITHDRAWN, or SUSPENDED. It is not a prediction of efficacy, endpoint "
    "success, regulatory approval, or investment value."
)
STATUS_TOKENS = (
    "terminat",
    "withdraw",
    "suspend",
    "complet",
    "stopped",
    "halt",
    "discontinu",
)


# --------------------------------------------------------------------------- #
# Data + split
# --------------------------------------------------------------------------- #


def labeled_records(records: list[TrialRecord]) -> list[TrialRecord]:
    rows = sorted(
        (r for r in records if r.label_completed is not None and r.start_year is not None),
        key=lambda r: r.nct_id,
    )
    dupes = [k for k, v in Counter(r.nct_id for r in rows).items() if v > 1]
    if dupes:
        raise ValueError(f"Duplicate NCT ids in snapshot: {dupes[:5]}")
    return rows


def temporal_split(records: list[TrialRecord]) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    years = np.asarray([int(r.start_year) for r in records])  # type: ignore[arg-type]
    ordered = np.sort(years)
    cutoff = int(ordered[int(len(ordered) * HOLDOUT_QUANTILE)])
    train_idx = np.where(years <= cutoff)[0]
    test_idx = np.where(years > cutoff)[0]
    if len(test_idx) < 20 or len(train_idx) < 80:
        raise ValueError("Temporal holdout too small; refusing random fallback for production.")
    return (
        train_idx,
        test_idx,
        {
            "strategy": "start_year_holdout",
            "rule": "cutoff = start_year at the 75th percentile of labeled rows; "
            "train start_year <= cutoff, test start_year > cutoff",
            "cutoff_year": cutoff,
            "excluded_missing_start_year": "rows without start_year are dropped before splitting",
        },
    )


def calibration_split(train_idx: np.ndarray, labels: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    fit_idx, cal_idx = train_test_split(
        train_idx,
        test_size=CALIBRATION_FRACTION,
        random_state=SPLIT_SEED,
        stratify=labels[train_idx],
    )
    return np.asarray(fit_idx), np.asarray(cal_idx)


def record_to_trial(record: TrialRecord) -> dict[str, Any]:
    return {
        "title": record.title,
        "condition": record.condition,
        "interventions": record.interventions,
        "sponsor": record.sponsor,
        "phase": record.phase,
        "study_type": record.study_type,
    }


def design_matrix(records: list[TrialRecord]) -> np.ndarray:
    return np.asarray([cf.model_row(record_to_trial(r)) for r in records], dtype=object)


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #

_NUMERIC_COLS = list(range(1, 1 + len(cf.NUMERIC_FEATURE_NAMES)))


def _tfidf() -> TfidfVectorizer:
    return TfidfVectorizer(max_features=5000, ngram_range=(1, 2), min_df=2)


def build_logistic() -> Pipeline:
    """v2 hybrid recipe (TF-IDF + scaled numeric, balanced logistic) on v3 features."""
    return Pipeline(
        [
            (
                "features",
                ColumnTransformer(
                    [("tfidf", _tfidf(), 0), ("num", StandardScaler(), _NUMERIC_COLS)]
                ),
            ),
            (
                "clf",
                LogisticRegression(max_iter=1500, class_weight="balanced", random_state=SPLIT_SEED),
            ),
        ]
    )


def build_hgb() -> Pipeline:
    return Pipeline(
        [
            (
                "features",
                ColumnTransformer(
                    [
                        (
                            "text_svd",
                            Pipeline(
                                [
                                    ("tfidf", _tfidf()),
                                    (
                                        "svd",
                                        TruncatedSVD(
                                            n_components=SVD_COMPONENTS, random_state=SPLIT_SEED
                                        ),
                                    ),
                                ]
                            ),
                            0,
                        ),
                        ("num", StandardScaler(), _NUMERIC_COLS),
                    ]
                ),
            ),
            (
                "clf",
                HistGradientBoostingClassifier(
                    learning_rate=0.05,
                    max_iter=300,
                    max_leaf_nodes=31,
                    l2_regularization=1.0,
                    early_stopping=True,
                    validation_fraction=0.1,
                    n_iter_no_change=20,
                    random_state=SPLIT_SEED,
                ),
            ),
        ]
    )


def fit_calibrated(
    estimator: Pipeline,
    X: np.ndarray,
    y: np.ndarray,
    fit_idx: np.ndarray,
    cal_idx: np.ndarray,
) -> CalibratedClassifierCV:
    estimator.fit(X[fit_idx], y[fit_idx])
    calibrated = CalibratedClassifierCV(FrozenEstimator(estimator), method=CALIBRATION_METHOD)
    calibrated.fit(X[cal_idx], y[cal_idx])
    return calibrated


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #


def _bootstrap_metric_ci(
    y: np.ndarray, p: np.ndarray, fn: Any, *, n: int, seed: int = 42
) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    vals: list[float] = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        vals.append(float(fn(y[idx], p[idx])))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return float(lo), float(hi)


def _brier(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.mean(np.square(p - y)))


def _logloss(y: np.ndarray, p: np.ndarray) -> float:
    q = np.clip(p, 1e-7, 1 - 1e-7)
    return float(-np.mean(y * np.log(q) + (1 - y) * np.log(1 - q)))


def evaluate(y: np.ndarray, p: np.ndarray, *, n_boot: int) -> dict[str, Any]:
    metrics = probability_metrics(y, p)
    lo, hi = bootstrap_auc_ci(y, np.asarray(p, dtype=float), n=n_boot)
    metrics["roc_auc_ci_lower"] = lo
    metrics["roc_auc_ci_upper"] = hi
    metrics["brier_ci_95"] = list(_bootstrap_metric_ci(y, p, _brier, n=n_boot))
    metrics["log_loss_ci_95"] = list(_bootstrap_metric_ci(y, p, _logloss, n=n_boot))
    metrics["n"] = int(len(y))
    gate_ok, gate_reason = passes_export_gate(metrics)
    metrics["export_gate"] = {"passes": bool(gate_ok), "reason": gate_reason}
    return metrics


def reference_predictors(y_train: np.ndarray, y_test: np.ndarray) -> dict[str, Any]:
    """Constant predictors fitted on the training cohort only."""
    train_rate = float(np.mean(y_train))
    majority_class = int(train_rate >= 0.5)
    n = len(y_test)
    base = np.full(n, train_rate)
    majority = np.full(n, float(majority_class))
    return {
        "majority_class": {
            "description": f"Always predicts class {majority_class} (training majority) with probability 1.",
            "accuracy": float(np.mean(y_test == majority_class)),
            "roc_auc": 0.5,
            "brier": _brier(y_test, majority),
            "log_loss": _logloss(y_test, majority),
        },
        "base_rate": {
            "description": f"Always predicts the training completion rate p={train_rate:.4f}.",
            "train_positive_rate": train_rate,
            "accuracy": float(np.mean(y_test == int(train_rate >= 0.5))),
            "roc_auc": 0.5,
            "brier": _brier(y_test, base),
            "log_loss": _logloss(y_test, base),
            "expected_calibration_error": float(abs(train_rate - np.mean(y_test))),
        },
    }


# --------------------------------------------------------------------------- #
# Leakage audit
# --------------------------------------------------------------------------- #


def leakage_audit(
    records: list[TrialRecord],
    labels: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    *,
    n_boot: int,
) -> dict[str, Any]:
    y_test = labels[test_idx]
    enroll = np.asarray([math.log10(max(int(r.enrollment or 0), 1)) for r in records])
    status_counts: dict[str, dict[str, Any]] = {}
    for status in ("COMPLETED", "TERMINATED", "WITHDRAWN", "SUSPENDED"):
        rows = [r for r in records if r.status == status]
        if not rows:
            continue
        status_counts[status] = {
            "n": len(rows),
            "enrollment_zero_fraction": float(np.mean([int(r.enrollment or 0) == 0 for r in rows])),
            "enrollment_median": float(np.median([int(r.enrollment or 0) for r in rows])),
            "has_results_fraction": float(np.mean([bool(r.has_results) for r in rows])),
        }

    token_counts: dict[str, dict[str, int]] = {}
    for token in STATUS_TOKENS:
        c = Counter(
            int(r.label_completed)  # type: ignore[arg-type]
            for r in records
            if token in r.text_corpus().lower()
        )
        token_counts[token] = {"completed": c.get(1, 0), "stopped": c.get(0, 0)}

    # v2 recipe (text + phase_num + enrollment_log10, uncalibrated) on the same
    # split: quantifies how much the leaky enrollment field inflates metrics.
    texts = np.asarray([r.text_corpus() for r in records], dtype=object)
    phase = np.asarray([cf.phase_to_num(r.phase) for r in records])
    X_v2 = np.column_stack([texts, phase, enroll]).astype(object)
    v2 = Pipeline(
        [
            (
                "features",
                ColumnTransformer([("tfidf", _tfidf(), 0), ("num", StandardScaler(), [1, 2])]),
            ),
            ("clf", LogisticRegression(max_iter=1500, class_weight="balanced")),
        ]
    )
    v2.fit(X_v2[train_idx], labels[train_idx])
    p_v2 = v2.predict_proba(X_v2[test_idx])[:, 1]
    lo, hi = bootstrap_auc_ci(y_test, p_v2, n=n_boot)

    return {
        "excluded_fields": cf.EXCLUDED_FIELDS,
        "enrollment_by_status": status_counts,
        "enrollment_log10_alone_holdout_auc": float(roc_auc_score(y_test, enroll[test_idx])),
        "has_results_unique_values_in_snapshot": sorted({bool(r.has_results) for r in records}),
        "has_results_note": (
            "The ingest field filter does not request resultsSection, so has_results is "
            "constant False in this snapshot. It is excluded regardless because results "
            "posting happens after the outcome."
        ),
        "status_token_occurrences_in_text": token_counts,
        "status_token_note": (
            "Status-like substrings are rare in title/condition/intervention/sponsor text and "
            "are not concentrated in stopped trials, so text is kept without a stop list."
        ),
        "v2_recipe_with_enrollment_reference": {
            "description": "completion-proxy-v2 features (text + phase_num + enrollment_log10), "
            "uncalibrated, same split. Leaky reference only; never eligible for promotion.",
            "roc_auc": float(roc_auc_score(y_test, p_v2)),
            "roc_auc_ci_95": [lo, hi],
            "brier": _brier(y_test, p_v2),
        },
    }


# --------------------------------------------------------------------------- #
# Plot + registry
# --------------------------------------------------------------------------- #


def reliability_plot(
    path: Path, y: np.ndarray, curves: dict[str, np.ndarray], title: str
) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from lacuna_ct.benchmark_stats import expected_calibration_error, reliability_bins

    fig, (ax, hx) = plt.subplots(
        2, 1, figsize=(6.4, 7.2), gridspec_kw={"height_ratios": [3, 1]}, sharex=True
    )
    ax.plot([0, 1], [0, 1], linestyle="--", color="#888", label="Perfect calibration")
    for (name, p), color in zip(curves.items(), ("#1f77b4", "#d62728", "#2ca02c")):
        bins = [b for b in reliability_bins(y, p) if b["count"]]
        ece = expected_calibration_error(y, p)
        ax.plot(
            [b["mean_probability"] for b in bins],
            [b["event_rate"] for b in bins],
            marker="o",
            color=color,
            label=f"{name} (ECE {ece:.3f})",
        )
        for b in bins:
            ax.annotate(
                f"n={b['count']}",
                (b["mean_probability"], b["event_rate"]),
                textcoords="offset points",
                xytext=(-28, 6),
                fontsize=6,
                color=color,
            )
        hx.hist(p, bins=20, range=(0, 1), alpha=0.5, color=color, label=name)
    ax.set_ylabel("Observed completion rate (equal-width bins)")
    ax.set_title(title, fontsize=10)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.legend(loc="upper left", fontsize=8)
    hx.set_xlabel("Predicted probability of COMPLETED")
    hx.set_ylabel("Trials")
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=120)
    plt.close(fig)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _git_sha() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return None


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def promotion_decision(
    baseline: dict[str, Any], challenger: dict[str, Any], paired: dict[str, Any]
) -> dict[str, Any]:
    auc_ci_lower = float(paired["roc_auc_delta"]["ci_95_lower"])
    beats_by_ci = auc_ci_lower > 0.0
    challenger_gate = bool(challenger["export_gate"]["passes"])
    promote = beats_by_ci and challenger_gate
    champion = CHALLENGER_VERSION if promote else BASELINE_VERSION
    reasons = []
    if not beats_by_ci:
        reasons.append(
            f"paired ROC AUC delta 95% CI lower bound {auc_ci_lower:.4f} is not above 0"
        )
    if not challenger_gate:
        reasons.append(f"challenger fails export gate: {challenger['export_gate']['reason']}")
    return {
        "rule": "challenger is champion iff paired ROC AUC delta CI lower > 0 AND "
        "challenger passes the conjunction export gate; otherwise baseline stays",
        "challenger_beats_baseline_by_paired_ci": beats_by_ci,
        "challenger_passes_export_gate": challenger_gate,
        "baseline_passes_export_gate": bool(baseline["export_gate"]["passes"]),
        "champion_version": champion,
        "promoted_challenger": promote,
        "reasons_challenger_not_promoted": reasons,
    }


def run(
    records: list[TrialRecord],
    *,
    snapshot_meta: dict[str, Any],
    registry_dir: Path,
    archive_dir: Path,
    n_boot: int = DEFAULT_BOOTSTRAP_RESAMPLES,
) -> dict[str, Any]:
    """Train both models, write the registry (champion artifact only).

    Non-champion artifacts go to ``archive_dir`` (gitignored output) so the
    served registry only contains versions that the promotion rule selected.
    """
    if snapshot_meta.get("source") != "clinicaltrials_gov_api_v2":
        raise ValueError(
            f"Refusing to train production model on source={snapshot_meta.get('source')!r}."
        )
    labeled = labeled_records(records)
    labels = np.asarray([int(r.label_completed) for r in labeled])  # type: ignore[arg-type]
    X = design_matrix(labeled)
    train_idx, test_idx, split = temporal_split(labeled)
    fit_idx, cal_idx = calibration_split(train_idx, labels)
    y_test = labels[test_idx]

    baseline_model = fit_calibrated(build_logistic(), X, labels, fit_idx, cal_idx)
    challenger_model = fit_calibrated(build_hgb(), X, labels, fit_idx, cal_idx)
    p_base = baseline_model.predict_proba(X[test_idx])[:, 1]
    p_chal = challenger_model.predict_proba(X[test_idx])[:, 1]

    m_base = evaluate(y_test, p_base, n_boot=n_boot)
    m_chal = evaluate(y_test, p_chal, n_boot=n_boot)
    paired = paired_bootstrap_comparison(y_test, p_base, p_chal, n_resamples=n_boot)
    paired["direction"] = {
        "roc_auc_delta": "positive_favors_challenger",
        "pr_auc_delta": "positive_favors_challenger",
        "brier_delta": "negative_favors_challenger",
        "log_loss_delta": "negative_favors_challenger",
    }
    decision = promotion_decision(m_base, m_chal, paired)
    refs = reference_predictors(labels[train_idx], y_test)
    base_rate_probs = np.full(len(y_test), refs["base_rate"]["train_positive_rate"])
    vs_base_rate = {
        name: paired_bootstrap_comparison(y_test, base_rate_probs, probs, n_resamples=n_boot)
        for name, probs in ((BASELINE_VERSION, p_base), (CHALLENGER_VERSION, p_chal))
    }
    for item in vs_base_rate.values():
        item["direction"] = {
            "brier_delta": "negative_favors_model_over_base_rate",
            "log_loss_delta": "negative_favors_model_over_base_rate",
        }
    leakage = leakage_audit(labeled, labels, train_idx, test_idx, n_boot=n_boot)
    cohort = cohort_audit(labeled, labels, train_idx, test_idx)

    registry_dir.mkdir(parents=True, exist_ok=True)
    trained_at = datetime.now(timezone.utc).isoformat()
    sklearn_version = importlib.metadata.version("scikit-learn")

    split_payload = {
        **split,
        "calibration": {
            "fraction_of_train": CALIBRATION_FRACTION,
            "method": CALIBRATION_METHOD,
            "seed": SPLIT_SEED,
            "stratified": True,
        },
        "train_nct_ids": sorted(labeled[int(i)].nct_id for i in fit_idx),
        "calibration_nct_ids": sorted(labeled[int(i)].nct_id for i in cal_idx),
        "test_nct_ids": sorted(labeled[int(i)].nct_id for i in test_idx),
    }
    split_payload["split_sha256"] = hashlib.sha256(
        json.dumps(
            [split_payload["train_nct_ids"], split_payload["calibration_nct_ids"], split_payload["test_nct_ids"]],
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    _write_json(registry_dir / "split.json", split_payload)

    reliability_plot(
        registry_dir / "reliability.png",
        y_test,
        {"Logistic (Platt)": p_base, "HistGB (Platt)": p_chal},
        f"Temporal holdout: start year > {split['cutoff_year']} (n={len(y_test)})",
    )

    all_X = design_matrix(records)
    versions: dict[str, Any] = {}
    not_served: dict[str, Any] = {}
    for version, model, metrics, family in (
        (BASELINE_VERSION, baseline_model, m_base, "logistic_regression_tfidf_numeric"),
        (CHALLENGER_VERSION, challenger_model, m_chal, "hist_gradient_boosting_tfidf_svd_numeric"),
    ):
        served = version == decision["champion_version"]
        vdir = (registry_dir if served else archive_dir) / version
        vdir.mkdir(parents=True, exist_ok=True)
        model_path = vdir / "model.joblib"
        joblib.dump(model, model_path, compress=3)
        drift_ref = build_reference_profile(
            all_X[:, 1:].astype(float),
            list(cf.NUMERIC_FEATURE_NAMES),
            model.predict_proba(all_X)[:, 1],
        )
        drift_ref["population"] = "all rows of the frozen training snapshot (all statuses)"
        _write_json(vdir / "drift_reference.json", drift_ref)
        compact_metrics = {k: v for k, v in metrics.items() if k != "reliability_bins"}
        entry = {
            "model_family": family,
            "artifact": f"{version}/model.joblib",
            "artifact_sha256": file_sha256(model_path),
            "drift_reference": f"{version}/drift_reference.json",
            "calibration": CALIBRATION_METHOD,
            "holdout_metrics": compact_metrics,
            "reliability_bins": metrics["reliability_bins"],
        }
        if served:
            versions[version] = entry
        else:
            entry["artifact_location"] = "gitignored archive (not served)"
            entry.pop("artifact")
            entry.pop("drift_reference")
            not_served[version] = entry

    # Parity fixtures let the API test assert identical probabilities.
    fixture_rows = [labeled[int(i)] for i in test_idx[:: max(1, len(test_idx) // 12)][:12]]
    fixtures = []
    for r in fixture_rows:
        row = np.asarray([cf.model_row(record_to_trial(r))], dtype=object)
        fixtures.append(
            {
                "nct_id": r.nct_id,
                "trial": record_to_trial(r),
                "expected": {
                    decision["champion_version"]: float(
                        (baseline_model if decision["champion_version"] == BASELINE_VERSION else challenger_model)
                        .predict_proba(row)[0, 1]
                    ),
                },
            }
        )
    _write_json(registry_dir / "parity_fixtures.json", fixtures)

    evaluation = {
        "model_id": MODEL_ID,
        "trained_at_utc": trained_at,
        "git_sha_at_training": _git_sha(),
        "snapshot": {
            "source": snapshot_meta.get("source"),
            "generated_at_utc": snapshot_meta.get("generated_at_utc"),
            "snapshot_file_sha256": snapshot_meta.get("snapshot_file_sha256"),
            "canonical_record_sha256": snapshot_meta.get("canonical_record_sha256"),
            "record_count": snapshot_meta.get("record_count"),
            "ingest_details": snapshot_meta.get("details"),
            "labeled_with_start_year": len(labeled),
            "labeled_rows_sha256": canonical_record_hash(labeled),
        },
        "split": {k: v for k, v in split_payload.items() if not k.endswith("_nct_ids")},
        "counts": {
            "train_fit": int(len(fit_idx)),
            "calibration": int(len(cal_idx)),
            "test": int(len(test_idx)),
        },
        "cohort_audit": cohort,
        "features": {
            "featurizer_version": cf.FEATURIZER_VERSION,
            "text": "TF-IDF(1-2 grams, max 5000, min_df 2) of title + condition + interventions + sponsor",
            "numeric": list(cf.NUMERIC_FEATURE_NAMES),
        },
        "models": {
            BASELINE_VERSION: {k: v for k, v in m_base.items() if k != "reliability_bins"},
            CHALLENGER_VERSION: {k: v for k, v in m_chal.items() if k != "reliability_bins"},
        },
        "reference_predictors": refs,
        "paired_bootstrap_challenger_minus_baseline": paired,
        "paired_bootstrap_model_minus_base_rate": vs_base_rate,
        "promotion": decision,
        "leakage_audit": leakage,
        "runtime": {
            "python": platform.python_version(),
            "scikit_learn": sklearn_version,
            "numpy": importlib.metadata.version("numpy"),
        },
    }
    _write_json(registry_dir / "evaluation.json", evaluation)

    manifest = {
        "schema": "lacuna-model-registry-v1",
        "model_id": MODEL_ID,
        "task": "trial_completion_proxy",
        "positive_label": "COMPLETED",
        "negative_labels": ["TERMINATED", "WITHDRAWN", "SUSPENDED"],
        "champion": decision["champion_version"],
        "featurizer_version": cf.FEATURIZER_VERSION,
        "numeric_feature_names": list(cf.NUMERIC_FEATURE_NAMES),
        "sklearn_version": sklearn_version,
        "trained_at_utc": trained_at,
        "training_snapshot_sha256": snapshot_meta.get("snapshot_file_sha256"),
        "split": {
            "strategy": split["strategy"],
            "cutoff_year": split["cutoff_year"],
            "split_sha256": split_payload["split_sha256"],
            "n_test": int(len(test_idx)),
        },
        "promotion": decision,
        "disclaimer": DISCLAIMER,
        "versions": versions,
        "evaluated_not_served": not_served,
    }
    _write_json(registry_dir / "manifest.json", manifest)
    return evaluation
