"""
Walk-forward out-of-sample backtests on real price panels (delayed vendor CSVs).
"""

from __future__ import annotations

from typing import Callable, Iterator

import numpy as np
import pandas as pd

GENE_THERAPY_TICKERS = ("CRSP", "VRTX", "BEAM", "NTLA", "EDIT")
PARSER_VERSION = "2026.05.5"
TILT_STRATEGY_GENE = "Health-tilt demo"
TILT_STRATEGY_REGISTRY = "Registry-tilt demo"


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


def tilt_returns(daily: pd.DataFrame, overweight: tuple[str, ...]) -> pd.Series:
    focus = [c for c in overweight if c in daily.columns]
    if not focus:
        return equal_weight_returns(daily)
    cols = list(daily.columns)
    w = np.zeros(len(cols))
    base = 0.5 / len(cols)
    for t in focus:
        w[cols.index(t)] = base * 2
    w = w / w.sum()
    return daily.dot(w)


def health_tilt_returns(daily: pd.DataFrame) -> pd.Series:
    return tilt_returns(daily, GENE_THERAPY_TICKERS)


def build_strategies(
    tilt_tickers: tuple[str, ...] | None,
) -> dict[str, Callable[[pd.DataFrame], pd.Series]]:
    if tilt_tickers is None:
        tilt_tickers = GENE_THERAPY_TICKERS
        tilt_name = TILT_STRATEGY_GENE
    else:
        tilt_name = TILT_STRATEGY_REGISTRY

    return {
        "Equal weight": equal_weight_returns,
        tilt_name: lambda d, t=tilt_tickers: tilt_returns(d, t),
    }


def _daily_from_prices(prices: pd.DataFrame) -> pd.DataFrame:
    prices = prices.sort_index().dropna(how="all")
    return prices.pct_change().dropna(how="all")


def _iter_walk_forward_slices(
    daily: pd.DataFrame,
    *,
    train_months: int,
    test_months: int,
    step_months: int,
) -> Iterator[tuple[int, pd.DataFrame, pd.Timestamp, pd.Timestamp, pd.DataFrame]]:
    month_ends = daily.resample("ME").last().index
    fold_id = 0
    start_i = 0
    while start_i + train_months + test_months <= len(month_ends):
        train_end = month_ends[start_i + train_months - 1]
        test_start = month_ends[start_i + train_months]
        test_end = month_ends[start_i + train_months + test_months - 1]
        train_slice = daily.loc[:train_end]
        test_slice = daily.loc[test_start:test_end]
        if len(test_slice) >= 5:
            yield fold_id, train_slice, test_start, test_end, test_slice
            fold_id += 1
        start_i += step_months


def walk_forward_folds(
    prices: pd.DataFrame,
    *,
    disease_id: str = "all",
    tilt_tickers: tuple[str, ...] | None = None,
    train_months: int = 24,
    test_months: int = 6,
    step_months: int = 6,
) -> pd.DataFrame:
    """Rolling train/test windows; one row per fold × strategy (test-period metrics)."""
    daily = _daily_from_prices(prices)
    if daily.shape[1] < 2 or len(daily) < 60:
        return pd.DataFrame()

    month_ends = daily.resample("ME").last().index
    if len(month_ends) < train_months + test_months + 1:
        return pd.DataFrame()

    strategies = build_strategies(tilt_tickers)
    rows: list[dict[str, object]] = []
    for fold_id, train_slice, test_start, test_end, test_slice in _iter_walk_forward_slices(
        daily,
        train_months=train_months,
        test_months=test_months,
        step_months=step_months,
    ):
        train_end_date = train_slice.index.max()
        for strategy, fn in strategies.items():
            test_rets = fn(test_slice)
            m = _portfolio_metrics(test_rets)
            rows.append(
                {
                    "disease_id": disease_id,
                    "fold_id": fold_id,
                    "strategy": strategy,
                    "train_start": str(train_slice.index.min().date()),
                    "train_end": str(pd.Timestamp(train_end_date).date()),
                    "test_start": str(test_start.date()),
                    "test_end": str(test_end.date()),
                    "n_test_days": int(len(test_rets)),
                    "annual_return": round(m["annual_return"], 4),
                    "volatility": round(m["volatility"], 4),
                    "sharpe_ratio": round(m["sharpe_ratio"], 3),
                    "max_drawdown": round(m["max_drawdown"], 4),
                }
            )
    return pd.DataFrame(rows)


