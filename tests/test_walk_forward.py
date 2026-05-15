import numpy as np
import pandas as pd

from src.quant_framework.walk_forward import (
    PARSER_VERSION,
    walk_forward_folds,
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
    assert set(folds["strategy"]) == {"Equal weight", "Health-tilt demo"}
    assert "sharpe_ratio" in folds.columns


def test_walk_forward_summary() -> None:
    prices = _synthetic_prices()
    folds = walk_forward_folds(prices, train_months=12, test_months=3, step_months=3)
    summary = walk_forward_summary(folds)
    assert len(summary) == 2
    assert summary["n_folds"].iloc[0] >= 1
