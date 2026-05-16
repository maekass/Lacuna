import numpy as np
import pandas as pd

from src.quant_framework.walk_forward import (
    PARSER_VERSION,
    TILT_STRATEGY_GENE,
    walk_forward_compounded_summary,
    walk_forward_folds,
    walk_forward_oos_curve,
    walk_forward_summary,
)


def _synthetic_prices(n_days: int = 900, tickers: tuple[str, ...] = ("CRSP", "VRTX", "PFE")) -> pd.DataFrame:
    rng = np.random.default_rng(0)
    idx = pd.bdate_range("2020-01-01", periods=n_days)
    data = {t: 100 * np.cumprod(1 + rng.normal(0.0004, 0.02, n_days)) for t in tickers}
    return pd.DataFrame(data, index=idx)


def test_walk_forward_parser_version() -> None:
    assert "2026" in PARSER_VERSION


def test_walk_forward_produces_folds() -> None:
    prices = _synthetic_prices()
    folds = walk_forward_folds(prices, train_months=12, test_months=3, step_months=3)
    assert not folds.empty
    assert "Equal weight" in set(folds["strategy"])
    assert TILT_STRATEGY_GENE in set(folds["strategy"])
    assert folds["disease_id"].iloc[0] == "all"


def test_walk_forward_oos_curve_compounds() -> None:
    prices = _synthetic_prices()
    curve = walk_forward_oos_curve(prices, train_months=12, test_months=3, step_months=3)
    assert not curve.empty
    assert "cumulative_return" in curve.columns
    eq = curve[curve["strategy"] == "Equal weight"].sort_values("date")
    assert float(eq["cumulative_return"].iloc[-1]) > 0


def test_walk_forward_compounded_summary() -> None:
    prices = _synthetic_prices()
    curve = walk_forward_oos_curve(prices, train_months=12, test_months=3, step_months=3)
    summary = walk_forward_compounded_summary(curve)
    assert not summary.empty
    assert "oos_total_return" in summary.columns


def test_registry_tilt_strategy_name() -> None:
    prices = _synthetic_prices(tickers=("CRSP", "VRTX", "PFE"))
    folds = walk_forward_folds(
        prices,
        disease_id="scd",
        tilt_tickers=("CRSP", "VRTX"),
        train_months=12,
        test_months=3,
        step_months=3,
    )
    assert "Registry-tilt demo" in set(folds["strategy"])


def test_walk_forward_summary_by_disease() -> None:
    prices = _synthetic_prices()
    folds = walk_forward_folds(prices, train_months=12, test_months=3, step_months=3)
    summary = walk_forward_summary(folds)
    assert "disease_id" in summary.columns
    assert len(summary) >= 2
