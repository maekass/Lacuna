"""Train Tier-1 clinical trial models (women's health relevance + termination risk)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from lacuna_ct.export_sklearn import export_tfidf_logistic, write_artifact
from lacuna_ct.fetch_training_data import (
    build_training_records,
    load_seed_records,
    save_records,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def train_binary_classifier(
    texts: list[str],
    labels: list[int],
) -> tuple[Pipeline, dict]:
    y = np.array(labels)
    X_train, X_test, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=2)),
            (
                "clf",
                LogisticRegression(max_iter=1000, class_weight="balanced", C=1.0),
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
    }
    return pipeline, metrics


def main() -> None:
    root = repo_root()
    cache = root / "ml/clinical_trials/data/cached_training.json"

    used_live_fetch = False
    try:
        records = build_training_records(use_network=True)
        save_records(records, cache)
        used_live_fetch = True
        print(f"Fetched {len(records)} trials from ClinicalTrials.gov")
    except Exception as exc:
        print(f"Network fetch failed ({exc}); using offline seed")
        records = load_seed_records()

    wh_texts = [r.text_corpus() for r in records]
    wh_labels = [r.label_wh for r in records]
    wh_pipeline, wh_metrics = train_binary_classifier(wh_texts, wh_labels)
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

    training_source = "ctgov_live" if used_live_fetch else "synthetic_seed"

    term_labeled = [r for r in records if r.label_terminated is not None]
    term_metrics = None
    if len(term_labeled) >= 80:
        term_texts = [r.text_corpus() for r in term_labeled]
        term_labels = [r.label_terminated for r in term_labeled]
        term_pipeline, term_metrics = train_binary_classifier(term_texts, term_labels)
        if term_metrics["roc_auc"] >= 0.55:
            term_artifact = export_tfidf_logistic(
                term_pipeline,
                model_id="termination-risk-v1",
                task="trial_termination_risk",
                metrics=term_metrics,
                positive_label="terminated_or_withdrawn",
            )
            term_path = write_artifact(
                term_artifact,
                root,
                "src/data/ml/clinical-trials/termination-risk-v1.json",
            )
            print(f"Wrote termination risk model → {term_path}")
            print(json.dumps(term_metrics, indent=2))
        else:
            print(
                f"Skipped termination-risk export (roc_auc={term_metrics['roc_auc']:.3f} — retrain on live CT.gov data)",
            )
            term_metrics = None
    else:
        print(f"Skipped termination-risk model (n={len(term_labeled)} labeled trials)")

    card = {
        "version": "clinical-trials-v1",
        "description": (
            "Offline-trained scikit-learn TF-IDF + logistic models on "
            "ClinicalTrials.gov excerpts. Descriptive only — not clinical advice."
        ),
        "trainingSource": training_source,
        "models": {
            "whRelevance": {"artifact": "wh-relevance-v1.json", "metrics": wh_metrics},
            "terminationRisk": term_metrics,
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
