"""
Sickle Cell Investment Analysis Dashboard
Interactive Streamlit dashboard (run from project root).
"""

import json
import sys
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.data_manifest import kind_display_label

DATA = ROOT / "data" / "raw"

# Primary CSVs surfaced on each dashboard page (for manifest table)
PAGE_ARTIFACTS: dict[str, list[str]] = {
    "Overview": ["gene_therapy_pipeline_scd.csv", "fda_approvals_scd.csv"],
    "Health Trends": ["cdc_sickle_cell_data.csv", "clinical_trials_scd.csv"],
    "Stock Analysis": ["stock_prices_companies.csv", "stock_prices_etfs.csv", "company_financials.csv"],
    "ML Models": [],
    "Quant Strategy": [],
    "Portfolio Optimization": [],
    "Investment Stages": [
        "vc_deals_scd.csv",
        "growth_equity_deals_scd.csv",
        "public_equity_companies_scd.csv",
        "stage_returns_analysis.csv",
    ],
    "Market Analysis": [
        "market_size_scd.csv",
        "large_pharma_investments_scd.csv",
        "competitive_landscape_scd.csv",
        "deal_flow_scd.csv",
        "regulatory_landscape_scd.csv",
        "investment_attractiveness_scd.csv",
    ],
}


def load_csv(name: str) -> Optional[pd.DataFrame]:
    path = DATA / name
    if not path.exists():
        return None
    return pd.read_csv(path)


def load_manifest() -> Optional[dict[str, Any]]:
    path = DATA / "data_manifest.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _trials_by_start_year(trials: pd.DataFrame) -> pd.DataFrame:
    """Count trials in this CSV sample by calendar year of start_date."""
    df = trials.copy()
    if "start_date" not in df.columns:
        return pd.DataFrame(columns=["year", "trial_count"])
    df["start_date"] = pd.to_datetime(df["start_date"], errors="coerce")
    df = df.dropna(subset=["start_date"])
    if df.empty:
        return pd.DataFrame(columns=["year", "trial_count"])
    counts = df.groupby(df["start_date"].dt.year).size().reset_index(name="trial_count")
    counts.columns = ["year", "trial_count"]
    return counts.sort_values("year")


def render_health_trends_charts(cdc: pd.DataFrame, trials: Optional[pd.DataFrame]) -> None:
    """Separate charts: prevalence placeholder (CDC CSV) vs trial counts from ClinicalTrials sample."""
    cdc_df = cdc.copy()
    cdc_df["date"] = pd.to_datetime(cdc_df["date"])

    if "scd_prevalence_us" not in cdc_df.columns:
        st.error("CDC CSV is missing `scd_prevalence_us`. Re-run `collect_all_data.py`.")
        return

    # --- Chart 1: prevalence only (do not mix with trial counts on one axis) ---
    fig_prev = go.Figure()
    fig_prev.add_trace(
        go.Scatter(
            x=cdc_df["date"],
            y=cdc_df["scd_prevalence_us"],
            name="SCD prevalence (US, illustrative)",
            mode="lines+markers",
            line=dict(color="#1f77b4", width=2),
            marker=dict(size=4),
        )
    )
    fig_prev.update_layout(
        title="US sickle cell prevalence — illustrative time series (not a live CDC extract)",
        xaxis_title="Date",
        yaxis_title="Estimated prevalence (illustrative)",
        height=360,
        margin=dict(t=50, b=40),
        yaxis=dict(tickformat=",.0f"),
    )
    st.plotly_chart(fig_prev, use_container_width=True)

    # --- Chart 2: trials from ClinicalTrials.gov sample when available ---
    by_year = _trials_by_start_year(trials) if trials is not None and not trials.empty else pd.DataFrame()

    if not by_year.empty:
        fig_trials = go.Figure()
        fig_trials.add_trace(
            go.Bar(
                x=by_year["year"],
                y=by_year["trial_count"],
                name="Trials in sample",
                marker_color="#ff7f0e",
            )
        )
        fig_trials.update_layout(
            title="Clinical trials in this repo sample by trial start year (ClinicalTrials.gov)",
            xaxis_title="Start year",
            yaxis_title="Number of trials in CSV sample",
            height=360,
            margin=dict(t=50, b=40),
            xaxis=dict(dtick=1),
        )
        st.plotly_chart(fig_trials, use_container_width=True)
        st.caption(
            f"Counts {len(trials)} studies returned by the collector query—not total global trial volume."
        )
    elif "clinical_trials_active" in cdc_df.columns:
        st.caption(
            "No dated trials in `clinical_trials_scd.csv` for a bar chart; showing illustrative "
            "`clinical_trials_active` from the CDC-named placeholder CSV instead."
        )
        fig_placeholder = go.Figure()
        fig_placeholder.add_trace(
            go.Scatter(
                x=cdc_df["date"],
                y=cdc_df["clinical_trials_active"],
                name="Active trials (illustrative placeholder)",
                mode="lines+markers",
                line=dict(color="#ff7f0e", width=2),
            )
        )
        fig_placeholder.update_layout(
            title="Active trials — illustrative placeholder series in CDC CSV (not ClinicalTrials.gov)",
            xaxis_title="Date",
            yaxis_title="Count (illustrative)",
            height=360,
            margin=dict(t=50, b=40),
        )
        st.plotly_chart(fig_placeholder, use_container_width=True)
    else:
        st.info("Run `collect_all_data.py` to load ClinicalTrials.gov rows for the trials chart.")


