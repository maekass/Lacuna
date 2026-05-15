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

from dashboard.theme import apply_glass_theme, apply_plotly_theme, glass_hero, zone_banner
from src.data_collection.bootstrap_data import data_is_present, run_full_pipeline, seed_demo_if_missing
from src.data_collection.data_manifest import kind_display_label
from src.data_collection.seed_demo_data import sync_ml_from_demo, sync_quant_from_demo
from src.disease_registry import get_disease, list_diseases
from src.ontology.enrich import enrich_artifact
from src.models.ml_artifacts import ml_bundle_present
from src.quant_framework.quant_artifacts import quant_bundle_present

DATA = ROOT / "data" / "raw"
ML_DATA = ROOT / "data" / "processed"
ML_MODELS = ROOT / "data" / "models"
QUANT_DATA = ROOT / "data" / "processed" / "quant"


@st.cache_resource(show_spinner=False)
def _bootstrap_data_cached() -> bool:
    """Once per Cloud container: seed bundled CSVs, then optional API refresh."""
    if seed_demo_if_missing(DATA):
        return True
    run_full_pipeline(DATA)
    return True

# Primary CSVs surfaced on each dashboard page (for manifest table)
PAGE_ARTIFACTS: dict[str, list[str]] = {
    "Overview": ["gene_therapy_pipeline_scd.csv", "fda_approvals_scd.csv"],
    "Health Trends": ["cdc_sickle_cell_data.csv", "clinical_trials_scd.csv"],
    "Stock Analysis": ["stock_prices_companies.csv", "stock_prices_etfs.csv", "company_financials.csv"],
    "ML Models": [
        "regression_training.csv",
        "trial_success_training.csv",
        "model_comparison.csv",
    ],
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


def load_csv(name: str, base: Path | None = None) -> Optional[pd.DataFrame]:
    path = (base or DATA) / name
    if not path.exists():
        return None
    return pd.read_csv(path)


def load_ml_json(name: str) -> Optional[dict[str, Any]]:
    path = ML_DATA / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _ml_artifacts_ready() -> bool:
    """True when training CSVs exist under data/processed (tracked or synced from demo)."""
    return (ML_DATA / "model_comparison.csv").is_file()


@st.cache_resource(show_spinner=False)
def _ensure_ml_artifacts_cached() -> bool:
    sync_ml_from_demo()
    return _ml_artifacts_ready() or ml_bundle_present(ROOT / "data" / "demo" / "ml")


def _quant_artifacts_ready() -> bool:
    return (QUANT_DATA / "backtest_metrics.csv").is_file()


@st.cache_resource(show_spinner=False)
def _ensure_quant_artifacts_cached() -> bool:
    sync_quant_from_demo()
    return _quant_artifacts_ready() or quant_bundle_present(ROOT / "data" / "demo" / "quant")


def load_quant_json(name: str) -> Optional[dict[str, Any]]:
    path = QUANT_DATA / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


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


def render_health_trends_charts(
    epi: pd.DataFrame,
    trials: Optional[pd.DataFrame],
    *,
    disease_id: str = "scd",
) -> None:
    """Prevalence placeholder vs trial counts from ClinicalTrials.gov sample."""
    spec = get_disease(disease_id)
    epi_df = epi.copy()
    epi_df["date"] = pd.to_datetime(epi_df["date"])
    prev_col = spec.prevalence_column

    if prev_col not in epi_df.columns:
        st.error(f"Epidemiology CSV missing `{prev_col}`. Re-run collectors or seed demo bundle.")
        return

    fig_prev = go.Figure()
    fig_prev.add_trace(
        go.Scatter(
            x=epi_df["date"],
            y=epi_df[prev_col],
            name=f"{spec.display_name} prevalence (illustrative)",
            mode="lines+markers",
            line=dict(width=2),
            marker=dict(size=4),
        )
    )
    fig_prev.update_layout(
        title=f"{spec.display_name} — illustrative U.S. burden (not a live agency extract)",
        xaxis_title="Date",
        yaxis_title="Estimated prevalence (illustrative)",
        height=360,
        margin=dict(t=50, b=40),
        yaxis=dict(tickformat=",.0f"),
    )
    st.plotly_chart(apply_plotly_theme(fig_prev), use_container_width=True)

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
        st.plotly_chart(apply_plotly_theme(fig_trials), use_container_width=True)
        st.caption(
            f"Counts {len(trials)} studies returned by the collector query—not total global trial volume."
        )
    elif "clinical_trials_active" in epi_df.columns:
        st.caption("No dated trials in sample; showing illustrative active-trial series from epidemiology CSV.")
        fig_placeholder = go.Figure()
        fig_placeholder.add_trace(
            go.Scatter(
                x=epi_df["date"],
                y=epi_df["clinical_trials_active"],
                name="Active trials (illustrative)",
                mode="lines+markers",
                line=dict(width=2),
            )
        )
        fig_placeholder.update_layout(
            title="Active trials — illustrative placeholder (not ClinicalTrials.gov)",
            xaxis_title="Date",
            yaxis_title="Count (illustrative)",
            height=360,
            margin=dict(t=50, b=40),
        )
        st.plotly_chart(apply_plotly_theme(fig_placeholder), use_container_width=True)
    else:
        st.info("Run `collect_all_data.py` to load ClinicalTrials.gov rows for the trials chart.")


def page_artifacts(page: str, disease_id: str) -> list[str]:
    spec = get_disease(disease_id)
    if page == "Overview":
        return [spec.pipeline_artifact, spec.fda_artifact]
    if page == "Health Trends":
        return [spec.epidemiology_artifact, spec.trials_artifact]
    return PAGE_ARTIFACTS.get(page, [])


def _ontology_display_cols(df: pd.DataFrame) -> list[str]:
    keys = [
        "condition_mesh_id",
        "condition_snomed_id",
        "condition_icd10_code",
        "indication_disambiguation",
        "moa_mesh_id",
        "indication_mesh_id",
    ]
    return [c for c in keys if c in df.columns]


def render_page_provenance(
    page: str,
    manifest: Optional[dict[str, Any]],
    *,
    disease_id: str = "scd",
) -> None:
    """Every page: sourced vs illustrative, manifest timestamps, and per-pull audit fields."""
    files = page_artifacts(page, disease_id) or PAGE_ARTIFACTS.get(page, [])
    with st.expander("**Data provenance** — pull URL · query · UTC · schema · ontology", expanded=False):
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
            if page == "ML Models":
                artifact_dir, label = ML_DATA, "ML training CSVs under `data/processed/`"
            elif page in ("Quant Strategy", "Portfolio Optimization"):
                artifact_dir, label = QUANT_DATA, "Quant outputs under `data/processed/quant/`"
            else:
                artifact_dir, label = None, ""

            if artifact_dir is not None:
                names = (
                    [
                        "regression_training.csv",
                        "trial_success_training.csv",
                        "model_comparison.csv",
                        "model_metrics.json",
                    ]
                    if page == "ML Models"
                    else [
                        "backtest_metrics.csv",
                        "factor_model_betas.csv",
                        "monte_carlo_fan.csv",
                        "efficient_frontier.csv",
                        "portfolio_weights.csv",
                        "quant_metrics.json",
                    ]
                )
                rows_custom = [
                    {
                        "File": name,
                        "Sourced vs illustrative": "Sourced (public, delayed vendor)" if "factor" not in name else "Illustrative (demo model)",
                        "Last updated (UTC)": "—",
                        "Summary": "Precomputed quant artifact for dashboard demo.",
                    }
                    for name in names
                    if (artifact_dir / name).is_file()
                ]
                if rows_custom:
                    st.caption(label)
                    st.dataframe(pd.DataFrame(rows_custom), use_container_width=True, hide_index=True)
                else:
                    st.caption(
                        f"No files for this page. Run "
                        f"`python3 scripts/train_{'models' if page == 'ML Models' else 'quant'}.py`."
                    )
            else:
                st.caption(
                    "This page is **Roadmap** / placeholder only — no registered CSVs. "
                    "Nothing to list in the manifest table."
                )
            return
        arts = manifest.get("artifacts", {})
        pulls = manifest.get("latest_pulls", {})
        rows: list[dict[str, str]] = []
        for fname in files:
            a = arts.get(fname, {})
            kind = a.get("kind", "")
            present = a.get("present", False)
            lm = a.get("last_modified_utc", "—") if present else "— (file not on disk)"
            pull = pulls.get(fname, {})
            rows.append(
                {
                    "File": fname,
                    "Kind": kind_display_label(kind) if kind else "—",
                    "File mtime (UTC)": lm,
                    "Pull (UTC)": pull.get("pulled_at_utc", "—"),
                    "Source URL": (pull.get("source_url") or "—")[:80],
                    "Query": (pull.get("query_string") or "—")[:60],
                    "Parser": pull.get("parser_version", "—"),
                }
            )
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        st.caption(
            "Full pull audit: `data/raw/provenance_log.jsonl` (append-only). "
            "MeSH / SNOMED / ICD columns added on validated CSV write."
        )


st.set_page_config(
    page_title="Sickle Cell Investment Analysis",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)

apply_glass_theme()
glass_hero(
    "🧬 Immunology Investment Intelligence",
    "Rare immunology indications with disproportionate burden among Black women — SCD · SLE · sarcoidosis",
)

st.markdown(
    """
<div class='glass-disclaimer'>
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
st.sidebar.header("Indication")
_disease_labels = {d.disease_id: d.display_name for d in list_diseases()}
disease_id = st.sidebar.selectbox(
    "Focus disease",
    options=list(_disease_labels.keys()),
    format_func=lambda k: _disease_labels[k],
    index=0,
)
_spec = get_disease(disease_id)
st.sidebar.caption(_spec.disparity_note)
st.sidebar.header("Navigation")
st.sidebar.caption("**Epidemiology** · **Pipeline** · **Portfolio** analytics zones")
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
_ZONE_FOR_PAGE = {
    "Overview": ("pipeline", "Gene therapy & FDA pipeline"),
    "Health Trends": ("epidemiology", "Burden, trials, ontology-anchored conditions"),
    "Stock Analysis": ("portfolio", "Equity & fundamentals"),
    "Quant Strategy": ("portfolio", "Factor & backtest analytics"),
    "Portfolio Optimization": ("portfolio", "Efficient frontier & weights"),
    "Investment Stages": ("portfolio", "Private-market stages"),
    "Market Analysis": ("pipeline", "Market sizing & competitive landscape"),
    "ML Models": ("pipeline", "Trial-success & return models"),
}
if page in _ZONE_FOR_PAGE:
    z, label = _ZONE_FOR_PAGE[page]
    zone_banner(z, label)

if not data_is_present(DATA):
    with st.spinner("Loading demo datasets (tables and charts)…"):
        try:
            _bootstrap_data_cached()
            st.rerun()
        except Exception as exc:
            st.error(
                f"Could not load data: {exc}. "
                "From the project root run `python3 src/data_collection/collect_all_data.py`."
            )

_manifest = load_manifest()
render_page_provenance(page, _manifest, disease_id=disease_id)

missing = not data_is_present(DATA)
if missing:
    st.warning(
        f"No CSV data under `{DATA}` yet. Use the spinner above on first load, or run collectors manually: "
        "`python3 src/data_collection/collect_all_data.py` and `python3 src/models/market_analysis.py`."
    )

if page == "Overview":
    st.subheader(f"Pipeline overview — {_spec.display_name}")
    st.caption(
        f"MeSH {_spec.mesh_id} · SNOMED {_spec.snomed_id} · ICD-10 {_spec.icd10_code}. "
        "Pipeline and POS values are **illustrative / demo**—not clinical or investment recommendations."
    )
    pipeline = load_csv(_spec.pipeline_artifact)
    fda = load_csv(_spec.fda_artifact)
    if pipeline is not None:
        pipeline = enrich_artifact(_spec.pipeline_artifact, pipeline)
        onto = _ontology_display_cols(pipeline)
        if onto:
            st.markdown("**Ontology anchors (MeSH / ICD)**")
            st.dataframe(pipeline[onto].drop_duplicates(), use_container_width=True, hide_index=True)
        st.dataframe(pipeline, use_container_width=True)
        color_col = "technology" if "technology" in pipeline.columns else "clinical_phase"
        fig = px.bar(
            pipeline,
            x="company",
            y="probability_of_success",
            color=color_col,
            title=f"Illustrative POS by company — {_spec.code} (demo)",
        )
        st.plotly_chart(apply_plotly_theme(fig), use_container_width=True)
    else:
        st.info("Run `python3 scripts/build_disease_demo_bundle.py` or collectors to populate pipeline tables.")
    if fda is not None:
        st.subheader("Approved / reference therapies (illustrative)")
        st.dataframe(enrich_artifact(_spec.fda_artifact, fda), use_container_width=True, hide_index=True)

elif page == "Health Trends":
    st.subheader(f"Epidemiology & clinical development — {_spec.display_name}")
    st.info(
        f"**Health equity context:** {_spec.disparity_note} "
        "**Data note:** burden series are illustrative placeholders until wired to cited primary sources."
    )
    epi = load_csv(_spec.epidemiology_artifact)
    trials = load_csv(_spec.trials_artifact)

    if epi is None and (trials is None or trials.empty):
        st.warning(
            "No health data files for this indication. Run:\n"
            "`python3 scripts/build_disease_demo_bundle.py` and refresh, or "
            "`python3 src/data_collection/collect_all_data.py`"
        )
    elif epi is not None:
        render_health_trends_charts(epi, trials, disease_id=disease_id)
    else:
        st.info(f"Missing `{_spec.epidemiology_artifact}` for trend charts.")

    if trials is not None and not trials.empty:
        trials = enrich_artifact(_spec.trials_artifact, trials)
        st.subheader("Clinical trials (sourced when API responds)")
        st.caption(
            f"ClinicalTrials.gov · query: `{_spec.clinical_trials_query}` · "
            f"MeSH {_spec.mesh_id} · SNOMED {_spec.snomed_id} · ICD-10 {_spec.icd10_code}"
        )
        display_trials = trials.copy()
        if "start_date" in display_trials.columns:
            display_trials["start_date"] = pd.to_datetime(
                display_trials["start_date"], errors="coerce"
            )
        onto = _ontology_display_cols(display_trials)
        if onto:
            st.markdown("**Indication disambiguation**")
            st.dataframe(
                display_trials[["nct_id", "title"] + onto].head(20),
                use_container_width=True,
                hide_index=True,
            )
        st.dataframe(display_trials.head(20), use_container_width=True, hide_index=True)
    elif trials is not None:
        st.info("Clinical trials file exists but has no rows. Re-run collectors with network access.")

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
    st.caption(
        "**Demo / non-advisory:** Regression uses illustrative health + delayed stock features; "
        "trial-success classifiers train on **synthetic** multi-disease rows—not clinical predictions."
    )
    if not _ensure_ml_artifacts_cached():
        st.warning(
            "No fitted models found. From the project root run `python3 scripts/train_models.py` "
            "(requires `data/raw` or `data/demo` CSVs)."
        )
    else:
        metrics = load_ml_json("model_metrics.json")
        comparison = load_csv("model_comparison.csv", ML_DATA)
        reg_train = load_csv("regression_training.csv", ML_DATA)
        trial_train = load_csv("trial_success_training.csv", ML_DATA)

        if metrics:
            st.markdown(f"**Last trained (UTC):** `{metrics.get('trained_at_utc', '—')}`")

        if comparison is not None:
            st.markdown("**Regression model comparison** (target: next-period stock return)")
            st.dataframe(comparison, use_container_width=True, hide_index=True)
            fig_cmp = px.bar(
                comparison,
                x="model",
                y="R2",
                title="Out-of-sample R² (demo — not investment signal)",
                text="R2",
            )
            fig_cmp.update_traces(texttemplate="%{text:.3f}", textposition="outside")
            st.plotly_chart(apply_plotly_theme(fig_cmp), use_container_width=True)

        col_a, col_b = st.columns(2)
        with col_a:
            if reg_train is not None:
                st.markdown("**Regression training matrix** (sample)")
                st.dataframe(reg_train.head(12), use_container_width=True, hide_index=True)
        with col_b:
            if trial_train is not None:
                st.markdown("**Trial-success training matrix** (sample)")
                show_cols = [
                    c
                    for c in ["phase", "enrollment_log", "duration_months", "disease", "success"]
                    if c in trial_train.columns
                ]
                st.dataframe(
                    trial_train[show_cols].head(12), use_container_width=True, hide_index=True
                )

        if metrics and metrics.get("trial_success_cv_auc"):
            st.markdown("**Trial-success CV AUC (synthetic training)**")
            auc_rows = [
                {"model": k, "auc_mean": round(v.get("auc_mean", 0), 3)}
                for k, v in metrics["trial_success_cv_auc"].items()
            ]
            st.dataframe(pd.DataFrame(auc_rows), use_container_width=True, hide_index=True)

        st.markdown("**Interactive trial-success demo**")
        phase = st.slider("Phase", 1, 3, 2)
        enrollment = st.number_input("Enrollment", 50, 3000, 200, step=50)
        sponsor = st.selectbox("Sponsor type", ["biotech", "pharma", "academic"])
        mechanism = st.selectbox(
            "Mechanism",
            ["Gene Editing", "Monoclonal Antibody", "Small Molecule", "Novel Mechanism"],
        )
        if st.button("Run ensemble prediction"):
            from src.models.trial_success_predictor import TrialSuccessPredictor

            pred = TrialSuccessPredictor()
            pred.train(verbose=False)
            out = pred.predict(
                phase=phase,
                enrollment=enrollment,
                sponsor=sponsor,
                mechanism=mechanism,
                duration_months=36,
                disease_name="Sickle Cell Disease",
            )
            st.metric("Success probability (demo)", f"{out['probability']:.1%}")
            st.json(out)

elif page == "Quant Strategy":
    st.subheader("Quant strategy")
    st.caption(
        "**Demo / non-advisory:** Backtests and factor regressions use **delayed vendor** stock CSVs "
        "from `data/raw/` — not live trading signals."
    )
    if not _ensure_quant_artifacts_cached():
        st.warning("No quant outputs found. Run `python3 scripts/train_quant.py` from the project root.")
    else:
        qmeta = load_quant_json("quant_metrics.json")
        if qmeta:
            st.markdown(f"**Built (UTC):** `{qmeta.get('trained_at_utc', '—')}` · tickers: `{', '.join(qmeta.get('tickers', []))}`")

        backtest = load_csv("backtest_metrics.csv", QUANT_DATA)
        if backtest is not None:
            st.markdown("**Strategy backtest summary** (equal weight vs health-tilt demo)")
            st.dataframe(backtest, use_container_width=True, hide_index=True)

        factors = load_csv("factor_model_betas.csv", QUANT_DATA)
        if factors is not None and not factors.empty:
            st.markdown("**Factor model** (monthly returns ~ IBB + XBI−IBB spread)")
            st.dataframe(factors, use_container_width=True, hide_index=True)
            fig_f = px.bar(
                factors,
                x="ticker",
                y="beta_ibb",
                title="IBB beta by ticker (demo)",
                color="r_squared",
            )
            st.plotly_chart(apply_plotly_theme(fig_f), use_container_width=True)

        mc = load_csv("monte_carlo_fan.csv", QUANT_DATA)
        if mc is not None:
            st.markdown("**Monte Carlo fan** (1-year, equal-weight return distribution)")
            fig_mc = go.Figure()
            fig_mc.add_trace(go.Scatter(x=mc["day"], y=mc["p95"], name="95th %ile", line=dict(dash="dot")))
            fig_mc.add_trace(go.Scatter(x=mc["day"], y=mc["p50"], name="Median"))
            fig_mc.add_trace(go.Scatter(x=mc["day"], y=mc["p05"], name="5th %ile", line=dict(dash="dot")))
            fig_mc.update_layout(
                title="Simulated cumulative return paths (demo)",
                xaxis_title="Trading day",
                yaxis_title="Growth of $1",
                height=360,
            )
            st.plotly_chart(apply_plotly_theme(fig_mc), use_container_width=True)

elif page == "Portfolio Optimization":
    st.subheader("Portfolio optimization")
    st.caption(
        "**Demo / non-advisory:** Mean-variance-style random portfolios and scipy optimizers "
        "on the same delayed-vendor return sample — not allocation advice."
    )
    if not _ensure_quant_artifacts_cached():
        st.warning("No portfolio outputs found. Run `python3 scripts/train_quant.py` from the project root.")
    else:
        frontier = load_csv("efficient_frontier.csv", QUANT_DATA)
        if frontier is not None and not frontier.empty:
            st.markdown("**Efficient frontier (random long-only portfolios)**")
            fig_ef = px.scatter(
                frontier,
                x="volatility",
                y="expected_return",
                color="sharpe_ratio",
                title="Return vs volatility (color = Sharpe, demo)",
                labels={"volatility": "Annualized vol", "expected_return": "Annualized return"},
            )
            st.plotly_chart(apply_plotly_theme(fig_ef), use_container_width=True)

        weights = load_csv("portfolio_weights.csv", QUANT_DATA)
        if weights is not None and not weights.empty:
            st.markdown("**Optimized weights by strategy**")
            pivot = weights.pivot(index="ticker", columns="strategy", values="weight").fillna(0)
            st.dataframe(pivot, use_container_width=True)
            selected = st.selectbox("Strategy detail", sorted(weights["strategy"].unique()))
            st.dataframe(
                weights[weights["strategy"] == selected].sort_values("weight", ascending=False),
                use_container_width=True,
                hide_index=True,
            )

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
