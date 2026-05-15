# Sickle Cell Disease Investment Analysis Platform

**On GitHub:** [Sickle-Cell-Investment-Analysis](https://github.com/maekass/Sickle-Cell-Investment-Analysis?tab=readme-ov-file) — README, source, and issues for this project.

## One-line pitch (cover letter / resume)

End-to-end **Python research stack** combining public **sickle cell epidemiology and trial** signals with **listed biotech/pharma** data, **staged private-market framing** (VC / growth / public), and a **Streamlit** surface—explicitly **non-advisory**, public sources only, with **illustrative** market and scoring tables until you wire authoritative feeds.

## Project overview

Quantitative research tooling at the intersection of sickle cell disease epidemiology, treatment innovation, and **public-market** company data. **“Buy/Hold” style scores in sample CSVs are demo weights only**, not research or investment advice.

## Key components (ordered)

1. **(Shipped)** Public health data analysis — prevalence-style series (illustrative sample), trials (**sourced** when ClinicalTrials.gov responds), FDA rows (illustrative), adoption fields in notebooks (**Roadmap**).
2. **(Shipped)** Investment analysis — tickers and fundamentals via `yfinance` (**sourced public, delayed**); universe editable in code.
3. **(Shipped)** Investment stage analysis — VC vs growth vs public **illustrative** CSVs; `investment_stage_analysis.py`.
4. **(Roadmap)** ML and regression — notebooks and fitted pipelines not wired to the dashboard yet.
5. **(Roadmap)** Quant framework — placeholder package `src/quant_framework/` for factors, backtests, Monte Carlo.
6. **(Shipped)** Market analysis — `market_analysis.py` writes TAM-style tables, pharma rows, deal flow, **demo** attractiveness scores (**illustrative**).

## Data manifest (provenance)

After `python src/data_collection/collect_all_data.py` and `python src/models/market_analysis.py`, the repo writes **`data/raw/data_manifest.json`**: for each registered CSV it records **illustrative vs sourced (public / delayed vendor)** and **`last_modified_utc`**. The Streamlit dashboard shows this under **Data provenance** on **every** page. The manifest file is **gitignored** (regenerate locally after pulls).

## Legal disclaimer

**Educational and research use only. Not investment advice, not medical advice, not a substitute for professional counsel.** No patient-level data in this repository. Verify compliance with applicable rules (including securities and health-data use) before any production or commercial use.

**Scores and labels:** Any “attractiveness,” “Strong Buy / Hold / Sell,” or similar fields produced by `market_analysis.py` or shown in the dashboard are **demo / illustrative weights for software testing only**—not research outputs, ratings, or recommendations.

## Equity, population data, and compliance (research framing)

- **Population and burden metrics** in `cdc_sickle_cell_data.csv` are currently **illustrated time series** generated in code to stand in until you wire **primary sources** (for example [CDC sickle cell disease data](https://www.cdc.gov/ncbddd/sicklecell/data.html), peer-reviewed epidemiology, or agency surveillance). Treat them as **non-authoritative** unless you replace them with cited pulls and document the extract date in your own workflow.
- **Health equity:** Disparate burden and access are legitimate research topics; keep **population-level public statistics** separate from **market or “investment” framing**, and avoid implying that communities exist to validate a financial thesis.
- **Dashboard (local):** with `streamlit run dashboard/app.py`, open **[http://localhost:8501](http://localhost:8501)** — see [Getting started](#getting-started) and [`dashboard/app.py`](dashboard/app.py).

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

**Open the dashboard:** after the command starts, use **[http://localhost:8501](http://localhost:8501)** (Streamlit’s default port). If you changed the port, use the URL Streamlit prints in the terminal.

- **This project on GitHub:** [README & repository](https://github.com/maekass/Sickle-Cell-Investment-Analysis?tab=readme-ov-file)
- **Dashboard UI code on GitHub:** [`dashboard/app.py` on `main`](https://github.com/maekass/Sickle-Cell-Investment-Analysis/blob/main/dashboard/app.py)

ClinicalTrials.gov and Yahoo Finance require network access. If the legacy ClinicalTrials URL fails, update `collect_health_data.py` to the [current API](https://clinicaltrials.gov/data-api/api). Some tickers in the sample universe (e.g. delisted names) may return no price history from Yahoo Finance; refresh the ticker map as needed.

## What changed vs the original single-file spec

- Added **`collect_all_data.py`** orchestrator referenced in your quick-start.
- **Renumbered** component list for readability.
- Fixed **VC implied multiple** in `investment_stage_analysis.py` (uses `vc_deals`, not growth deals).
- **`data_manifest.json`** (generated, gitignored) plus **per-page provenance** in the dashboard.
- **`.gitignore`** ignores generated `*.csv` and `data/raw/data_manifest.json` while keeping `data/raw/.gitkeep`.