def walk_forward_oos_curve(
    prices: pd.DataFrame,
    *,
    disease_id: str = "all",
    tilt_tickers: tuple[str, ...] | None = None,
    train_months: int = 24,
    test_months: int = 6,
    step_months: int = 6,
) -> pd.DataFrame:
    """Chain test-window returns into one compounded out-of-sample equity curve per strategy."""
    daily = _daily_from_prices(prices)
    if daily.shape[1] < 2:
        return pd.DataFrame()

    strategies = build_strategies(tilt_tickers)
    rows: list[dict[str, object]] = []
    for strategy, fn in strategies.items():
        oos_parts: list[pd.Series] = []
        for _, _, _, _, test_slice in _iter_walk_forward_slices(
            daily,
            train_months=train_months,
            test_months=test_months,
            step_months=step_months,
        ):
            oos_parts.append(fn(test_slice))
        if not oos_parts:
            continue
        chained = pd.concat(oos_parts).sort_index()
        chained = chained[~chained.index.duplicated(keep="first")]
        cumulative = (1 + chained).cumprod()
        for dt, level in cumulative.items():
            rows.append(
                {
                    "date": str(pd.Timestamp(dt).date()),
                    "disease_id": disease_id,
                    "strategy": strategy,
                    "cumulative_return": round(float(level), 6),
                }
            )
    return pd.DataFrame(rows)


def walk_forward_summary(folds: pd.DataFrame) -> pd.DataFrame:
    """Average fold-level test metrics (not compounded path)."""
    if folds.empty or "disease_id" not in folds.columns:
        return pd.DataFrame()
    rows: list[dict[str, object]] = []
    for (did, strategy), sub in folds.groupby(["disease_id", "strategy"]):
        rows.append(
            {
                "disease_id": did,
                "strategy": strategy,
                "n_folds": int(len(sub)),
                "mean_test_annual_return": round(float(sub["annual_return"].mean()), 4),
                "mean_test_sharpe": round(float(sub["sharpe_ratio"].mean()), 3),
                "mean_test_max_drawdown": round(float(sub["max_drawdown"].mean()), 4),
                "notes": "Average of fold-level test metrics; see walk_forward_oos_curve for compounded OOS path.",
            }
        )
    return pd.DataFrame(rows)


def walk_forward_compounded_summary(oos_curve: pd.DataFrame) -> pd.DataFrame:
    """Metrics on the chained out-of-sample cumulative return path."""
    if oos_curve.empty:
        return pd.DataFrame()
    rows: list[dict[str, object]] = []
    for (did, strategy), grp in oos_curve.groupby(["disease_id", "strategy"]):
        grp = grp.sort_values("date")
        levels = grp["cumulative_return"].astype(float)
        if len(levels) < 2:
            continue
        daily_rets = levels.pct_change().dropna()
        m = _portfolio_metrics(daily_rets)
        total_return = float(levels.iloc[-1] / levels.iloc[0] - 1)
        rows.append(
            {
                "disease_id": did,
                "strategy": strategy,
                "oos_total_return": round(total_return, 4),
                "oos_annual_return": round(m["annual_return"], 4),
                "oos_sharpe": round(m["sharpe_ratio"], 3),
                "oos_max_drawdown": round(m["max_drawdown"], 4),
                "n_oos_days": int(len(daily_rets)),
            }
        )
    return pd.DataFrame(rows)
