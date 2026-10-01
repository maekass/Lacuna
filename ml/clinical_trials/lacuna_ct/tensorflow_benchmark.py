"""Institutional benchmark for the ClinicalTrials.gov completion proxy.

TensorFlow is a challenger model only. This module never exports weights to the
Next.js app, never trains on the M&A catalog, and never authorizes promotion.
"""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import platform
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from lacuna_ct.benchmark_stats import (
    DEFAULT_BOOTSTRAP_RESAMPLES,
    canonical_record_hash,
    cohort_audit,
    metric_seed_summary,
    paired_bootstrap_comparison,
    probability_metrics,
    promotion_gate,
    seed_robustness,
    split_hash,
)
from lacuna_ct.features import NUMERIC_FEATURE_NAMES, row_numeric_features
from lacuna_ct.fetch_training_data import TrialRecord

MODEL_ID = "completion-tensorflow-benchmark-v1"
MIN_LABELED_RECORDS = 120
SPLIT_SEED = 42
DEFAULT_TENSORFLOW_SEEDS = (17, 42, 89)
VALIDATION_FRACTION = 0.15
MAX_EPOCHS = 50
EARLY_STOPPING_PATIENCE = 5
CANONICAL_MODEL_SEED = 42


def _split_indices(
    records: list[TrialRecord],
    labels: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    """Create a pre-declared temporal holdout, with explicit fallback metadata."""
    years = [record.start_year for record in records]

    if all(year is not None for year in years) and len(set(years)) >= 4:
        ordered_years = sorted(int(year) for year in years if year is not None)
        cutoff = ordered_years[int(len(ordered_years) * 0.75)]
        train_mask = np.array(
            [year is not None and int(year) <= cutoff for year in years],
            dtype=bool,
        )
        test_mask = ~train_mask

        if test_mask.sum() >= 20 and train_mask.sum() >= 80:
            return (
                np.where(train_mask)[0],
                np.where(test_mask)[0],
                {
                    "strategy": "start_year_holdout",
                    "cutoff_year": int(cutoff),
                    "rule": "train_start_year_lte_cutoff_test_start_year_gt_cutoff",
                },
            )

    train_idx, test_idx = train_test_split(
        np.arange(len(records)),
        test_size=0.2,
        random_state=SPLIT_SEED,
        stratify=labels,
    )
    return (
        np.asarray(train_idx),
        np.asarray(test_idx),
        {
            "strategy": "stratified_random_fallback",
            "random_seed": SPLIT_SEED,
            "promotion_eligible": False,
            "reason": (
                "Temporal holdout unavailable because start-year coverage or "
                "cohort size was insufficient."
            ),
        },
    )


def _development_split(
    train_idx: np.ndarray,
    labels: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Split the training cohort for epoch selection without touching test data."""
    train_labels = labels[train_idx]
    counts = Counter(int(value) for value in train_labels)
    if len(counts) < 2 or min(counts.values()) < 2:
        raise ValueError(
            "Training cohort needs at least two observations in each class "
            "to create a stratified validation set."
        )

    development_idx, validation_idx = train_test_split(
        train_idx,
        test_size=VALIDATION_FRACTION,
        random_state=SPLIT_SEED,
        stratify=train_labels,
    )
    return np.asarray(development_idx), np.asarray(validation_idx)


def _fit_logistic_baseline(
    texts: list[str],
    numeric: np.ndarray,
    labels: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
) -> tuple[dict[str, Any], np.ndarray]:
    """Fit the pre-declared classical baseline on the full training cohort."""
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=2,
    )
    text_train = vectorizer.fit_transform([texts[int(i)] for i in train_idx])
    text_test = vectorizer.transform([texts[int(i)] for i in test_idx])

    scaler = StandardScaler()
    num_train = scaler.fit_transform(numeric[train_idx])
    num_test = scaler.transform(numeric[test_idx])

    model = LogisticRegression(
        max_iter=1500,
        class_weight="balanced",
        random_state=SPLIT_SEED,
    )
    model.fit(hstack([text_train, num_train]), labels[train_idx])
    probabilities = model.predict_proba(
        hstack([text_test, num_test])
    )[:, 1]
    return probability_metrics(labels[test_idx], probabilities), probabilities


def _balanced_class_weights(labels: np.ndarray) -> dict[int, float]:
    counts = np.bincount(labels.astype(int), minlength=2)
    if np.any(counts == 0):
        raise ValueError("Both classes are required for balanced class weights.")

    total = float(len(labels))
    return {
        0: total / (2.0 * float(counts[0])),
        1: total / (2.0 * float(counts[1])),
    }


def _tensorflow_module() -> Any:
    try:
        import tensorflow as tf
    except ImportError as exc:
        raise RuntimeError(
            "TensorFlow is not installed in this Python environment. "
            "Activate the TensorFlow venv and install "
            "ml/clinical_trials/requirements-tensorflow.txt."
        ) from exc
    return tf


def _configure_tensorflow(tf: Any, seed: int) -> None:
    tf.keras.backend.clear_session()
    tf.keras.utils.set_random_seed(seed)
    try:
        tf.config.experimental.enable_op_determinism()
    except Exception:
        # Runtime manifest records versions/platform so a reviewer can distinguish
        # best-effort reproducibility from guaranteed bitwise reproducibility.
        pass


def _build_model(
    tf: Any,
    adapt_text: Any,
    adapt_numeric: np.ndarray,
    *,
    seed: int,
) -> Any:
    _configure_tensorflow(tf, seed)

    text_vectorizer = tf.keras.layers.TextVectorization(
        max_tokens=5000,
        output_mode="tf_idf",
        ngrams=2,
        standardize="lower_and_strip_punctuation",
        name="text_vectorizer",
    )
    text_vectorizer.adapt(adapt_text)

    normalizer = tf.keras.layers.Normalization(
        axis=-1,
        name="numeric_normalizer",
    )
    normalizer.adapt(adapt_numeric)

    text_input = tf.keras.Input(shape=(), dtype=tf.string, name="text")
    numeric_input = tf.keras.Input(
        shape=(adapt_numeric.shape[1],),
        dtype=tf.float32,
        name="numeric",
    )

    text_features = text_vectorizer(text_input)
    numeric_features = normalizer(numeric_input)
    combined = tf.keras.layers.Concatenate(name="combined_features")(
        [text_features, numeric_features]
    )

    x = tf.keras.layers.Dense(
        64,
        activation="relu",
        kernel_regularizer=tf.keras.regularizers.l2(1e-4),
        name="dense_64",
    )(combined)
    x = tf.keras.layers.Dropout(0.25, name="dropout_1")(x)
    x = tf.keras.layers.Dense(16, activation="relu", name="dense_16")(x)
    x = tf.keras.layers.Dropout(0.10, name="dropout_2")(x)
    output = tf.keras.layers.Dense(
        1,
        activation="sigmoid",
        name="completion",
    )(x)

    model = tf.keras.Model(
        inputs={"text": text_input, "numeric": numeric_input},
        outputs=output,
        name=MODEL_ID,
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=[
            tf.keras.metrics.AUC(name="roc_auc"),
            tf.keras.metrics.AUC(name="pr_auc", curve="PR"),
        ],
    )
    return model


def _as_text_tensor(
    tf: Any,
    texts: list[str],
    indices: np.ndarray,
) -> Any:
    return tf.convert_to_tensor(
        [texts[int(i)] for i in indices],
        dtype=tf.string,
    )


def _fit_tensorflow_seed(
    texts: list[str],
    numeric: np.ndarray,
    labels: np.ndarray,
    train_idx: np.ndarray,
    development_idx: np.ndarray,
    validation_idx: np.ndarray,
    test_idx: np.ndarray,
    *,
    seed: int,
    output_dir: Path,
    save_model: bool,
) -> tuple[dict[str, Any], np.ndarray, int, str | None]:
    """Select epochs on validation data, refit on full train, then score test."""
    tf = _tensorflow_module()

    development_text = _as_text_tensor(tf, texts, development_idx)
    validation_text = _as_text_tensor(tf, texts, validation_idx)
    development_numeric = numeric[development_idx].astype(np.float32)
    validation_numeric = numeric[validation_idx].astype(np.float32)
    y_development = labels[development_idx].astype(np.float32)
    y_validation = labels[validation_idx].astype(np.float32)

    selection_model = _build_model(
        tf,
        development_text,
        development_numeric,
        seed=seed,
    )
    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=EARLY_STOPPING_PATIENCE,
        restore_best_weights=True,
    )
    history = selection_model.fit(
        {
            "text": development_text,
            "numeric": development_numeric,
        },
        y_development,
        validation_data=(
            {
                "text": validation_text,
                "numeric": validation_numeric,
            },
            y_validation,
        ),
        epochs=MAX_EPOCHS,
        batch_size=32,
        class_weight=_balanced_class_weights(y_development.astype(int)),
        callbacks=[early_stop],
        verbose=0,
        shuffle=True,
    )

    validation_losses = history.history.get("val_loss", [])
    if not validation_losses:
        raise RuntimeError("TensorFlow training produced no validation loss history.")
    best_epoch = int(np.argmin(np.asarray(validation_losses))) + 1

    # Epoch selection is now frozen. Refit from scratch on all pre-test data so
    # the final challenger is not disadvantaged by withholding validation rows.
    train_text = _as_text_tensor(tf, texts, train_idx)
    test_text = _as_text_tensor(tf, texts, test_idx)
    train_numeric = numeric[train_idx].astype(np.float32)
    test_numeric = numeric[test_idx].astype(np.float32)
    y_train = labels[train_idx].astype(np.float32)
    y_test = labels[test_idx].astype(int)

    final_model = _build_model(
        tf,
        train_text,
        train_numeric,
        seed=seed,
    )
    final_model.fit(
        {
            "text": train_text,
            "numeric": train_numeric,
        },
        y_train,
        epochs=best_epoch,
        batch_size=32,
        class_weight=_balanced_class_weights(y_train.astype(int)),
        verbose=0,
        shuffle=True,
    )

    probabilities = final_model.predict(
        {
            "text": test_text,
            "numeric": test_numeric,
        },
        verbose=0,
    ).reshape(-1)
    metrics = probability_metrics(y_test, probabilities)

    model_filename: str | None = None
    if save_model:
        output_dir.mkdir(parents=True, exist_ok=True)
        model_filename = f"{MODEL_ID}-seed-{seed}.keras"
        final_model.save(output_dir / model_filename)

    return metrics, probabilities, best_epoch, model_filename


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _git_sha() -> str | None:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return completed.stdout.strip() or None
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None


def _runtime_manifest(
    *,
    training_source: str,
    records_hash: str,
    split_fingerprint: str,
    seeds: tuple[int, ...],
    bootstrap_resamples: int,
    output_dir: Path,
    metrics_path: Path,
    split_path: Path,
    model_filename: str | None,
) -> dict[str, Any]:
    model_path = output_dir / model_filename if model_filename else None
    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "git_sha": _git_sha(),
        "python": {
            "version": sys.version,
            "implementation": platform.python_implementation(),
        },
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
        },
        "packages": {
            "tensorflow": _package_version("tensorflow"),
            "numpy": _package_version("numpy"),
            "scipy": _package_version("scipy"),
            "scikit_learn": _package_version("scikit-learn"),
        },
        "data": {
            "training_source": training_source,
            "canonical_record_sha256": records_hash,
            "split_sha256": split_fingerprint,
        },
        "configuration": {
            "model_id": MODEL_ID,
            "tensorflow_seeds": list(seeds),
            "split_seed": SPLIT_SEED,
            "validation_fraction": VALIDATION_FRACTION,
            "max_epochs": MAX_EPOCHS,
            "early_stopping_patience": EARLY_STOPPING_PATIENCE,
            "bootstrap_resamples": bootstrap_resamples,
        },
        "artifacts": {
            "metrics": {
                "filename": metrics_path.name,
                "sha256": _file_sha256(metrics_path),
            },
            "split": {
                "filename": split_path.name,
                "sha256": _file_sha256(split_path),
            },
            "model": (
                {
                    "filename": model_filename,
                    "sha256": _file_sha256(model_path),
                }
                if model_path is not None and model_path.exists()
                else None
            ),
        },
    }


def benchmark_completion_tensorflow(
    records: list[TrialRecord],
    *,
    output_dir: Path,
    training_source: str,
    save_model: bool = True,
    seeds: tuple[int, ...] = DEFAULT_TENSORFLOW_SEEDS,
    bootstrap_resamples: int = DEFAULT_BOOTSTRAP_RESAMPLES,
) -> dict[str, Any]:
    """Benchmark TensorFlow under pre-declared model-risk controls."""
    if not seeds:
        raise ValueError("At least one TensorFlow seed is required.")
    if len(set(seeds)) != len(seeds):
        raise ValueError("TensorFlow seeds must be unique.")

    labeled = sorted(
        (record for record in records if record.label_completed is not None),
        key=lambda record: (record.nct_id, record.source_query),
    )
    if len(labeled) < MIN_LABELED_RECORDS:
        raise ValueError(
            f"Need at least {MIN_LABELED_RECORDS} labeled completion records; "
            f"found {len(labeled)}."
        )

    nct_ids = [record.nct_id for record in labeled]
    duplicates = [
        nct_id
        for nct_id, count in Counter(nct_ids).items()
        if nct_id and count > 1
    ]
    if duplicates:
        raise ValueError(
            "Duplicate NCT identifiers are not permitted in the benchmark "
            f"snapshot: {duplicates[:5]}"
        )

    texts = [record.text_corpus() for record in labeled]
    numeric = np.asarray(
        [row_numeric_features(record.as_feature_row()) for record in labeled],
        dtype=float,
    )
    labels = np.asarray(
        [int(record.label_completed) for record in labeled],
        dtype=int,
    )
    if len(np.unique(labels)) < 2:
        raise ValueError("Completion benchmark requires both outcome classes.")

    train_idx, test_idx, split = _split_indices(labeled, labels)
    development_idx, validation_idx = _development_split(train_idx, labels)

    baseline_metrics, baseline_probabilities = _fit_logistic_baseline(
        texts,
        numeric,
        labels,
        train_idx,
        test_idx,
    )

    canonical_seed = (
        CANONICAL_MODEL_SEED
        if CANONICAL_MODEL_SEED in seeds
        else seeds[0]
    )
    tensorflow_runs: list[dict[str, Any]] = []
    canonical_probabilities: np.ndarray | None = None
    canonical_model_filename: str | None = None

    for seed in seeds:
        metrics, probabilities, best_epoch, model_filename = _fit_tensorflow_seed(
            texts,
            numeric,
            labels,
            train_idx,
            development_idx,
            validation_idx,
            test_idx,
            seed=seed,
            output_dir=output_dir,
            save_model=save_model and seed == canonical_seed,
        )
        tensorflow_runs.append(
            {
                "seed": int(seed),
                "best_epoch": int(best_epoch),
                "metrics": metrics,
                "model_filename": model_filename,
            }
        )
        if seed == canonical_seed:
            canonical_probabilities = probabilities
            canonical_model_filename = model_filename

    if canonical_probabilities is None:
        raise RuntimeError("Canonical TensorFlow seed did not produce predictions.")

    seed_metrics = [run["metrics"] for run in tensorflow_runs]
    robustness = seed_robustness(baseline_metrics, seed_metrics)
    aggregate = metric_seed_summary(seed_metrics)
    paired = paired_bootstrap_comparison(
        labels[test_idx],
        baseline_probabilities,
        canonical_probabilities,
        n_resamples=bootstrap_resamples,
    )
    cohort = cohort_audit(labeled, labels, train_idx, test_idx)
    gate = promotion_gate(
        training_source=training_source,
        split_strategy=str(split["strategy"]),
        cohort=cohort,
        paired=paired,
        robustness=robustness,
    )

    records_hash = canonical_record_hash(labeled)
    split_fingerprint = split_hash(
        labeled,
        train_idx,
        test_idx,
        development_idx,
        validation_idx,
    )

    split_payload = {
        "strategy": split,
        "split_seed": SPLIT_SEED,
        "canonical_record_sha256": records_hash,
        "split_sha256": split_fingerprint,
        "train_nct_ids": sorted(labeled[int(i)].nct_id for i in train_idx),
        "development_nct_ids": sorted(
            labeled[int(i)].nct_id for i in development_idx
        ),
        "validation_nct_ids": sorted(
            labeled[int(i)].nct_id for i in validation_idx
        ),
        "test_nct_ids": sorted(labeled[int(i)].nct_id for i in test_idx),
    }

    result: dict[str, Any] = {
        "model_id": MODEL_ID,
        "benchmark_version": "institutional-v1",
        "task": "trial_completion_proxy",
        "training_source": training_source,
        "canonical_record_sha256": records_hash,
        "split_sha256": split_fingerprint,
        "not_for": [
            "clinical endpoint efficacy",
            "FDA approval forecasting",
            "M&A prediction",
            "investment decisions",
        ],
        "feature_names": {
            "text": "trial title + condition + interventions + sponsor",
            "numeric": list(NUMERIC_FEATURE_NAMES),
        },
        "n_total_records": len(records),
        "n_labeled": len(labeled),
        "n_train": int(len(train_idx)),
        "n_development": int(len(development_idx)),
        "n_validation": int(len(validation_idx)),
        "n_test": int(len(test_idx)),
        "split": split,
        "cohort_audit": cohort,
        "logistic_baseline": baseline_metrics,
        "tensorflow": {
            "canonical_seed": int(canonical_seed),
            "seed_runs": tensorflow_runs,
            "aggregate_across_seeds": aggregate,
            "seed_robustness": robustness,
        },
        "paired_holdout_comparison": paired,
        "promotion_gate": gate,
        "promotion_status": "benchmark_only_do_not_serve_in_nextjs",
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = output_dir / "metrics.json"
    split_path = output_dir / "split.json"
    manifest_path = output_dir / "run-manifest.json"

    _write_json(metrics_path, result)
    _write_json(split_path, split_payload)
    manifest = _runtime_manifest(
        training_source=training_source,
        records_hash=records_hash,
        split_fingerprint=split_fingerprint,
        seeds=seeds,
        bootstrap_resamples=bootstrap_resamples,
        output_dir=output_dir,
        metrics_path=metrics_path,
        split_path=split_path,
        model_filename=canonical_model_filename,
    )
    _write_json(manifest_path, manifest)

    return result
