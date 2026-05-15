"""
Build quant dashboard artifacts from bundled stock CSVs (no live yfinance on Cloud).
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import statsmodels.api as sm
from src.quant_framework.risk_optimization import RiskOptimizedPortfolio
from src.quant_framework.walk_forward import walk_forward_folds, walk_forward_summary

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
DEMO_QUANT_DIR = ROOT / "data" / "demo" / "quant"
PROCESSED_QUANT_DIR = ROOT / "data" / "processed" / "quant"

QUANT_ARTIFACTS = (
    "backtest_metrics.csv",
    "walk_forward_folds.csv",
    "walk_forward_summary.csv",
    "factor_model_betas.csv",
    "monte_carlo_fan.csv",
    "efficient_frontier.csv",
    "portfolio_weights.csv",
    "quant_metrics.json",
)


def _close_matrix_from_csv(path: Path) -> pd.DataFrame:
    prices = pd.read_csv(path, header=[0, 1], index_col=0, parse_dates=True)
    closes: dict[str, pd.Series] = {}
    if isinstance(prices.columns, pd.MultiIndex):
        for col in prices.columns:
            ticker, field = col[0], col[1]
            if str(field) == "Close":
                closes[str(ticker)] = prices[col]
    else:
        closes = {c: prices[c] for c in prices.columns}
    out = pd.DataFrame(closes)
    out.index = pd.to_datetime(out.index, utc=True).tz_localize(None)
    return out.sort_index().dropna(how="all")


def load_price_panels(raw_dir: Path | str = RAW_DIR) -> tuple[pd.DataFrame, pd.DataFrame]:
    raw = Path(raw_dir)
    companies = _close_matrix_from_csv(raw / "stock_prices_companies.csv")
    etfs = _close_matrix_from_csv(raw / "stock_prices_etfs.csv")
    return companies, etfs


def _portfolio_metrics(daily_returns: pd.Series) -> dict[str, float]:
    cumulative = (1 + daily_returns).cumprod()
    rolling_max = cumulative.expanding().max()
    drawdown = (cumulative - rolling_max) / rolling_max
    ann_ret = daily_returns.mean() * 252
    ann_vol = daily_returns.std() * np.sqrt(252)
    rf = 0.02
    sharpe = (ann_ret - rf) / ann_vol if ann_vol > 0 else 0.0
    return {
        "annual_return": ann_ret,
        "volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "max_drawdown": float(drawdown.min()),
    }


def build_backtest_metrics(prices: pd.DataFrame) -> pd.DataFrame:
    daily = prices.pct_change().dropna()
    eq = daily.mean(axis=1)
    # Health-signal demo: overweight gene-therapy tickers when present
    gene = [c for c in ("CRSP", "VRTX", "BEAM", "NTLA", "EDIT") if c in daily.columns]
    if gene:
        w = np.zeros(len(daily.columns))
        cols = list(daily.columns)
        base = 0.5 / len(cols)
        for t in gene:
            w[cols.index(t)] = base * 2
        w = w / w.sum()
        health = daily.dot(w)
    else:
        health = eq

    rows = []
    for name, series in [("Equal weight", eq), ("Health-tilt demo", health)]:
        m = _portfolio_metrics(series)
        rows.append(
            {
                "strategy": name,
                "annual_return": round(m["annual_return"], 4),
                "volatility": round(m["volatility"], 4),
                "sharpe_ratio": round(m["sharpe_ratio"], 3),
                "max_drawdown": round(m["max_drawdown"], 4),
            }
        )
    return pd.DataFrame(rows)


def build_factor_model(prices: pd.DataFrame, etfs: pd.DataFrame) -> pd.DataFrame:
    """Multi-factor regression: stock ~ IBB + XBI spread + 12m momentum (monthly)."""
    stock_m = prices.resample("ME").last().pct_change().dropna()
    etf_m = etfs.resample("ME").last().pct_change().dropna()
    if "IBB" not in etf_m.columns or "XBI" not in etf_m.columns:
        return pd.DataFrame()

    factors = pd.DataFrame(
        {
            "ibb": etf_m["IBB"],
            "size_spread": etf_m["XBI"] - etf_m["IBB"],
        },
        index=etf_m.index,
    ).dropna()

    rows: list[dict[str, Any]] = []
    for ticker in stock_m.columns:
        y = stock_m[ticker].dropna()
        idx = y.index.intersection(factors.index)
        if len(idx) < 8:
            continue
        yv = y.loc[idx]
        X = sm.add_constant(factors.loc[idx])
        fit = sm.OLS(yv, X).fit()
        rows.append(
            {
                "ticker": ticker,
                "alpha": round(float(fit.params.get("const", 0)), 4),
                "beta_ibb": round(float(fit.params.get("ibb", 0)), 3),
                "beta_size_spread": round(float(fit.params.get("size_spread", 0)), 3),
                "r_squared": round(float(fit.rsquared), 3),
            }
        )
    return pd.DataFrame(rows)


def build_monte_carlo_fan(daily_returns: pd.Series, n_days: int = 252, n_sims: int = 500) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    mu, sigma = daily_returns.mean(), daily_returns.std()
    paths = np.zeros((n_days, n_sims))
    for s in range(n_sims):
        r = rng.normal(mu, sigma, n_days)
        paths[:, s] = np.cumprod(1 + r)
    fan = pd.DataFrame(
        {
            "day": np.arange(1, n_days + 1),
            "p05": np.quantile(paths, 0.05, axis=1),
            "p50": np.quantile(paths, 0.50, axis=1),
            "p95": np.quantile(paths, 0.95, axis=1),
        }
    )
    return fan


def build_efficient_frontier(prices: pd.DataFrame, n_portfolios: int = 120) -> pd.DataFrame:
    daily = prices.pct_change().dropna()
    n = len(daily.columns)
    if n < 2:
        return pd.DataFrame()
    mean_ret = daily.mean() * 252
    cov = daily.cov() * 252
    rng = np.random.default_rng(7)
    rows = []
    for _ in range(n_portfolios):
        w = rng.random(n)
        w /= w.sum()
        ret = float(np.dot(w, mean_ret))
        vol = float(np.sqrt(w @ cov @ w))
        sharpe = (ret - 0.02) / vol if vol > 0 else 0.0
        rows.append({"volatility": vol, "expected_return": ret, "sharpe_ratio": sharpe})
    return pd.DataFrame(rows)


def build_portfolio_weights(prices: pd.DataFrame) -> pd.DataFrame:
    opt = RiskOptimizedPortfolio(prices)
    comparison, strategies = opt.compare_portfolios()
    long_rows: list[dict[str, Any]] = []
    tickers = list(prices.columns)
    for strategy, weights in strategies.items():
        for ticker, weight in zip(tickers, weights):
            long_rows.append(
                {"strategy": strategy, "ticker": ticker, "weight": round(float(weight), 4)}
            )
    return pd.DataFrame(long_rows), comparison


def train_all(
    raw_dir: Path | str = RAW_DIR,
    out_dir: Path | str = DEMO_QUANT_DIR,
    *,
    mirror_runtime: bool = True,
) -> Path:
    raw = Path(raw_dir)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    prices, etfs = load_price_panels(raw)
    if prices.shape[1] < 2:
        raise ValueError("Need at least two company price series in stock_prices_companies.csv")

    daily = prices.pct_change().dropna()
    eq_returns = daily.mean(axis=1)

    backtest_metrics = build_backtest_metrics(prices)
    wf_folds = walk_forward_folds(prices)
    wf_summary = walk_forward_summary(wf_folds)
    factor_betas = build_factor_model(prices, etfs)
    mc_fan = build_monte_carlo_fan(eq_returns)
    frontier = build_efficient_frontier(prices)
    weights_long, _ = build_portfolio_weights(prices)

    backtest_metrics.to_csv(out / "backtest_metrics.csv", index=False)
    wf_folds.to_csv(out / "walk_forward_folds.csv", index=False)
    wf_summary.to_csv(out / "walk_forward_summary.csv", index=False)
    factor_betas.to_csv(out / "factor_model_betas.csv", index=False)
    mc_fan.to_csv(out / "monte_carlo_fan.csv", index=False)
    frontier.to_csv(out / "efficient_frontier.csv", index=False)
    weights_long.to_csv(out / "portfolio_weights.csv", index=False)

    payload = {
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "tickers": list(prices.columns),
        "n_trading_days": int(len(daily)),
        "walk_forward": {
            "train_months": 24,
            "test_months": 6,
            "step_months": 6,
            "n_folds": int(wf_folds["fold_id"].nunique()) if not wf_folds.empty and "fold_id" in wf_folds.columns else 0,
        },
        "notes": "Quant outputs from delayed vendor CSVs; walk-forward uses rolling OOS folds. Not investment advice.",
    }
    (out / "quant_metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if mirror_runtime:
        sync_quant_to_runtime(out, PROCESSED_QUANT_DIR)
    return out


def quant_bundle_present(quant_dir: Path | str = DEMO_QUANT_DIR) -> bool:
    q = Path(quant_dir)
    return all((q / name).is_file() for name in QUANT_ARTIFACTS)


def sync_quant_to_runtime(
    src_dir: Path | str = DEMO_QUANT_DIR,
    dest_dir: Path | str = PROCESSED_QUANT_DIR,
) -> None:
    src, dest = Path(src_dir), Path(dest_dir)
    if not quant_bundle_present(src):
        return
    dest.mkdir(parents=True, exist_ok=True)
    for name in QUANT_ARTIFACTS:
        shutil.copy2(src / name, dest / name)
