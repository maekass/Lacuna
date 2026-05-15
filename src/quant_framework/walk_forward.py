"""
Walk-forward out-of-sample backtests on real price panels (delayed vendor CSVs).
"""

from __future__ import annotations

from typing import Callable

import numpy as np
import pandas as pd

GENE_THERAPY_TICKERS = ("CRSP", "VRTX", "BEAM", "NTLA", "EDIT")
PARSER_VERSION = "2026.05.4"


def _portfolio_metrics(daily_returns: pd.Series) -> dict[str, float]:
    if daily_returns.empty:
        return {
            "annual_return": 0.0,
            "volatility": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
        }
    cumulative = (1 + daily_returns).cumprod()
    rolling_max = cumulative.expanding().max()
    drawdown = (cumulative - rolling_max) / rolling_max
    ann_ret = float(daily_returns.mean() * 252)
    ann_vol = float(daily_returns.std() * np.sqrt(252))
    rf = 0.02
    sharpe = (ann_ret - rf) / ann_vol if ann_vol > 0 else 0.0
    return {
        "annual_return": ann_ret,
        "volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "max_drawdown": float(drawdown.min()),
    }


def equal_weight_returns(daily: pd.DataFrame) -> pd.Series:
    return daily.mean(axis=1)


def health_tilt_returns(daily: pd.DataFrame) -> pd.Series:
    gene = [c for c in GENE_THERAPY_TICKERS if c in daily.columns]
    if not gene:
        return equal_weight_returns(daily)
    cols = list(daily.columns)
    w = np.zeros(len(cols))
    base = 0.5 / len(cols)
    for t in gene:
        w[cols.index(t)] = base * 2
    w = w / w.sum()
    return daily.dot(w)


STRATEGIES: dict[str, Callable[[pd.DataFrame], pd.Series]] = {
    "Equal weight": equal_weight_returns,
    "Health-tilt demo": health_tilt_returns,
}


def walk_forward_folds(
    prices: pd.DataFrame,
    *,
    train_months: int = 24,
    test_months: int = 6,
    step_months: int = 6,
) -> pd.DataFrame:
    """
  Rolling train/test windows on daily closes. Returns one row per fold × strategy (test-period metrics).
    """
    prices = prices.sort_index().dropna(how="all")
    daily = prices.pct_change().dropna(how="all")
    if daily.shape[1] < 2 or len(daily) < 60:
        return pd.DataFrame()

    month_ends = daily.resample("ME").last().index
    if len(month_ends) < train_months + test_months + 1:
        return pd.DataFrame()

    rows: list[dict[str, object]] = []
    fold_id = 0
    start_i = 0
    while start_i + train_months + test_months <= len(month_ends):
        train_end = month_ends[start_i + train_months - 1]
        test_start = month_ends[start_i + train_months]
        test_end = month_ends[start_i + train_months + test_months - 1]
        train_slice = daily.loc[:train_end]
        test_slice = daily.loc[test_start:test_end]
        if len(test_slice) < 5:
            start_i += step_months
            continue

        for strategy, fn in STRATEGIES.items():
            test_rets = fn(test_slice)
            m = _portfolio_metrics(test_rets)
            rows.append(
                {
                    "fold_id": fold_id,
                    "strategy": strategy,
                    "train_start": str(train_slice.index.min().date()),
                    "train_end": str(train_end.date()),
                    "test_start": str(test_start.date()),
                    "test_end": str(test_end.date()),
                    "n_test_days": int(len(test_rets)),
                    "annual_return": round(m["annual_return"], 4),
                    "volatility": round(m["volatility"], 4),
                    "sharpe_ratio": round(m["sharpe_ratio"], 3),
                    "max_drawdown": round(m["max_drawdown"], 4),
                }
            )
        fold_id += 1
        start_i += step_months

    return pd.DataFrame(rows)


def walk_forward_summary(folds: pd.DataFrame) -> pd.DataFrame:
    """Pooled out-of-sample metrics: concatenate all test windows per strategy."""
    if folds.empty:
        return pd.DataFrame()
    rows: list[dict[str, object]] = []
    for strategy in folds["strategy"].unique():
        sub = folds[folds["strategy"] == strategy]
        mean_sharpe = float(sub["sharpe_ratio"].mean())
        mean_return = float(sub["annual_return"].mean())
        mean_dd = float(sub["max_drawdown"].mean())
        rows.append(
            {
                "strategy": strategy,
                "n_folds": int(len(sub)),
                "mean_test_annual_return": round(mean_return, 4),
                "mean_test_sharpe": round(mean_sharpe, 3),
                "mean_test_max_drawdown": round(mean_dd, 4),
                "notes": "Average of fold-level test metrics; not a single compounded OOS path.",
            }
        )
    return pd.DataFrame(rows)
