# Sickle Cell Disease Investment Analysis Platform

## One-line pitch (cover letter / resume)

End-to-end **Python research stack** combining public **sickle cell epidemiology and trial** signals with **listed biotech/pharma** data, **staged private-market framing** (VC / growth / public), and a **Streamlit** surface—explicitly **non-advisory**, public sources only, with **illustrative** market and scoring tables until you wire authoritative feeds.

## Project overview

Quantitative research tooling at the intersection of sickle cell disease epidemiology, treatment innovation, and **public-market** company data. **“Buy/Hold” style scores in sample CSVs are demo weights only**, not research or investment advice.

## Key components (ordered)

1. **Public health data analysis** — Prevalence-style series (sample), trials (ClinicalTrials.gov when the endpoint responds), FDA rows (illustrative), adoption-style fields in notebooks (to extend).
2. **Investment analysis** — Tickers and fundamentals via `yfinance`; company universe is editable in code.
3. **Investment stage analysis** — VC vs growth vs public **illustrative** CSVs; `investment_stage_analysis.py` compares funding, multiples, and risk-return tables.
4. **ML and regression** — Planned in `notebooks/` (see repo roadmap in your own doc).
5. **Quant framework** — Placeholder package `src/quant_framework/` for factors, backtests, Monte Carlo.
6. **Market analysis** — `market_analysis.py` writes TAM-style tables, pharma rows, deal flow, and **demo** attractiveness scores to `data/raw/`.

## Legal disclaimer

Educational and research use only. Not investment advice. No patient-level data. Verify compliance with applicable rules before any production or commercial use.

## Tech stack

Python 3.9+, pandas, numpy, scikit-learn, optional TensorFlow/PyTorch later, yfinance, Streamlit, Plotly, requests.

## Project structure

```
sickle_cell_investment_analysis/
├── data/raw/
├── notebooks/
├── src/
│   ├── data_collection/
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
- **Dashboard** loads CSVs from `data/raw/` with clear placeholders for ML/quant pages.
- **`.gitignore`** ignores generated `*.csv` while keeping `data/raw/.gitkeep`.
