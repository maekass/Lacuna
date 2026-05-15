"""
Health-Market Correlation & Regression Analysis Engine
Quantifies relationships between public health metrics and pharmaceutical stock returns.
Methods: OLS regression, Granger causality, event study, factor models, rolling correlations.
All analysis uses public/delayed data — legally compliant for educational research.
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from scipy import stats
from scipy.stats import pearsonr, spearmanr
import statsmodels.api as sm
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, coint
from statsmodels.regression.rolling import RollingOLS
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
import warnings
import os
import sys

warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_collection.disease_config import DiseaseConfig, SECTOR_ETFS


class HealthMarketAnalyzer:
    """
    Quantitative engine linking public health metrics to market movements.

    Analyses:
    1. Rolling correlation: health trend → sector returns
    2. OLS regression: multi-factor model
    3. Granger causality: does trial activity predict stock moves?
    4. Event study: FDA approval announcement effects
    5. Factor model: beta decomposition against IBB/XBI
    6. Cointegration: long-run equilibrium between disease pairs
    """

    def __init__(self, disease_name: str = "Sickle Cell Disease"):
        self.disease_name = disease_name
        self.disease_config = DiseaseConfig.get_disease_config(disease_name)
        self.companies = self.disease_config.get("companies", {})
        self._prices_cache = {}
        self._etf_cache = {}

    def set_disease(self, disease_name: str):
        self.disease_name = disease_name
        self.disease_config = DiseaseConfig.get_disease_config(disease_name)
        self.companies = self.disease_config.get("companies", {})
        self._prices_cache = {}

    # ─── Data Loading ─────────────────────────────────────────────────────────

    def _get_prices(self, tickers: list, period: str = "3y") -> pd.DataFrame:
        """Fetch and cache adjusted close prices via yfinance"""
        key = (tuple(sorted(tickers)), period)
        if key in self._prices_cache:
            return self._prices_cache[key]

        data = {}
        for ticker in tickers:
            try:
                hist = yf.Ticker(ticker).history(period=period)
                if not hist.empty:
                    data[ticker] = hist["Close"]
            except Exception:
                pass

        df = pd.DataFrame(data)
        if not df.empty:
            df.index = pd.to_datetime(df.index.date)
        self._prices_cache[key] = df
        return df

    def _get_returns(self, tickers: list, period: str = "3y",
                     freq: str = "M") -> pd.DataFrame:
        """Get periodic returns (M=monthly, W=weekly, D=daily)"""
        prices = self._get_prices(tickers, period)
        if prices.empty:
            return pd.DataFrame()
        return prices.resample(freq).last().pct_change().dropna()

    def _make_synthetic_health_series(self, n_months: int = 36) -> pd.DataFrame:
        """
        Generate synthetic but calibrated monthly health metric time series.
        Real implementation would pull from CDC/ClinicalTrials.gov APIs.
        """
        rng = np.random.default_rng(hash(self.disease_name) % (2**32))
        config = self.disease_config
        prevalence = config.get("prevalence_us", 100000)
        trials_end = config.get("active_trials_estimate", 50)
        growth = config.get("prevalence_growth_rate", 0.02)

        dates = pd.date_range(end=datetime.today(), periods=n_months, freq="ME")
        trend = np.linspace(0, 1, n_months)

        return pd.DataFrame({
            "date": dates,
            "prevalence_trend": trend * prevalence * growth + rng.normal(0, prevalence * 0.01, n_months),
            "trial_count": np.linspace(trials_end * 0.7, trials_end, n_months) + rng.normal(0, 2, n_months),
            "approval_count": np.random.poisson(0.15, n_months).cumsum(),
            "rd_sentiment": rng.normal(0, 1, n_months).cumsum() * 0.05,
        }).set_index("date")

    # ─── Correlation Analysis ──────────────────────────────────────────────────

    def rolling_correlation(self, period: str = "3y",
                            window_months: int = 6) -> dict:
        """
        Rolling Pearson correlation between trial activity and stock returns.
        Returns per-ticker correlation time series and summary stats.
        """
        tickers = list(self.companies.values())[:6]
        returns = self._get_returns(tickers, period=period, freq="ME")
        health = self._make_synthetic_health_series(n_months=len(returns) + window_months)

        health_aligned = health.reindex(returns.index, method="ffill").dropna()
        common_idx = returns.index.intersection(health_aligned.index)
        returns = returns.loc[common_idx]
        health_aligned = health_aligned.loc[common_idx]

        if len(returns) < window_months + 2:
            return {"error": "Insufficient data", "window": window_months}

        results = {}
        for ticker in returns.columns:
            r_series = returns[ticker].dropna()
            h_series = health_aligned["trial_count"].loc[r_series.index]

            if len(r_series) < window_months:
                continue

            rolling_corr = [
                pearsonr(
                    r_series.iloc[i:i+window_months],
                    h_series.iloc[i:i+window_months]
                )[0]
                for i in range(len(r_series) - window_months + 1)
            ]

            overall_r, overall_p = pearsonr(r_series, h_series)
            results[ticker] = {
                "rolling_corr": rolling_corr,
                "dates": r_series.index[window_months-1:].tolist(),
                "overall_r": round(overall_r, 4),
                "p_value": round(overall_p, 4),
                "significant": overall_p < 0.05,
                "mean_rolling_corr": round(np.mean(rolling_corr), 4)
            }

        return results

    def correlation_heatmap_data(self, period: str = "3y") -> pd.DataFrame:
        """
        Correlation matrix between all disease companies + ETFs.
        """
        tickers = list(self.companies.values())[:8]
        etf_tickers = list(SECTOR_ETFS.values())[:4]
        all_tickers = tickers + etf_tickers

        returns = self._get_returns(all_tickers, period=period, freq="ME")
        if returns.empty:
            return pd.DataFrame()

        corr_matrix = returns.corr()
        labels = {v: k for k, v in {**self.companies, **SECTOR_ETFS}.items()}
        corr_matrix.index = [labels.get(t, t) for t in corr_matrix.index]
        corr_matrix.columns = [labels.get(t, t) for t in corr_matrix.columns]
        return corr_matrix

    # ─── OLS Regression ───────────────────────────────────────────────────────

    def multi_factor_regression(self, ticker: str,
                                 period: str = "3y") -> dict:
        """
        OLS regression: stock return ~ trial_count + prevalence_trend + IBB + approval_count
        Returns coefficients, R², p-values, residual diagnostics.
        """
        etf_tickers = ["IBB", "XBI"]
        prices = self._get_prices([ticker] + etf_tickers, period=period)
        if prices.empty or ticker not in prices.columns:
            return {"error": f"No data for {ticker}"}

        returns_df = prices.resample("ME").last().pct_change().dropna()
        health = self._make_synthetic_health_series(n_months=len(returns_df) + 2)
        health = health.reindex(returns_df.index, method="ffill").dropna()
        common = returns_df.index.intersection(health.index)

        y = returns_df[ticker].loc[common]
        X = pd.DataFrame({
            "ibb_return": returns_df["IBB"].loc[common] if "IBB" in returns_df else np.zeros(len(common)),
            "xbi_return": returns_df["XBI"].loc[common] if "XBI" in returns_df else np.zeros(len(common)),
            "trial_growth": health["trial_count"].loc[common].pct_change().fillna(0),
            "prevalence_trend": health["prevalence_trend"].loc[common],
            "rd_sentiment": health["rd_sentiment"].loc[common],
        }).loc[common].dropna()

        y = y.loc[X.index]
        X_sm = sm.add_constant(X)
        model = sm.OLS(y, X_sm).fit()

        return {
            "ticker": ticker,
            "r_squared": round(model.rsquared, 4),
            "adj_r_squared": round(model.rsquared_adj, 4),
            "f_statistic": round(model.fvalue, 4),
            "f_pvalue": round(model.f_pvalue, 4),
            "n_observations": int(model.nobs),
            "coefficients": {
                var: {
                    "coef": round(float(coef), 6),
                    "p_value": round(float(pval), 4),
                    "significant": float(pval) < 0.05,
                    "t_stat": round(float(tstat), 4)
                }
                for var, coef, pval, tstat in zip(
                    model.params.index, model.params.values,
                    model.pvalues.values, model.tvalues.values
                )
            },
            "residuals": model.resid.tolist(),
            "fitted_values": model.fittedvalues.tolist(),
            "dates": [str(d) for d in model.fittedvalues.index],
            "aic": round(model.aic, 2),
            "bic": round(model.bic, 2)
        }

    # ─── Granger Causality ────────────────────────────────────────────────────

    def granger_causality_test(self, ticker: str, period: str = "3y",
                                max_lag: int = 3) -> dict:
        """
        Tests: does trial activity Granger-cause stock returns?
        H0: trial activity does not Granger-cause returns.
        Reject at p < 0.05 → trial data has predictive power.
        """
        prices = self._get_prices([ticker], period=period)
        if prices.empty or ticker not in prices.columns:
            return {"error": f"No price data for {ticker}"}

        returns = prices[ticker].resample("ME").last().pct_change().dropna()
        health = self._make_synthetic_health_series(n_months=len(returns) + 3)
        health = health.reindex(returns.index, method="ffill").dropna()
        common = returns.index.intersection(health.index)

        trial_series = health["trial_count"].loc[common].pct_change().fillna(0)
        returns_aligned = returns.loc[common]

        # ADF stationarity check
        adf_stock = adfuller(returns_aligned)
        adf_trial = adfuller(trial_series)

        data = pd.concat([returns_aligned, trial_series], axis=1).dropna()
        data.columns = ["stock_return", "trial_growth"]

        results_by_lag = {}
        try:
            gc_test = grangercausalitytests(data[["stock_return", "trial_growth"]],
                                            maxlag=max_lag, verbose=False)
            for lag in range(1, max_lag + 1):
                f_stat = gc_test[lag][0]["ssr_ftest"][0]
                p_val = gc_test[lag][0]["ssr_ftest"][1]
                results_by_lag[lag] = {
                    "f_stat": round(float(f_stat), 4),
                    "p_value": round(float(p_val), 4),
                    "significant": float(p_val) < 0.05,
                    "interpretation": (
                        "Trial activity predicts stock returns"
                        if float(p_val) < 0.05 else
                        "No predictive relationship found"
                    )
                }
        except Exception as e:
            results_by_lag = {"error": str(e)}

        return {
            "ticker": ticker,
            "disease": self.disease_name,
            "n_observations": len(data),
            "stock_stationary": bool(adf_stock[1] < 0.05),
            "trial_stationary": bool(adf_trial[1] < 0.05),
            "results_by_lag": results_by_lag,
            "summary": "Significant predictive relationship found" if any(
                v.get("significant", False)
                for v in results_by_lag.values()
                if isinstance(v, dict)
            ) else "No Granger causality detected"
        }

    # ─── Event Study ──────────────────────────────────────────────────────────

    def event_study(self, ticker: str, event_dates: list = None,
                    window: int = 30) -> dict:
        """
        Event study: measures abnormal returns around FDA approval/trial events.
        CAR = Cumulative Abnormal Return = actual - expected (market-adjusted)
        """
        prices = self._get_prices([ticker, "IBB"], period="5y")
        if prices.empty or ticker not in prices.columns:
            return {"error": f"No data for {ticker}"}

        returns = prices.pct_change().dropna()
        stock_ret = returns[ticker]
        market_ret = returns["IBB"] if "IBB" in returns else pd.Series(0, index=returns.index)

        # Estimate beta over pre-event window (OLS)
        X = sm.add_constant(market_ret)
        try:
            beta_model = sm.OLS(stock_ret, X).fit()
            beta = beta_model.params["IBB"]
            alpha = beta_model.params["const"]
        except Exception:
            beta, alpha = 1.0, 0.0

        # Generate synthetic event dates if none provided
        if event_dates is None:
            all_dates = stock_ret.index.tolist()
            if len(all_dates) < window * 2:
                return {"error": "Insufficient data for event study"}
            rng = np.random.default_rng(42)
            n_events = min(5, len(all_dates) // (window * 2))
            event_idx = rng.choice(range(window, len(all_dates) - window), n_events, replace=False)
            event_dates = [all_dates[i] for i in sorted(event_idx)]

        event_windows = []
        for event_date in event_dates:
            try:
                ed = pd.Timestamp(event_date)
                idx = stock_ret.index.get_indexer([ed], method="nearest")[0]
                start = max(0, idx - window)
                end = min(len(stock_ret), idx + window + 1)
                window_ret = stock_ret.iloc[start:end]
                market_window = market_ret.iloc[start:end]

                # Abnormal returns = actual - expected
                expected = alpha + beta * market_window
                abnormal = window_ret - expected
                car = abnormal.cumsum()

                event_windows.append({
                    "event_date": str(ed.date()),
                    "car_final": round(float(car.iloc[-1]), 4),
                    "max_car": round(float(car.max()), 4),
                    "min_car": round(float(car.min()), 4),
                    "car_series": car.values.tolist(),
                    "dates": [str(d) for d in car.index],
                    "t_test_p": round(float(stats.ttest_1samp(abnormal, 0).pvalue), 4)
                })
            except Exception:
                continue

        avg_car = np.mean([e["car_final"] for e in event_windows]) if event_windows else 0

        return {
            "ticker": ticker,
            "disease": self.disease_name,
            "beta": round(float(beta), 4),
            "alpha": round(float(alpha), 6),
            "n_events": len(event_windows),
            "avg_car": round(float(avg_car), 4),
            "avg_car_pct": f"{avg_car*100:.2f}%",
            "event_windows": event_windows,
            "interpretation": (
                f"Average {avg_car*100:.1f}% abnormal return across {len(event_windows)} events"
            )
        }

    # ─── Factor Model ─────────────────────────────────────────────────────────

    def factor_model(self, period: str = "3y") -> pd.DataFrame:
        """
        Multi-factor model for all disease companies.
        Factors: Market (IBB), Size (XBI/IBB spread), Momentum, Volatility
        Returns betas, alphas, and R² for each company.
        """
        tickers = list(self.companies.values())[:8]
        etfs = ["IBB", "XBI", "XLV"]
        all_tickers = list(set(tickers + etfs))

        returns = self._get_returns(all_tickers, period=period, freq="ME")
        if returns.empty:
            return pd.DataFrame()

        factors = pd.DataFrame({
            "ibb": returns.get("IBB", pd.Series(0, index=returns.index)),
            "size_factor": returns.get("XBI", pd.Series(0, index=returns.index)) - returns.get("IBB", pd.Series(0, index=returns.index)),
            "defensive": returns.get("XLV", pd.Series(0, index=returns.index))
        }).dropna()

        rows = []
        for ticker in tickers:
            if ticker not in returns.columns:
                continue
            y = returns[ticker].dropna()
            common = y.index.intersection(factors.index)
            if len(common) < 12:
                continue

            y_aligned = y.loc[common]
            X_sm = sm.add_constant(factors.loc[common])
            try:
                result = sm.OLS(y_aligned, X_sm).fit()
                name = {v: k for k, v in self.companies.items()}.get(ticker, ticker)
                rows.append({
                    "Company": name,
                    "Ticker": ticker,
                    "Alpha (monthly)": f"{result.params['const']*100:.3f}%",
                    "Market Beta (IBB)": round(result.params.get("ibb", 0), 3),
                    "Size Beta": round(result.params.get("size_factor", 0), 3),
                    "Defensive Beta": round(result.params.get("defensive", 0), 3),
                    "R²": round(result.rsquared, 3),
                    "Info Ratio": round(result.params["const"] / (result.resid.std() + 1e-9), 4)
                })
            except Exception:
                continue

        return pd.DataFrame(rows)

    # ─── Summary ─────────────────────────────────────────────────────────────

    def run_full_analysis(self, ticker: str = None) -> dict:
        """Run all analyses for a ticker (defaults to first company)"""
        if ticker is None:
            ticker = list(self.companies.values())[0]

        print(f"\n=== Health-Market Analysis: {self.disease_name} | {ticker} ===\n")

        print("1. Running multi-factor regression...")
        regression = self.multi_factor_regression(ticker)

        print("2. Running Granger causality tests...")
        granger = self.granger_causality_test(ticker)

        print("3. Running event study...")
        event = self.event_study(ticker)

        print("4. Building factor model...")
        factors = self.factor_model()

        print("5. Computing correlation matrix...")
        corr = self.correlation_heatmap_data()

        return {
            "disease": self.disease_name,
            "ticker": ticker,
            "regression": regression,
            "granger": granger,
            "event_study": event,
            "factor_model": factors.to_dict("records") if not factors.empty else [],
            "correlation_shape": list(corr.shape) if not corr.empty else [0, 0]
        }
