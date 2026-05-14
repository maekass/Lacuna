"""
Sickle Cell Investment Analysis Dashboard
Interactive Streamlit dashboard (run from project root).
"""

from pathlib import Path
from typing import Optional

import pandas as pd
import plotly.express as px
import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "raw"


def load_csv(name: str) -> Optional[pd.DataFrame]:
    path = DATA / name
    if not path.exists():
        return None
    return pd.read_csv(path)


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
    <strong>⚠️ LEGAL DISCLAIMER:</strong> This platform is for educational and research purposes only.
    All data is publicly available and delayed. This is NOT investment advice.
    No patient-level or private health data is used. Attractiveness scores in sample data are illustrative only.
</div>
""",
    unsafe_allow_html=True,
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

missing = not DATA.exists() or not any(DATA.glob("*.csv"))
if missing:
    st.warning(
        f"No CSV data found under `{DATA}`. From the project root run: "
        "`python src/data_collection/collect_all_data.py` and optionally `python src/models/market_analysis.py`."
    )

if page == "Overview":
    st.subheader("Overview")
    pipeline = load_csv("gene_therapy_pipeline_scd.csv")
    if pipeline is not None:
        st.dataframe(pipeline, use_container_width=True)
        fig = px.bar(
            pipeline,
            x="company",
            y="probability_of_success",
            color="technology",
            title="Illustrative POS by company",
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Run data collection to populate overview tables.")

elif page == "Health Trends":
    st.subheader("Health trends")
    cdc = load_csv("cdc_sickle_cell_data.csv")
    trials = load_csv("clinical_trials_scd.csv")
    if cdc is not None:
        cdc = cdc.copy()
        cdc["date"] = pd.to_datetime(cdc["date"])
        st.line_chart(cdc.set_index("date")[["scd_prevalence_us", "clinical_trials_active"]])
    if trials is not None and not trials.empty:
        st.dataframe(trials.head(20), use_container_width=True)

elif page == "Stock Analysis":
    st.subheader("Stock analysis")
    fin = load_csv("company_financials.csv")
    if fin is not None:
        st.dataframe(fin, use_container_width=True)

elif page == "ML Models":
    st.subheader("ML models")
    st.write("Placeholder: add regression / time-series notebooks and wire results here.")

elif page == "Quant Strategy":
    st.subheader("Quant strategy")
    st.write("Placeholder: factor models, backtests (e.g. Backtrader), Monte Carlo.")

elif page == "Portfolio Optimization":
    st.subheader("Portfolio optimization")
    st.write("Placeholder: efficient frontier and risk metrics.")

elif page == "Investment Stages":
    st.subheader("Investment stages")
    vc = load_csv("vc_deals_scd.csv")
    growth = load_csv("growth_equity_deals_scd.csv")
    if vc is not None and growth is not None:
        st.write("**VC funding (illustrative)**")
        st.dataframe(vc, use_container_width=True)
        st.write("**Growth equity (illustrative)**")
        st.dataframe(growth, use_container_width=True)

elif page == "Market Analysis":
    st.subheader("Market analysis")
    mkt = load_csv("market_size_scd.csv")
    attr = load_csv("investment_attractiveness_scd.csv")
    if mkt is not None:
        st.dataframe(mkt, use_container_width=True)
    if attr is not None:
        st.dataframe(attr, use_container_width=True)
