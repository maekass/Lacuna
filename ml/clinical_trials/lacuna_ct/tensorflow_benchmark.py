"""TensorFlow benchmark for the ClinicalTrials.gov completion proxy.

This module is deliberately offline-only. It does not export weights to the
Next.js app and it does not train on the M&A catalog.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from lacuna_ct.features import NUMERIC_FEATURE_NAMES, row_numeric_features
from lacuna_ct.fetch_training_data import TrialRecord

MODEL_ID = "completion-tensorflow-benchmark-v1"
MIN_LABELED_RECORDS = 120
RANDOM_SEED = 42


def _split_indices(
    records: list[TrialRecord],
    labels: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    """Return the same time-aware holdout policy used by the classical model."""
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
                },
            )

    train_idx, test_idx = train_test_split(
        np.arange(len(records)),
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=labels,
    )
    return (
        np.asarray(train_idx),
        np.asarray(test_idx),
        {
            "strategy": "stratified_random_fallback",
            "random_seed": RANDOM_SEED,
        },
    )


def _classification_metrics(
    y_true: np.ndarray,
    probabilities: np.ndarray,
) -> dict[str, float]:
    predictions = (probabilities >= 0.5).astype(int)
    base_rate = float(np.mean(y_true))
    majority = float(max(np.mean(y_true == 0), np.mean(y_true == 1)))

    return {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "precision": float(precision_score(y_true, predictions, zero_division=0)),
        "recall": float(recall_score(y_true, predictions, zero_division=0)),
        "f1": float(f1_score(y_true, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, probabilities)),
        "pr_auc": float(average_precision_score(y_true, probabilities)),
        "brier": float(brier_score_loss(y_true, probabilities)),
        "majority_baseline_accuracy": majority,
        "base_rate_brier": float(base_rate * (1.0 - base_rate)),
    }


def _fit_logistic_baseline(
    texts: list[str],
    numeric: np.ndarray,
    labels: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
) -> dict[str, float]:
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=2,
    )
    text_train = vectorizer.fit_transform([texts[i] for i in train_idx])
    text_test = vectorizer.transform([texts[i] for i in test_idx])

    scaler = StandardScaler()
    num_train = scaler.fit_transform(numeric[train_idx])
    num_test = scaler.transform(numeric[test_idx])

    model = LogisticRegression(
        max_iter=1500,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )
    model.fit(hstack([text_train, num_train]), labels[train_idx])
    probabilities = model.predict_proba(
        hstack([text_test, num_test])
    )[:, 1]
    return _classification_metrics(labels[test_idx], probabilities)


def _balanced_class_weights(labels: np.ndarray) -> dict[int, float]:
    counts = np.bincount(labels.astype(int), minlength=2)
    if np.any(counts == 0):
        return {0: 1.0, 1: 1.0}
    total = float(len(labels))
    return {
        0: total / (2.0 * float(counts[0])),
        1: total / (2.0 * float(counts[1])),
    }


def _fit_tensorflow(
    texts: list[str],
    numeric: np.ndarray,
    labels: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    *,
    output_dir: Path,
    save_model: bool,
) -> tuple[dict[str, float], int, str | None]:
    try:
        import tensorflow as tf
    except ImportError as exc:
        raise RuntimeError(
            "TensorFlow is not installed in this Python environment. "
            "Activate the TensorFlow venv and install "
            "ml/clinical_trials/requirements-tensorflow.txt."
        ) from exc

    tf.keras.utils.set_random_seed(RANDOM_SEED)
    try:
        tf.config.experimental.enable_op_determinism()
    except Exception:
        # Determinism is best-effort across TensorFlow backends.
        pass

    train_text = np.asarray([texts[i] for i in train_idx], dtype=str).reshape(-1, 1)
    test_text = np.asarray([texts[i] for i in test_idx], dtype=str).reshape(-1, 1)
    train_numeric = numeric[train_idx].astype(np.float32)
    test_numeric = numeric[test_idx].astype(np.float32)
    y_train = labels[train_idx].astype(np.float32)
    y_test = labels[test_idx].astype(np.float32)

    text_vectorizer = tf.keras.layers.TextVectorization(
        max_tokens=5000,
        output_mode="tf_idf",
        ngrams=2,
        standardize="lower_and_strip_punctuation",
        name="text_vectorizer",
    )
    text_vectorizer.adapt(train_text)

    normalizer = tf.keras.layers.Normalization(axis=-1, name="numeric_normalizer")
    normalizer.adapt(train_numeric)

    text_input = tf.keras.Input(shape=(1,), dtype=tf.string, name="text")
    numeric_input = tf.keras.Input(
        shape=(numeric.shape[1],),
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
    output = tf.keras.layers.Dense(1, activation="sigmoid", name="completion")(x)

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
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
        ],
    )

    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
    )
    history = model.fit(
        {"text": train_text, "numeric": train_numeric},
        y_train,
        validation_split=0.15,
        epochs=50,
        batch_size=32,
        class_weight=_balanced_class_weights(y_train.astype(int)),
        callbacks=[early_stop],
        verbose=0,
        shuffle=True,
    )

    probabilities = model.predict(
        {"text": test_text, "numeric": test_numeric},
        verbose=0,
    ).reshape(-1)
    metrics = _classification_metrics(y_test.astype(int), probabilities)

    model_path: str | None = None
    if save_model:
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / f"{MODEL_ID}.keras"
        model.save(path)
        model_path = str(path)

    return metrics, len(history.history.get("loss", [])), model_path


def benchmark_completion_tensorflow(
    records: list[TrialRecord],
    *,
    output_dir: Path,
    training_source: str,
    save_model: bool = True,
) -> dict[str, Any]:
    """Benchmark TensorFlow against logistic regression on one held-out cohort."""
    labeled = [record for record in records if record.label_completed is not None]
    if len(labeled) < MIN_LABELED_RECORDS:
        raise ValueError(
            f"Need at least {MIN_LABELED_RECORDS} labeled completion records; "
            f"found {len(labeled)}."
        )

    texts = [record.text_corpus() for record in labeled]
    numeric = np.asarray(
        [row_numeric_features(record.as_feature_row()) for record in labeled],
        dtype=float,
    )
    labels = np.asarray([int(record.label_completed) for record in labeled], dtype=int)

    train_idx, test_idx, split = _split_indices(labeled, labels)

    logistic_metrics = _fit_logistic_baseline(
        texts,
        numeric,
        labels,
        train_idx,
        test_idx,
    )
    tf_metrics, epochs_ran, model_path = _fit_tensorflow(
        texts,
        numeric,
        labels,
        train_idx,
        test_idx,
        output_dir=output_dir,
        save_model=save_model,
    )

    comparison = {
        "tensorflow_roc_auc_minus_logistic": (
            tf_metrics["roc_auc"] - logistic_metrics["roc_auc"]
        ),
        "tensorflow_pr_auc_minus_logistic": (
            tf_metrics["pr_auc"] - logistic_metrics["pr_auc"]
        ),
        "tensorflow_brier_minus_logistic": (
            tf_metrics["brier"] - logistic_metrics["brier"]
        ),
        "tensorflow_beats_logistic_on_auc_and_brier": bool(
            tf_metrics["roc_auc"] > logistic_metrics["roc_auc"]
            and tf_metrics["brier"] < logistic_metrics["brier"]
        ),
    }

    result: dict[str, Any] = {
        "model_id": MODEL_ID,
        "task": "trial_completion_proxy",
        "training_source": training_source,
        "not_for": [
            "clinical endpoint efficacy",
            "FDA approval forecasting",
            "M&A prediction",
            "investment decisions",
        ],
        "feature_names": {
            "text": "trial text corpus",
            "numeric": list(NUMERIC_FEATURE_NAMES),
        },
        "n_total_records": len(records),
        "n_labeled": len(labeled),
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
        "split": split,
        "logistic_baseline": logistic_metrics,
        "tensorflow": {
            **tf_metrics,
            "epochs_ran": int(epochs_ran),
            "model_path": model_path,
        },
        "comparison": comparison,
        "promotion_status": (
            "benchmark_only_do_not_serve_in_nextjs"
        ),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = output_dir / "metrics.json"
    metrics_path.write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return result
