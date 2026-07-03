"""Train Tier-1 clinical trial models (WH relevance + completion proxy)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from lacuna_ct.export_sklearn import (
    export_hybrid_from_fitted,
    export_tfidf_logistic,
    write_artifact,
)
from lacuna_ct.features import NUMERIC_FEATURE_NAMES, row_numeric_features
from lacuna_ct.fetch_training_data import (
    TrialRecord,
    build_training_records,
    load_cached_records,
    load_seed_records,
    save_records,
)

EXPORT_AUC_GATE = 0.55
COMPLETION_MODEL_ID = "completion-proxy-v2"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def train_text_classifier(
    texts: list[str],
    labels: list[int],
    *,
    max_features: int = 5000,
) -> tuple[Pipeline, dict]:
    y = np.array(labels)
    X_train, X_test, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    max_features=max_features, ngram_range=(1, 2), min_df=2
                ),
            ),
            (
                "clf",
                LogisticRegression(max_iter=1500, class_weight="balanced", C=1.0),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)
    probs = pipeline.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    metrics = {
        "n_total": len(texts),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "accuracy": float(accuracy_score(y_test, preds)),
        "precision": float(precision_score(y_test, preds, zero_division=0)),
        "recall": float(recall_score(y_test, preds, zero_division=0)),
        "f1": float(f1_score(y_test, preds, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probs)),
        "brier": float(brier_score_loss(y_test, probs)),
    }
    return pipeline, metrics


def train_hybrid_completion(
    records: list[TrialRecord],
) -> tuple[dict, dict] | None:
    labeled = [r for r in records if r.label_completed is not None]
    if len(labeled) < 120:
        return None

    texts = [r.text_corpus() for r in labeled]
    numeric = np.array([row_numeric_features(r.as_feature_row()) for r in labeled])
    y = np.array([r.label_completed for r in labeled])

    # Time-aware split when start_year available
    years = [r.start_year for r in labeled]
    if all(y is not None for y in years) and len(set(years)) >= 4:
        cutoff = sorted(years)[int(len(years) * 0.75)]
        train_mask = np.array([yr is not None and yr <= cutoff for yr in years])
        test_mask = ~train_mask
        if test_mask.sum() < 20 or train_mask.sum() < 80:
            train_idx, test_idx = train_test_split(
                np.arange(len(labeled)), test_size=0.2, random_state=42, stratify=y
            )
        else:
            train_idx = np.where(train_mask)[0]
            test_idx = np.where(test_mask)[0]
    else:
        train_idx, test_idx = train_test_split(
            np.arange(len(labeled)), test_size=0.2, random_state=42, stratify=y
        )

    text_train = [texts[i] for i in train_idx]
    text_test = [texts[i] for i in test_idx]
    num_train = numeric[train_idx]
    num_test = numeric[test_idx]
    y_train = y[train_idx]
    y_test = y[test_idx]

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), min_df=2)
    X_text_train = vectorizer.fit_transform(text_train)
    X_text_test = vectorizer.transform(text_test)

    scaler = StandardScaler()
    X_num_train = scaler.fit_transform(num_train)
    X_num_test = scaler.transform(num_test)

    X_train = hstack([X_text_train, X_num_train])
    X_test = hstack([X_text_test, X_num_test])

    clf = LogisticRegression(max_iter=1500, class_weight="balanced")
    clf.fit(X_train, y_train)
    probs = clf.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    majority = max(np.mean(y_test == 0), np.mean(y_test == 1))
    metrics = {
        "n_total": len(labeled),
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
        "accuracy": float(accuracy_score(y_test, preds)),
        "precision": float(precision_score(y_test, preds, zero_division=0)),
        "recall": float(recall_score(y_test, preds, zero_division=0)),
        "f1": float(f1_score(y_test, preds, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probs)),
        "brier": float(brier_score_loss(y_test, probs)),
        "majority_baseline_accuracy": float(majority),
    }

    artifact = export_hybrid_from_fitted(
        model_id=COMPLETION_MODEL_ID,
        task="trial_completion_proxy",
        metrics=metrics,
        positive_label="completed_vs_stopped",
        vectorizer=vectorizer,
        scaler=scaler,
        classifier=clf,
        numeric_dim=len(NUMERIC_FEATURE_NAMES),
        numeric_feature_names=list(NUMERIC_FEATURE_NAMES),
    )
    return artifact, metrics


def main() -> None:
    root = repo_root()
    cache = root / "ml/clinical_trials/data/cached_training.json"

    used_live_fetch = False
    try:
        records = build_training_records(use_network=True, max_pages=5)
        save_records(records, cache)
        used_live_fetch = True
        print(f"Fetched {len(records)} trials from ClinicalTrials.gov")
    except Exception as exc:
        print(f"Network fetch failed ({exc}); using cached or seed data")
        if cache.exists():
            records = load_cached_records(cache)
            print(f"Loaded {len(records)} trials from cache")
        else:
            records = load_seed_records()
            print(f"Loaded {len(records)} trials from synthetic seed")

    training_source = "ctgov_live" if used_live_fetch else (
        "ctgov_cached" if cache.exists() else "synthetic_seed"
    )

    wh_texts = [r.text_corpus() for r in records]
    wh_labels = [r.label_wh for r in records]
    wh_pipeline, wh_metrics = train_text_classifier(wh_texts, wh_labels)
    wh_artifact = export_tfidf_logistic(
        wh_pipeline,
        model_id="wh-relevance-v1",
        task="womens_health_trial_relevance",
        metrics=wh_metrics,
        positive_label="womens_health_relevant",
    )
    wh_path = write_artifact(
        wh_artifact,
        root,
        "src/data/ml/clinical-trials/wh-relevance-v1.json",
    )
    print(f"Wrote WH relevance model → {wh_path}")
    print(json.dumps(wh_metrics, indent=2))

    completion_metrics = None
    hybrid = train_hybrid_completion(records)
    if hybrid:
        completion_artifact, completion_metrics = hybrid
        if completion_metrics["roc_auc"] >= EXPORT_AUC_GATE:
            comp_path = write_artifact(
                completion_artifact,
                root,
                "src/data/ml/clinical-trials/completion-proxy-v2.json",
            )
            print(f"Wrote completion proxy model → {comp_path}")
            print(json.dumps(completion_metrics, indent=2))
        else:
            print(
                f"Skipped completion export (roc_auc={completion_metrics['roc_auc']:.3f} < {EXPORT_AUC_GATE})",
            )
            completion_metrics = None
    else:
        labeled_n = sum(1 for r in records if r.label_completed is not None)
        print(f"Skipped completion model (n={labeled_n} labeled trials)")

    card = {
        "version": "clinical-trials-v2",
        "description": (
            "Offline sklearn models on ClinicalTrials.gov: WH relevance + "
            "completion proxy (COMPLETED vs stopped). Descriptive only."
        ),
        "trainingSource": training_source,
        "recordCount": len(records),
        "models": {
            "whRelevance": {"artifact": "wh-relevance-v1.json", "metrics": wh_metrics},
            "completionProxy": completion_metrics,
        },
    }
    card_path = write_artifact(
        card,
        root,
        "src/data/ml/clinical-trials/model-card.json",
    )
    print(f"Wrote model card → {card_path}")


if __name__ == "__main__":
    main()