def render_page_provenance(page: str, manifest: Optional[dict[str, Any]]) -> None:
    """Every page: sourced vs illustrative + last modified from data_manifest.json."""
    files = PAGE_ARTIFACTS.get(page, [])
    with st.expander("**Data provenance** — sourced vs illustrative · manifest timestamps", expanded=False):
        if manifest is None:
            st.markdown(
                "No `data/raw/data_manifest.json` yet. From the project root run:\n"
                "`python src/data_collection/collect_all_data.py` then "
                "`python src/models/market_analysis.py` so timestamps and kinds stay current."
            )
            return
        st.markdown(
            f"**Manifest last written (UTC):** `{manifest.get('last_manifest_write_utc', '—')}`  \n"
            f"**Trigger:** `{manifest.get('trigger', '—')}`"
        )
        if not files:
            st.caption(
                "This page is **Roadmap** / placeholder only — no registered CSVs. "
                "Nothing to list in the manifest table."
            )
            return
        arts = manifest.get("artifacts", {})
        rows: list[dict[str, str]] = []
        for fname in files:
            a = arts.get(fname, {})
            kind = a.get("kind", "")
            present = a.get("present", False)
            if present:
                lm = a.get("last_modified_utc", "—")
            else:
                lm = "— (file not on disk)"
            rows.append(
                {
                    "File": fname,
                    "Sourced vs illustrative": kind_display_label(kind) if kind else "—",
                    "Last updated (UTC)": lm,
                    "Summary": (a.get("source_summary") or "")[:200],
                }
            )
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


