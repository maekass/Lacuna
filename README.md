# Immunology Investment Intelligence Platform

## ⚠️ Legal Disclaimer

> **Educational and research purposes only.** All data is publicly available and delayed. This is NOT investment advice. No patient-level or private health data is used. Illustrative scores and private-market figures are demo weights only. Verify compliance before any production or commercial use.

---

## One-Line Pitch

End-to-end Python research platform combining public **immunology epidemiology and trial signals** with **listed biotech/pharma** data, **ML-driven trial success prediction**, **deep quant analysis** (OLS, Granger causality, factor models, event studies), and a **2026-modern Streamlit** surface — multi-disease, legally compliant, public sources only.

## Disease Coverage

| Disease | Code | Prevalence (US) | Active Trials |
|---|---|---|---|
| Sickle Cell Disease | SCD | 118,000 | ~105 |
| Systemic Lupus Erythematosus | SLE | 322,000 | ~140 |
| Hidradenitis Suppurativa | HS | 330,000 | ~60 |
| Diabetic Nephropathy | DN | 800,000 | ~90 |
| Autoimmune Liver Diseases | ALD | 130,000 | ~55 |
| Multiple Sclerosis | MS | 1,000,000 | ~320 |
| Food Allergy & Anaphylaxis | FA | 32,000,000 | ~75 |

## Platform Features

### Public Health Analysis
- Epidemiological trend modeling (prevalence, diagnosis rate, treatment access)
- Clinical trial pipeline tracking via ClinicalTrials.gov API
- FDA approval timeline analysis
- Disease-specific research focus areas

### Investment Analysis
- Disease-relevant company universe with tickers (dynamically loaded per disease)
- Sector ETF benchmarking (IBB, XBI, XLV, BBH)
- Interactive stock price charts with configurable time ranges
- Company financial metrics via yfinance
- Investment stage comparison: VC vs Growth Equity vs Public Equity
- Market size, TAM, deal flow, competitive landscape

### ML & Regression
- **Trial Success Predictor** — Ensemble of RandomForest + GradientBoosting + LogisticRegression (+ XGBoost)
  - Features: phase, enrollment, sponsor type, mechanism class, duration, disease prevalence, prior FDA approvals
  - Calibrated to Hay et al. (2014) and Wong et al. (2019) published success rate distributions
  - Outputs: probability, 95% CI, per-model breakdown, feature importances
- **9 Regression Algorithms** with automatic hyperparameter tuning (Linear, Ridge, Lasso, ElasticNet, RF, GBM, SVR, KNN, AdaBoost)
- **24+ Engineered Features** including lagged variables, rolling statistics, momentum indicators, interaction terms
- Model comparison framework with MSE, R², MAE, MAPE diagnostics

### Deep Quant Analysis
- **Rolling Correlation** — trial activity vs monthly stock returns, per-ticker
- **OLS Multi-Factor Regression** — stock return ~ IBB + XBI + trial growth + prevalence + R&D sentiment, with full coefficient table and residuals plot
- **Granger Causality** — tests if trial data has statistically significant predictive power (lags 1–3)
- **Event Study** — cumulative abnormal returns (CAR) around FDA/trial events vs market-adjusted benchmark
- **Factor Model** — market beta, size factor, defensive factor, alpha, information ratio per company
- **Portfolio Optimization** — Modern Portfolio Theory with Sharpe, Sortino, Calmar ratios
- **Risk Analysis** — max drawdown, rolling volatility, efficient frontier, strategy comparison
- **Monte Carlo** simulations for scenario analysis

## Data manifest (provenance)

After `python src/data_collection/collect_all_data.py` and `python src/models/market_analysis.py`, the repo writes **`data/raw/data_manifest.json`**: for each registered CSV it records **illustrative vs sourced (public / delayed vendor)** and **`last_modified_utc`**. The Streamlit dashboard shows this under **Data provenance** on **every** page. The manifest file is **gitignored** (regenerate locally after pulls).

## Equity, population data, and compliance (research framing)

- **Population and burden metrics** in `cdc_sickle_cell_data.csv` are currently **illustrated time series** generated in code to stand in until you wire **primary sources** (for example [CDC sickle cell disease data](https://www.cdc.gov/ncbddd/sicklecell/data.html), peer-reviewed epidemiology, or agency surveillance). Treat them as **non-authoritative** unless you replace them with cited pulls and document the extract date in your own workflow.
- **Health equity:** Disparate burden and access are legitimate research topics; keep **population-level public statistics** separate from **market or “investment” framing**, and avoid implying that communities exist to validate a financial thesis.
- **Dashboard:** The Streamlit app shows the same **non-advisory** disclaimer at the top; charts and tables that use the files above should be read in that light.

## Tech stack

Python 3.9+, pandas, numpy, scikit-learn, optional TensorFlow/PyTorch later, yfinance, Streamlit, Plotly, requests.

## Project structure

```
sickle_cell_investment_analysis/
├── data/raw/
├── notebooks/
├── src/
│   ├── data_collection/
│   │   ├── collect_all_data.py
│   │   ├── collect_health_data.py
│   │   ├── collect_stock_data.py
│   │   ├── collect_vc_growth_data.py
│   │   └── data_manifest.py      # writes data_manifest.json (provenance)
│   ├── models/
│   ├── quant_framework/
│   └── visualization/
├── dashboard/
│   └── app.py
├── requirements.txt
└── README.md
```

## Getting started

From this directory (project root):

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python src/data_collection/collect_all_data.py
python src/models/investment_stage_analysis.py
python src/models/market_analysis.py
streamlit run dashboard/app.py
```

ClinicalTrials.gov and Yahoo Finance require network access. If the legacy ClinicalTrials URL fails, update `collect_health_data.py` to the [current API](https://clinicaltrials.gov/data-api/api). Some tickers in the sample universe (e.g. delisted names) may return no price history from Yahoo Finance; refresh the ticker map as needed.

## What changed vs the original single-file spec

- Added **`collect_all_data.py`** orchestrator referenced in your quick-start.
- **Renumbered** component list for readability.
- Fixed **VC implied multiple** in `investment_stage_analysis.py` (uses `vc_deals`, not growth deals).
- **`data_manifest.json`** (generated, gitignored) plus **per-page provenance** in the dashboard.
- **`.gitignore`** ignores generated `*.csv` and `data/raw/data_manifest.json` while keeping `data/raw/.gitkeep`.
