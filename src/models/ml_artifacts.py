"""
Train, save, and load dashboard ML artifacts (regression + trial-success classifiers).

Training CSVs and fitted models are committed under data/demo/ml and data/demo/models
so CI and Streamlit Cloud do not need to retrain on every deploy.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
DEMO_ML_DIR = ROOT / "data" / "demo" / "ml"
DEMO_MODELS_DIR = ROOT / "data" / "demo" / "models"
PROCESSED_DIR = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "data" / "models"

REGRESSION_TARGET_TICKER = "CRSP"
TRAINING_ARTIFACTS = (
    "regression_training.csv",
    "trial_success_training.csv",
    "model_comparison.csv",
    "model_metrics.json",
)
MODEL_FILES = (
    "ridge_regression.pkl",
    "random_forest_regression.pkl",
    "trial_success_scaler.pkl",
    "trial_success_random_forest.pkl",
    "trial_success_logistic_regression.pkl",
)


def _stock_close_series(raw_dir: Path, ticker: str = REGRESSION_TARGET_TICKER) -> pd.Series:
    path = raw_dir / "stock_prices_companies.csv"
    prices = pd.read_csv(path, header=[0, 1], index_col=0, parse_dates=True)
    if isinstance(prices.columns, pd.MultiIndex):
        # yfinance export: level 0 = ticker, level 1 = OHLCV field
        if (ticker, "Close") in prices.columns:
            s = prices[(ticker, "Close")].copy()
        elif ("Close", ticker) in prices.columns:
            s = prices[("Close", ticker)].copy()
        else:
            raise KeyError(f"Close prices for {ticker} not found in {path}")
        s.index = pd.to_datetime(s.index, utc=True).tz_localize(None)
        s.name = ticker
        return s
    if ticker in prices.columns:
        s = prices[ticker].copy()
        s.name = ticker
        return s
    raise KeyError(f"Close prices for {ticker} not found in {path}")


def build_regression_training_df(raw_dir: Path | str = RAW_DIR) -> pd.DataFrame:
    """Merge illustrative CDC series with delayed vendor stock closes for ML features."""
    raw = Path(raw_dir)
    health = pd.read_csv(raw / "cdc_sickle_cell_data.csv", parse_dates=["date"])
    health = health.set_index("date").sort_index()
    close = _stock_close_series(raw)
    # Align quarterly health placeholders to month-end stock (forward-fill burden series)
    stock_m = close.resample("ME").last()
    health_m = health.resample("ME").ffill().reindex(stock_m.index, method="ffill")
    merged = health_m.join(stock_m, how="inner")
    merged["stock_return"] = merged[REGRESSION_TARGET_TICKER].pct_change()
    for col in ["scd_births_per_1000", "new_treatments_approved", "clinical_trials_active"]:
        merged[f"{col}_lag1"] = merged[col].shift(1)
    merged["prevalence_growth"] = merged["scd_prevalence_us"].pct_change(fill_method=None)
    merged["treatments_per_trial"] = merged["new_treatments_approved"] / (
        merged["clinical_trials_active"] + 1
    )
    feature_cols = [
        "scd_births_per_1000",
        "scd_prevalence_us",
        "new_treatments_approved",
        "clinical_trials_active",
        "scd_births_per_1000_lag1",
        "new_treatments_approved_lag1",
        "clinical_trials_active_lag1",
        "prevalence_growth",
        "treatments_per_trial",
        REGRESSION_TARGET_TICKER,
        "stock_return",
    ]
    merged = merged.dropna(subset=feature_cols).reset_index()
    if "Date" in merged.columns:
        merged = merged.rename(columns={"Date": "date"})
    elif merged.columns[0] != "date":
        merged = merged.rename(columns={merged.columns[0]: "date"})
    return merged


def train_regression_models(
    training_df: pd.DataFrame,
) -> tuple[dict[str, Any], pd.DataFrame, dict[str, Any]]:
    """Fit Ridge + RandomForest on stock_return; return metrics, comparison table, models."""
    exclude = {"date", "Date", REGRESSION_TARGET_TICKER, "stock_return"}
    feature_cols = [
        c
        for c in training_df.columns
        if c not in exclude and pd.api.types.is_numeric_dtype(training_df[c])
    ]
    X = training_df[feature_cols].values
    y = training_df["stock_return"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    specs: dict[str, Any] = {
        "ridge": Ridge(alpha=1.0, random_state=42),
        "random_forest": RandomForestRegressor(
            n_estimators=80, max_depth=6, min_samples_leaf=4, random_state=42, n_jobs=-1
        ),
    }
    fitted: dict[str, Any] = {}
    rows: list[dict[str, Any]] = []
    metrics: dict[str, Any] = {}

    for name, model in specs.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        fitted[name] = model
        row = {
            "model": name,
            "R2": round(r2_score(y_test, preds), 4),
            "MAE": round(mean_absolute_error(y_test, preds), 6),
            "RMSE": round(float(np.sqrt(np.mean((y_test - preds) ** 2))), 6),
            "n_features": len(feature_cols),
            "n_train": len(X_train),
        }
        rows.append(row)
        metrics[name] = {k: row[k] for k in ("R2", "MAE", "RMSE")}

    comparison = pd.DataFrame(rows).sort_values("R2", ascending=False)
    return fitted, comparison, metrics


def train_trial_success_models() -> tuple[pd.DataFrame, dict[str, Any], dict[str, Any]]:
    """Train trial-success classifiers on synthetic immunology trial data."""
    from src.models.trial_success_predictor import TrialSuccessPredictor

    predictor = TrialSuccessPredictor()
    training_df = predictor._generate_training_data(2500)
    cv_metrics = predictor.train(verbose=False)

    fitted = {
        "trial_success_scaler": predictor.scaler,
        "trial_success_random_forest": predictor.models["random_forest"],
        "trial_success_logistic_regression": predictor.models["logistic_regression"],
    }
    return training_df, cv_metrics, fitted


def train_all(
    raw_dir: Path | str = RAW_DIR,
    ml_dir: Path | str = DEMO_ML_DIR,
    models_dir: Path | str = DEMO_MODELS_DIR,
    *,
    mirror_runtime: bool = True,
) -> Path:
    """Train models, write CSVs + joblib + metrics under data/demo (and optionally data/processed)."""
    raw = Path(raw_dir)
    ml_path = Path(ml_dir)
    models_path = Path(models_dir)
    ml_path.mkdir(parents=True, exist_ok=True)
    models_path.mkdir(parents=True, exist_ok=True)

    reg_df = build_regression_training_df(raw)
    reg_models, comparison, reg_metrics = train_regression_models(reg_df)
    trial_df, trial_metrics, trial_models = train_trial_success_models()

    reg_df.to_csv(ml_path / "regression_training.csv", index=False)
    trial_df.to_csv(ml_path / "trial_success_training.csv", index=False)
    comparison.to_csv(ml_path / "model_comparison.csv", index=False)

    joblib.dump(reg_models["ridge"], models_path / "ridge_regression.pkl")
    joblib.dump(reg_models["random_forest"], models_path / "random_forest_regression.pkl")
    joblib.dump(trial_models["trial_success_scaler"], models_path / "trial_success_scaler.pkl")
    joblib.dump(
        trial_models["trial_success_random_forest"], models_path / "trial_success_random_forest.pkl"
    )
    joblib.dump(
        trial_models["trial_success_logistic_regression"],
        models_path / "trial_success_logistic_regression.pkl",
    )

    payload = {
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "regression": reg_metrics,
        "trial_success_cv_auc": trial_metrics,
        "notes": (
            "Regression uses illustrative CDC + delayed vendor stock features; "
            "trial-success training is synthetic multi-disease data for demo UI only."
        ),
    }
    (ml_path / "model_metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"✓ ML artifacts written to {ml_path} and {models_path}")
    if mirror_runtime:
        sync_ml_to_runtime(ml_path, models_path, PROCESSED_DIR, MODELS_DIR)
        print(f"✓ Mirrored to {PROCESSED_DIR} and {MODELS_DIR}")
    return ml_path


def ml_bundle_present(ml_dir: Path | str = DEMO_ML_DIR) -> bool:
    ml = Path(ml_dir)
    return all((ml / name).is_file() for name in TRAINING_ARTIFACTS)


def runtime_ml_present(
    processed_dir: Path | str = PROCESSED_DIR,
    models_dir: Path | str = MODELS_DIR,
) -> bool:
    """True when tracked runtime ML dirs have training CSVs and at least one model file."""
    proc = Path(processed_dir)
    mods = Path(models_dir)
    return ml_bundle_present(proc) and (mods / "ridge_regression.pkl").is_file()


def sync_ml_to_runtime(
    ml_dir: Path | str = DEMO_ML_DIR,
    models_dir: Path | str = DEMO_MODELS_DIR,
    processed_dir: Path | str = PROCESSED_DIR,
    runtime_models_dir: Path | str = MODELS_DIR,
) -> None:
    """Copy committed demo ML bundle into gitignored runtime dirs for the dashboard."""
    src_ml = Path(ml_dir)
    src_models = Path(models_dir)
    if not ml_bundle_present(src_ml):
        return

    proc = Path(processed_dir)
    run_models = Path(runtime_models_dir)
    proc.mkdir(parents=True, exist_ok=True)
    run_models.mkdir(parents=True, exist_ok=True)

    for name in TRAINING_ARTIFACTS:
        shutil.copy2(src_ml / name, proc / name)
    for name in MODEL_FILES:
        src = src_models / name
        if src.is_file():
            shutil.copy2(src, run_models / name)