st.set_page_config(
    page_title="Sickle Cell Investment Analysis",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .main-header { font-size: 2.5rem; font-weight: bold; color: #1f77b4; text-align: center; margin-bottom: 1rem; }
    .sub-header { font-size: 1.8rem; font-weight: bold; color: #2c3e50; margin-top: 2rem; margin-bottom: 1rem; }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown('<p class="main-header">🧬 Sickle Cell Investment Analysis Platform</p>', unsafe_allow_html=True)

st.markdown(
    """
<div style='background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin-bottom: 20px;'>
    <strong>⚠️ Disclaimer (non-advisory):</strong> Educational and research use only.
    <strong>Not investment advice, not medical advice.</strong> Public and delayed sources only; no patient-level data in this app.
    <br/><br/>
    <strong>Demo / illustrative only:</strong> Any attractiveness scores, “Strong Buy / Hold / Sell” labels, TAM blocks,
    VC tables, and similar outputs are <strong>software demo weights</strong>—not ratings, forecasts, or recommendations.
    <br/><br/>
    <strong>Population &amp; burden charts:</strong> CDC-style series in <code>cdc_sickle_cell_data.csv</code> are
    <strong>illustrative placeholders</strong> until you wire cited primary sources (e.g. agency surveillance); see README
    “Equity, population data, and compliance.”
    <br/><br/>
    <strong>Health equity:</strong> Keep population-health statistics analytically separate from market framing; do not treat communities as a trade thesis.
</div>
""",
    unsafe_allow_html=True,
)

st.sidebar.markdown(
    "**Reminder:** all scores and population curves here are **demo / illustrative** — not advice. "
    "See top banner and README."
)
st.sidebar.header("Navigation")
page = st.sidebar.radio(
    "Select Page",
    [
        "Overview",
        "Health Trends",
        "Stock Analysis",
        "ML Models",
        "Quant Strategy",
        "Portfolio Optimization",
        "Investment Stages",
        "Market Analysis",
    ],
)

_manifest = load_manifest()
render_page_provenance(page, _manifest)

missing = not DATA.exists() or not any(DATA.glob("*.csv"))
if missing:
    st.warning(
        f"No CSV data found under `{DATA}`. From the project root run: "
        "`python src/data_collection/collect_all_data.py` and optionally `python src/models/market_analysis.py`. "
        "**On [Streamlit Community Cloud](https://share.streamlit.io/)** (this repo’s default deploy), CSVs are "
        "gitignored—run the same commands in **[Codespaces](https://codespaces.new/maekass/Sickle-Cell-Investment-Analysis)** "
        "or locally, commit data only if your policy allows, then redeploy or refresh."
    )

if page == "Overview":
    st.subheader("Overview")
    st.caption(
        "Pipeline table and probability-of-success values below are **illustrative / demo** for UI testing—not "
        "clinical or investment recommendations."
    )
    pipeline = load_csv("gene_therapy_pipeline_scd.csv")
    if pipeline is not None:
        st.dataframe(pipeline, use_container_width=True)
        fig = px.bar(
            pipeline,
            x="company",
            y="probability_of_success",
            color="technology",
            title="Illustrative POS by company (demo)",
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Run data collection to populate overview tables.")

elif page == "Health Trends":
    st.subheader("Health trends")
    st.info(
        "**Population / burden (illustrative):** The CDC-named CSV here is generated in code as a placeholder "
        "time series, not a live CDC extract. **Planned work:** replace with primary-sourced pulls and cite extract "
        "date and methodology in your workflow. See README → Equity, population data, and compliance."
    )
    cdc = load_csv("cdc_sickle_cell_data.csv")
    trials = load_csv("clinical_trials_scd.csv")

    if cdc is None and (trials is None or trials.empty):
        st.warning(
            "No health data files found. From the project root run:\n"
            "`python3 src/data_collection/collect_all_data.py`"
        )
    elif cdc is not None:
        render_health_trends_charts(cdc, trials)
    else:
        st.info("Run data collection to load `cdc_sickle_cell_data.csv` for the trend chart.")

    if trials is not None and not trials.empty:
        st.subheader("Clinical trials (sourced when API responds)")
        st.caption("From ClinicalTrials.gov (public API); verify query and API version for your use case.")
        display_trials = trials.copy()
        if "start_date" in display_trials.columns:
            display_trials["start_date"] = pd.to_datetime(
                display_trials["start_date"], errors="coerce"
            )
        st.dataframe(display_trials.head(20), use_container_width=True, hide_index=True)
    elif trials is not None:
        st.info("Clinical trials file exists but has no rows. Re-run `collect_all_data.py` with network access.")

elif page == "Stock Analysis":
    st.subheader("Stock analysis")
    st.caption(
        "Prices and fundamentals are **Sourced (public, delayed vendor)** via Yahoo Finance / yfinance when files exist. "
        "See provenance expander above."
    )
    fin = load_csv("company_financials.csv")
    if fin is not None:
        st.dataframe(fin, use_container_width=True)

elif page == "ML Models":
    st.subheader("ML models")
    st.caption("**Roadmap:** no fitted models or training CSVs wired to this page yet.")
    st.write("Placeholder: add regression / time-series notebooks and wire results here.")

elif page == "Quant Strategy":
    st.subheader("Quant strategy")
    st.caption("**Roadmap:** no factor / backtest outputs registered in `data_manifest` for this page yet.")
    st.write("Placeholder: factor models, backtests (e.g. Backtrader), Monte Carlo.")

elif page == "Portfolio Optimization":
    st.subheader("Portfolio optimization")
    st.caption("**Roadmap:** no portfolio optimization outputs on disk yet.")
    st.write("Placeholder: efficient frontier and risk metrics.")

elif page == "Investment Stages":
    st.subheader("Investment stages")
    st.caption("Private-market tables below are **Illustrative** (see manifest). Not licensed deal data.")
    vc = load_csv("vc_deals_scd.csv")
    growth = load_csv("growth_equity_deals_scd.csv")
    if vc is not None and growth is not None:
        st.write("**VC funding (illustrative)**")
        st.dataframe(vc, use_container_width=True)
        st.write("**Growth equity (illustrative)**")
        st.dataframe(growth, use_container_width=True)

elif page == "Market Analysis":
    st.subheader("Market analysis")
    st.warning(
        "**Demo / non-advisory:** Market size and competitive tables below are illustrative scaffolding. "
        "**Investment attractiveness scores and buy/hold/sell labels are demo weights only**—not research, "
        "not ratings, not recommendations."
    )
    mkt = load_csv("market_size_scd.csv")
    attr = load_csv("investment_attractiveness_scd.csv")
    if mkt is not None:
        st.caption("market_size_scd.csv — illustrative TAM-style rows unless you replace with sourced estimates.")
        st.dataframe(mkt, use_container_width=True)
    if attr is not None:
        st.caption("investment_attractiveness_scd.csv — demo scores only; do not use for real decisions.")
        st.dataframe(attr, use_container_width=True)
