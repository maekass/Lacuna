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

from dashboard.theme import (
    apply_glass_theme,
    apply_plotly_theme,
    equity_context_card,
    glass_hero,
    section_header,
    sidebar_brand,
    styled_bar_chart,
    styled_line_chart,
    zone_banner,
)
try:
    from dashboard.advanced_visualizations import (
        plot_regime_timeline,
        plot_pairs_trading_spread,
        plot_trial_funnel,
        plot_feature_importance_radar,
        plot_efficient_frontier,
        plot_drawdown_chart,
    )
    ADVANCED_VIZ_AVAILABLE = True
except ImportError:
    ADVANCED_VIZ_AVAILABLE = False
from src.data_collection.bootstrap_data import data_is_present, run_full_pipeline, seed_demo_if_missing
from src.data_collection.data_manifest import kind_display_label
from src.data_collection.seed_demo_data import sync_ml_from_demo, sync_quant_from_demo
from src.data_collection.parsers.cdc_nndss import fetch_nndss_disease_index, search_nndss_index
from src.data_collection.parsers.orphanet_search import fetch_orphanet_index, search_orphanet_index
from src.disease_registry import get_disease, list_diseases, us_tickers
from src.disease_registry.disease_metrics import fetch_disease_metrics
from src.disease_registry.equity_context import render_equity_snippets_markdown
from src.disease_registry.indication import (
    IndicationView,
    is_ad_hoc_disease_id,
    registry_disease_id,
)
from src.ontology.enrich import enrich_artifact
from src.models.ml_artifacts import ml_bundle_present
from src.quant_framework.quant_artifacts import quant_bundle_present

DATA = ROOT / "data" / "raw"
ML_DATA = ROOT / "data" / "processed"
ML_MODELS = ROOT / "data" / "models"
QUANT_DATA = ROOT / "data" / "processed" / "quant"

st.set_page_config(
    page_title="Immunology Investment Dashboard",
    page_icon=":material/analytics:",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================================================
# LEGAL DISCLAIMER - DISPLAYED ON EVERY PAGE
# ============================================================================
def show_legal_disclaimer():
    """Display comprehensive legal disclaimer banner"""
    st.markdown("""
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; 
                border-left: 5px solid #f59e0b;">
        <h3 style="color: white; margin: 0 0 1rem 0;">⚠️ Legal Disclaimer</h3>
        <p style="color: white; margin: 0; font-size: 0.95rem; line-height: 1.6;">
            <strong>FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY</strong><br><br>
            This platform is designed for academic research and learning. It is <strong>NOT</strong>:<br>
            • Investment advice or financial recommendations<br>
            • Suitable for commercial trading or real-money decisions without proper validation<br>
            • A substitute for professional financial, medical, or legal counsel<br>
            • Approved for clinical or regulatory decision-making<br><br>
            <strong>Data Compliance:</strong> All data is publicly available and delayed. No patient-level or 
            private health information (HIPAA compliant). No insider trading or material non-public information. 
            Illustrative scores and private-market figures are demo weights only. Users must verify compliance 
            with applicable securities and health-data regulations before any production or commercial use.<br><br>
            <strong>Past performance does not guarantee future results.</strong> All models and predictions are 
            illustrative and subject to error. Consult qualified professionals before making investment decisions.
        </p>
    </div>
    """, unsafe_allow_html=True)


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


@st.cache_data(ttl=86400, show_spinner="Loading Orphanet disease index (cached 24h)…")
def _orphanet_index_cached() -> list[dict[str, Any]]:
    rows, _ = fetch_orphanet_index()
    return rows


@st.cache_data(ttl=86400, show_spinner="Loading CDC NNDSS condition list (cached 24h)…")
def _cdc_nndss_index_cached() -> list[dict[str, Any]]:
    rows, _ = fetch_nndss_disease_index()
    return rows


@st.cache_data(ttl=600, show_spinner="Loading public disease metrics…")
def _disease_metrics_cached(
    preferred_term: str,
    orpha_code: int | None,
    cdc_label: str | None,
    trial_query_fallback: str | None = None,
) -> dict[str, Any]:
    return fetch_disease_metrics(
        preferred_term,
        orpha_code=orpha_code,
        cdc_label=cdc_label,
        trial_query_fallback=trial_query_fallback,
    )


def _search_disease_hits(query: str, universe: str, *, limit: int = 25) -> list[dict[str, Any]]:
    """Substring search over Orphanet and/or CDC NNDSS indices (no download until invoked)."""
    q = query.strip()
    if len(q) < 2:
        return []
    hits: list[dict[str, Any]] = []
    if universe in ("Orphanet", "Both"):
        for row in search_orphanet_index(_orphanet_index_cached(), q, limit=limit):
            hits.append(
                {
                    "source": "orphanet",
                    "label": row["preferred_term"],
                    "orpha_code": row["orpha_code"],
                    "cdc_label": None,
                }
            )
    if universe in ("CDC NNDSS", "Both"):
        for row in search_nndss_index(_cdc_nndss_index_cached(), q, limit=limit):
            hits.append(
                {
                    "source": "cdc_nndss",
                    "label": row["cdc_label"],
                    "orpha_code": None,
                    "cdc_label": row["cdc_label"],
                }
            )
    return hits[:limit]


def _prevalence_column(epi: pd.DataFrame) -> str:
    if "scd_prevalence_us" in epi.columns:
        return "scd_prevalence_us"
    if "prevalence_us" in epi.columns:
        return "prevalence_us"
    return "prevalence_us"


def render_disease_metrics_panel(metrics: dict[str, Any]) -> None:
    """Orphanet, CDC NNDSS, and trials summary for ad-hoc disease search."""
    sources = ", ".join(metrics.get("metric_sources") or []) or "—"
    st.caption(f"Metric sources: {sources}")

    c1, c2, c3, c4 = st.columns(4)
    oc = metrics.get("orpha_code")
    if oc is not None and oc != "" and oc != "—":
        c1.metric("ORPHA code", str(oc))
    else:
        c1.metric("ORPHA code", "—")
    us_rate = metrics.get("us_point_prevalence_per_100k")
    alt_prev = metrics.get("orphanet_non_us_point_prevalence") or {}
    alt_rate = alt_prev.get("val_moy_per_100k")
    prevalence_note: str | None = None
    if us_rate is not None:
        c2.metric("U.S. point prevalence", f"{float(us_rate)!s}/100k")
    elif alt_rate is not None:
        geo = alt_prev.get("geographic") or "—"
        c2.metric(
            "Orphanet point prevalence (non‑U.S.)",
            f"{float(alt_rate)!s}/100k · {geo}",
        )
        prevalence_note = (
            "No validated U.S. point estimate in Orphadata for this entity; "
            "shown value is geography-specific from Orphanet."
        )
    else:
        c2.metric("U.S. point prevalence", "—")
        if metrics.get("orpha_code"):
            prevalence_note = (
                "Orphanet returned no usable point-prevalence ValMoy for this code "
                "(common for umbrella groups). See prevalence table below."
            )

    try:
        trials_n_disp = int(metrics.get("trials_in_sample", 0))
    except (TypeError, ValueError):
        trials_n_disp = metrics.get("trials_in_sample", 0)
    try:
        trials_a_disp = int(metrics.get("trials_active_in_sample", 0))
    except (TypeError, ValueError):
        trials_a_disp = metrics.get("trials_active_in_sample", 0)
    c3.metric("Trials in sample", trials_n_disp)
    c4.metric("Active in sample", trials_a_disp)

    if prevalence_note:
        st.caption(prevalence_note)

    if metrics.get("trials_used_search_fallback_query"):
        st.caption(
            "ClinicalTrials.gov used your **sidebar search text** as a fallback condition query "
            "(the Orphanet preferred term alone returned no studies in this pull)."
        )

    nndss = metrics.get("cdc_nndss") or {}
    if nndss:
        st.markdown("**CDC NNDSS (nationally notifiable conditions, U.S. residents)**")
        n1, n2, n3 = st.columns(3)
        n1.metric("Report week", f"{nndss.get('report_year', '—')}-W{nndss.get('report_week', '—')}")
        n2.metric("Current week cases", nndss.get("current_week_cases", "—"))
        n3.metric("Cumulative (reported)", nndss.get("cumulative_cases", "—"))
        if metrics.get("cdc_profile_url"):
            st.markdown(f"[CDC NNDSS dataset view]({metrics['cdc_profile_url']})")

    icd = ", ".join(metrics.get("icd10_codes") or []) or "—"
    omim = ", ".join(metrics.get("omim_codes") or []) or "—"
    umls = ", ".join(metrics.get("umls_codes") or []) or "—"
    typology = metrics.get("typology") or "—"
    st.markdown(
        f"**Disorder group:** {metrics.get('disorder_group') or '—'}  \n"
        f"**Orphanet typology:** {typology}  \n"
        f"**ICD-10:** {icd}  \n"
        f"**OMIM:** {omim}  \n"
        f"**UMLS:** {umls}  \n"
        f"**ClinicalTrials.gov query:** `{metrics.get('clinical_trials_query', '')}`"
    )
    if metrics.get("orphanet_url"):
        st.markdown(f"[Orphanet record]({metrics['orphanet_url']})")

    prev_rows = metrics.get("prevalence_entries") or []
    if prev_rows:
        st.markdown("**Orphanet prevalence sources (sample)**")
        st.dataframe(pd.DataFrame(prev_rows), use_container_width=True, hide_index=True)

    if metrics.get("cdc_label") and not metrics.get("orpha_code"):
        st.info(
            "This condition is in the **CDC NNDSS** infectious/notifiable universe. "
            "Chronic focus diseases (SCD, lupus, sarcoidosis) are not NNDSS-listed — use **Orphanet** or **Focus indications**."
        )


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
    display_name: str | None = None,
) -> None:
    """Prevalence placeholder vs trial counts from ClinicalTrials.gov sample."""
    label = display_name or get_disease(registry_disease_id(disease_id)).display_name
    epi_df = epi.copy()
    epi_df["date"] = pd.to_datetime(epi_df["date"])
    prev_col = _prevalence_column(epi_df)

    if prev_col not in epi_df.columns:
        st.error(f"Epidemiology CSV missing `{prev_col}`. Re-run collectors or seed demo bundle.")
        return

    fig_prev = go.Figure()
    fig_prev.add_trace(
        go.Scatter(
            x=epi_df["date"],
            y=epi_df[prev_col],
            name="Prevalence (U.S. estimate)",
            mode="lines+markers",
            line=dict(width=2),
            marker=dict(size=4),
        )
    )
    fig_prev.update_layout(
        title=f"{label} — U.S. prevalence estimate (Orphanet rate × Census population)",
        xaxis_title="Date",
        yaxis_title="Estimated prevalence (persons)",
        height=360,
        margin=dict(t=50, b=40),
        yaxis=dict(tickformat=",.0f"),
    )
    st.plotly_chart(styled_line_chart(fig_prev), use_container_width=True)

    # --- Chart 2: trials from ClinicalTrials.gov sample when available ---
    by_year = _trials_by_start_year(trials) if trials is not None and not trials.empty else pd.DataFrame()

    if not by_year.empty:
        fig_trials = go.Figure()
        fig_trials.add_trace(
            go.Bar(
                x=by_year["year"],
                y=by_year["trial_count"],
                name="Trials in sample",
                marker_color="#818cf8",
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
        st.plotly_chart(styled_bar_chart(fig_trials), use_container_width=True)
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
        st.plotly_chart(styled_line_chart(fig_placeholder), use_container_width=True)
    else:
        st.info("Run `collect_all_data.py` to load ClinicalTrials.gov rows for the trials chart.")


def page_artifacts(page: str, disease_id: str) -> list[str]:
    if is_ad_hoc_disease_id(disease_id):
        return []
    spec = get_disease(registry_disease_id(disease_id))
    if page == "Overview":
        return [spec.pipeline_artifact, spec.fda_artifact]
    if page == "Health Trends":
        return [spec.epidemiology_artifact, spec.trials_artifact]
    if page == "Stock Analysis":
        return ["stock_prices_companies.csv", "stock_prices_etfs.csv", "company_financials.csv"]
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


def _pull_has_audit(pull: dict[str, Any]) -> bool:
    return bool(pull.get("source_url") or pull.get("pulled_at_utc") or pull.get("parser_version"))


def render_sidebar_provenance(
    page: str,
    manifest: Optional[dict[str, Any]],
    *,
    disease_id: str = "scd",
) -> None:
    """Compact source summary in the sidebar; API pull audit only when logged."""
    files = page_artifacts(page, disease_id) or PAGE_ARTIFACTS.get(page, [])
    with st.sidebar.expander("Data sources", expanded=False):
        if manifest is None:
            st.caption(
                "No manifest on disk. Bundled demo CSVs load without API pull metadata. "
                "Run `python3 src/data_collection/collect_all_data.py` to refresh with provenance."
            )
            return

        if not files:
            if page == "ML Models":
                artifact_dir = ML_DATA
                names = [
                    "regression_training.csv",
                    "trial_success_training.csv",
                    "model_comparison.csv",
                ]
            elif page in ("Quant Strategy", "Portfolio Optimization"):
                artifact_dir = QUANT_DATA
                names = [
                    "backtest_metrics.csv",
                    "walk_forward_oos_curve.csv",
                    "walk_forward_compounded_summary.csv",
                    "factor_model_betas.csv",
                    "efficient_frontier.csv",
                    "portfolio_weights.csv",
                ]
            else:
                st.caption("No registered CSVs for this view.")
                return
            rows_custom = [
                {
                    "File": name,
                    "Kind": "Demo / precomputed",
                    "About": "Precomputed artifact for dashboard demo.",
                }
                for name in names
                if (artifact_dir / name).is_file()
            ]
            if rows_custom:
                st.dataframe(pd.DataFrame(rows_custom), use_container_width=True, hide_index=True)
            else:
                st.caption(
                    f"Run `python3 scripts/train_{'models' if page == 'ML Models' else 'quant'}.py`."
                )
            return

        arts = manifest.get("artifacts", {})
        pulls = manifest.get("latest_pulls", {})
        rows: list[dict[str, str]] = []
        audit_rows: list[dict[str, str]] = []
        for fname in files:
            a = arts.get(fname, {})
            kind = a.get("kind", "")
            present = a.get("present", False)
            lm = a.get("last_modified_utc", "—") if present else "—"
            summary = (a.get("source_summary") or "—").strip()
            pull = pulls.get(fname, {})
            rows.append(
                {
                    "File": fname,
                    "Kind": kind_display_label(kind) if kind else "—",
                    "Updated": lm,
                    "About": summary[:120] + ("…" if len(summary) > 120 else ""),
                }
            )
            if _pull_has_audit(pull):
                audit_rows.append(
                    {
                        "File": fname,
                        "Pulled (UTC)": pull.get("pulled_at_utc", "—"),
                        "Source": (pull.get("source_url") or "—")[:72],
                        "Parser": pull.get("parser_version", "—") or "—",
                    }
                )

        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        if audit_rows:
            st.caption("Latest API pull (from provenance log)")
            st.dataframe(pd.DataFrame(audit_rows), use_container_width=True, hide_index=True)
        else:
            st.caption(
                "Bundled or locally copied data — no API pull logged yet. "
                "Re-run collectors with network access to populate `provenance_log.jsonl`."
            )


apply_glass_theme()

# Display legal disclaimer on every page
show_legal_disclaimer()

glass_hero(
    "Immunology Investment Intelligence",
    "Quantitative analysis across sickle cell disease, systemic lupus erythematosus, and sarcoidosis. "
    "Epidemiology, development pipeline, and portfolio views with documented data provenance.",
)

st.markdown(
    """
<div class='glass-disclaimer'>
    <strong>Notice (non-advisory):</strong> Educational and research use only.
    <strong>Not investment advice, not medical advice.</strong> Public and delayed sources only; no patient-level data in this app.
    <br/><br/>
    <strong>Demo / illustrative only:</strong> Any attractiveness scores, “Strong Buy / Hold / Sell” labels, TAM blocks,
    VC tables, and similar outputs are <strong>software demo weights</strong>—not ratings, forecasts, or recommendations.
    <br/><br/>
    <strong>Population &amp; burden charts:</strong> Epidemiology CSVs combine <strong>Orphanet</strong> U.S. prevalence rates
    (CC BY 4.0) with <strong>CDC-cited</strong> sickle cell birth anchors where noted; trial activity reflects the
    ClinicalTrials.gov sample in this repo—not total global volume.
    <br/><br/>
    <strong>Health equity:</strong> Keep population-health statistics analytically separate from market framing; do not treat communities as a trade thesis.
</div>
""",
    unsafe_allow_html=True,
)

sidebar_brand()
st.sidebar.markdown(
    '<p style="font-size:0.8rem;color:#5C6B73;margin:0 0 1rem;">Demonstration data. Not investment or medical advice.</p>',
    unsafe_allow_html=True,
)
st.sidebar.header("Indication")
_indication_mode = st.sidebar.radio(
    "Source",
    ["Focus indications", "Search any disease"],
    horizontal=True,
)
_disease_labels = {d.disease_id: d.display_name for d in list_diseases()}
disease_id = "scd"
_ctx: IndicationView = IndicationView.from_registry("scd")

if _indication_mode == "Focus indications":
    disease_id = st.sidebar.selectbox(
        "Focus disease",
        options=list(_disease_labels.keys()),
        format_func=lambda k: _disease_labels[k],
        index=0,
    )
    _ctx = IndicationView.from_registry(disease_id)
else:
    _universe = st.sidebar.radio(
        "Universe",
        ["Both", "Orphanet", "CDC NNDSS"],
        horizontal=True,
        help="CDC NNDSS: nationally notifiable infectious conditions on data.cdc.gov (~130 labels).",
    )
    _search_q = st.sidebar.text_input(
        "Search disease name",
        placeholder="e.g. hepatitis, tuberculosis, lupus, sickle cell",
    )
    _hits = _search_disease_hits(_search_q, _universe, limit=30) if _search_q.strip() else []
    if _hits:

        def _hit_label(i: int) -> str:
            h = _hits[i]
            if h["source"] == "cdc_nndss":
                return f"[CDC] {h['label']}"
            return f"[Orphanet] {h['label']} (ORPHA{h['orpha_code']})"

        _pick_i = st.sidebar.selectbox("Match", options=list(range(len(_hits))), format_func=_hit_label)
        _row = _hits[_pick_i]
        _metrics = _disease_metrics_cached(
            _row["label"],
            _row.get("orpha_code"),
            _row.get("cdc_label"),
            _search_q.strip() if _search_q.strip() else None,
        )
        _ctx = IndicationView.from_metrics(_metrics)
        disease_id = _ctx.disease_id
    elif _search_q.strip():
        st.sidebar.warning("No matches in this universe. Try **Both** or a different term.")
        _ctx = IndicationView.from_registry("scd")
        disease_id = "scd"
    else:
        st.sidebar.caption(
            "Search Orphanet rare diseases (~11k) and/or CDC NNDSS notifiable conditions (data.cdc.gov)."
        )
        _ctx = IndicationView.from_registry("scd")
        disease_id = "scd"

st.sidebar.caption(_ctx.disparity_note)
st.sidebar.header("Navigation")
st.sidebar.caption("Epidemiology · Pipeline · Portfolio")
page = st.sidebar.radio(
    "Select Page",
    [
        "Disease Lookup",
        "Overview",
        "Health Trends",
        "Stock Analysis",
        "ML Models",
        "Quant Strategy",
        "Portfolio Optimization",
        "Pairs Trading",
        "Regime Detection",
        "Investment Stages",
        "Market Analysis",
    ],
)
_ZONE_FOR_PAGE = {
    "Disease Lookup": ("epidemiology", "Orphanet search · public metrics"),
    "Overview": ("pipeline", "Gene therapy & FDA pipeline"),
    "Health Trends": ("epidemiology", "Burden, trials, ontology-anchored conditions"),
    "Stock Analysis": ("portfolio", "Equity & fundamentals"),
    "ML Models": ("pipeline", "Trial-success & return models"),
    "Quant Strategy": ("portfolio", "Factor & backtest analytics"),
    "Portfolio Optimization": ("portfolio", "Efficient frontier & weights"),
    "Pairs Trading": ("portfolio", "Statistical arbitrage & cointegration"),
    "Regime Detection": ("portfolio", "HMM market state identification"),
    "Investment Stages": ("portfolio", "Private-market stages"),
    "Market Analysis": ("pipeline", "Market sizing & competitive landscape"),
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
render_sidebar_provenance(page, _manifest, disease_id=disease_id)

missing = not data_is_present(DATA)
if missing:
    st.warning(
        f"No CSV data under `{DATA}` yet. Use the spinner above on first load, or run collectors manually: "
        "`python3 src/data_collection/collect_all_data.py` and `python3 src/models/market_analysis.py`."
    )

if page == "Disease Lookup":
    section_header(
        "Disease lookup",
        "Search Orphanet and CDC NNDSS universes; pull epidemiology, surveillance, and trial samples",
    )
    if _indication_mode != "Search any disease":
        st.info("Set sidebar **Source** to **Search any disease**, then choose an Orphanet match.")
    elif _ctx.is_registry or not _ctx.metrics:
        st.info("Enter a disease name in the sidebar and select a match (Orphanet and/or CDC NNDSS).")
    else:
        render_disease_metrics_panel(_ctx.metrics)
        epi_live = _ctx.metrics.get("epidemiology_df")
        trials_live = _ctx.metrics.get("trials_df")
        if epi_live is not None and not epi_live.empty:
            section_header("Burden trend (estimated)", "Orphanet U.S. rate × population — illustrative annual points")
            render_health_trends_charts(
                epi_live, trials_live, disease_id=disease_id, display_name=_ctx.display_name
            )
        elif trials_live is not None and not trials_live.empty:
            st.markdown("**Clinical trials (live sample)**")
            st.dataframe(trials_live.head(25), use_container_width=True, hide_index=True)
        st.caption(
            "Live public APIs (Orphanet, CDC data.cdc.gov NNDSS, ClinicalTrials.gov). No bundled pipeline, equity, or FDA tables "
            "for ad-hoc diseases — use **Focus indications** for full demo datasets."
        )

elif page == "Overview":
    if not _ctx.is_registry:
        st.info(
            f"**{_ctx.display_name}** is not in the focus registry. Open **Disease Lookup** for live metrics, "
            "or switch sidebar **Source** to **Focus indications** for pipeline/FDA demo CSVs."
        )
    section_header(
        f"Pipeline — {_ctx.display_name}",
        f"MeSH {_ctx.mesh_id} · SNOMED {_ctx.snomed_id} · ICD-10 {_ctx.icd10_code}",
    )
    pipeline = load_csv(_ctx.pipeline_artifact) if _ctx.is_registry else None
    fda = load_csv(_ctx.fda_artifact) if _ctx.is_registry else None
    if pipeline is not None:
        pipeline = enrich_artifact(_ctx.pipeline_artifact, pipeline)
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
            title=f"Illustrative POS by company — {_ctx.display_name} (demo)",
        )
        st.plotly_chart(styled_bar_chart(fig), use_container_width=True)
    else:
        st.info("Run `python3 scripts/build_disease_demo_bundle.py` or collectors to populate pipeline tables.")
    if fda is not None:
        section_header(
            "Approved therapies",
            "openFDA drug labels + drugsfda first approval when brand matches (see collectors with network)",
        )
        st.dataframe(enrich_artifact(_ctx.fda_artifact, fda), use_container_width=True, hide_index=True)

elif page == "Health Trends":
    section_header(
        f"Epidemiology — {_ctx.display_name}",
        "Burden, trial activity, and ontology-anchored clinical development data",
    )
    equity_context_card(
        f"{_ctx.disparity_note} Burden series use Orphanet U.S. point-prevalence rates (CC BY 4.0) "
        "and CDC-cited SCD birth metrics where applicable; see provenance for pull details."
    )
    if _ctx.is_registry:
        eq_md = render_equity_snippets_markdown(registry_disease_id(disease_id))
        if eq_md:
            with st.expander("Stratified / citation context (CDC & NIH entry points)", expanded=False):
                st.markdown(eq_md)
        epi = load_csv(_ctx.epidemiology_artifact)
        trials = load_csv(_ctx.trials_artifact)
    else:
        epi = _ctx.metrics.get("epidemiology_df") if _ctx.metrics else None
        trials = _ctx.metrics.get("trials_df") if _ctx.metrics else None

    if epi is None and (trials is None or trials.empty):
        st.warning(
            "No health data files for this indication. Run:\n"
            "`python3 scripts/build_disease_demo_bundle.py` and refresh, or "
            "`python3 src/data_collection/collect_all_data.py`"
        )
    elif epi is not None:
        render_health_trends_charts(epi, trials, disease_id=disease_id, display_name=_ctx.display_name)
    else:
        if _ctx.is_registry:
            st.info(f"Missing `{_ctx.epidemiology_artifact}` for trend charts.")
        else:
            st.info("Search a disease in the sidebar (Orphanet) to load live burden and trial metrics.")

    if trials is not None and not trials.empty:
        if _ctx.is_registry:
            trials = enrich_artifact(_ctx.trials_artifact, trials)
        section_header(
            "Clinical trials",
            f"ClinicalTrials.gov · `{_ctx.clinical_trials_query}`"
            + (f" · MeSH {_ctx.mesh_id}" if _ctx.mesh_id != "—" else ""),
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
    section_header(
        f"Equity — {_ctx.display_name}",
        "Registry ticker universe · delayed Yahoo Finance / yfinance",
    )
    if not _ctx.is_registry:
        st.info("Equity tables are wired for **Focus indications** registry tickers only.")
    fin = load_csv("company_financials.csv")
    prices = load_csv("stock_prices_companies.csv")
    tickers = us_tickers(_ctx.companies)
    if fin is not None:
        if "disease_id" in fin.columns:
            fin = fin[fin["disease_id"] == registry_disease_id(disease_id)]
        elif "ticker" in fin.columns:
            fin = fin[fin["ticker"].isin(tickers.values())]
        st.dataframe(fin, use_container_width=True, hide_index=True)
    if prices is not None and tickers:
        try:
            px = prices.copy()
            if hasattr(px.columns, "levels") and px.columns.nlevels > 1:
                avail = [t for t in tickers.values() if t in px.columns.get_level_values(0)]
                if avail:
                    close = px[avail]["Close"] if "Close" in px[avail].columns.names else px[avail]
                    st.markdown("**Price history (close)** — selected tickers")
                    st.line_chart(close)
        except Exception:
            st.caption("Price chart unavailable for current CSV shape; table above lists fundamentals.")
    if fin is None and prices is None:
        st.info("Run `python3 src/data_collection/collect_all_data.py` to load equity data.")

elif page == "ML Models":
    section_header("Machine learning", "Demo models on illustrative features — not clinical or investment signals")
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
            st.plotly_chart(styled_bar_chart(fig_cmp), use_container_width=True)

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
    section_header("Quant strategy", "Backtests and factor models on delayed-vendor return samples")
    if not _ensure_quant_artifacts_cached():
        st.warning("No quant outputs found. Run `python3 scripts/train_quant.py` from the project root.")
    else:
        qmeta = load_quant_json("quant_metrics.json")
        if qmeta:
            st.markdown(f"**Built (UTC):** `{qmeta.get('trained_at_utc', '—')}` · tickers: `{', '.join(qmeta.get('tickers', []))}`")

        backtest = load_csv("backtest_metrics.csv", QUANT_DATA)
        if backtest is not None:
            st.markdown("**In-sample backtest** (full history — equal weight vs health-tilt demo)")
            st.dataframe(backtest, use_container_width=True, hide_index=True)

        wf_compound = load_csv("walk_forward_compounded_summary.csv", QUANT_DATA)
        wf_summary = load_csv("walk_forward_summary.csv", QUANT_DATA)
        wf_curve = load_csv("walk_forward_oos_curve.csv", QUANT_DATA)
        wf_folds = load_csv("walk_forward_folds.csv", QUANT_DATA)

        def _filter_wf(df: Optional[pd.DataFrame]) -> Optional[pd.DataFrame]:
            if df is None or df.empty:
                return df
            if "disease_id" not in df.columns:
                return df
            reg_id = registry_disease_id(disease_id)
            scoped = df[df["disease_id"] == reg_id]
            if scoped.empty and reg_id != "all":
                scoped = df[df["disease_id"] == "all"]
            return scoped

        wf_compound = _filter_wf(wf_compound)
        wf_summary = _filter_wf(wf_summary)
        wf_curve = _filter_wf(wf_curve)
        wf_folds = _filter_wf(wf_folds)

        if wf_compound is not None and not wf_compound.empty:
            st.markdown(
                f"**Walk-forward OOS — {_ctx.display_name}** "
                "(24m train · 6m test · chained test windows)"
            )
            st.dataframe(wf_compound, use_container_width=True, hide_index=True)

        if wf_curve is not None and not wf_curve.empty:
            curve = wf_curve.copy()
            curve["date"] = pd.to_datetime(curve["date"])
            fig_oos = go.Figure()
            for strat in curve["strategy"].unique():
                sub = curve[curve["strategy"] == strat].sort_values("date")
                fig_oos.add_trace(
                    go.Scatter(
                        x=sub["date"],
                        y=sub["cumulative_return"],
                        name=strat,
                        mode="lines",
                    )
                )
            fig_oos.update_layout(
                title="Compounded out-of-sample equity (growth of $1)",
                xaxis_title="Date",
                yaxis_title="Cumulative return",
                height=380,
                legend=dict(orientation="h", yanchor="bottom", y=1.02),
            )
            st.plotly_chart(styled_line_chart(fig_oos), use_container_width=True)

        if wf_summary is not None and not wf_summary.empty:
            with st.expander("Fold-average test metrics (per window)", expanded=False):
                st.dataframe(wf_summary, use_container_width=True, hide_index=True)
            if wf_folds is not None and not wf_folds.empty:
                st.dataframe(wf_folds, use_container_width=True, hide_index=True)
            st.caption(
                "Chart uses chained OOS test returns only. Fold table averages separate test windows."
            )

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
            st.plotly_chart(styled_bar_chart(fig_f), use_container_width=True)

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
            st.plotly_chart(styled_line_chart(fig_mc), use_container_width=True)

elif page == "Portfolio Optimization":
    section_header("Portfolio optimization", "Mean-variance-style demos — not allocation advice")
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

elif page == "Pairs Trading":
    section_header("Pairs Trading", "Statistical arbitrage via cointegration analysis")
    
    if not ADVANCED_VIZ_AVAILABLE:
        st.warning("Advanced visualizations module not available. Ensure `dashboard/advanced_visualizations.py` is present.")
    else:
        st.markdown("""
        **Statistical arbitrage** identifies cointegrated stock pairs that exhibit mean-reverting behavior.
        This page demonstrates the Engle-Granger cointegration test and z-score trading signals.
        """)
        
        st.info("**Demo:** Run `python src/quant_framework/pairs_trading.py` to generate pairs data.")
        
        # Check if pairs data exists
        pairs_data = load_csv("cointegrated_pairs.csv", QUANT_DATA)
        
        if pairs_data is not None and not pairs_data.empty:
            st.subheader("Cointegrated Pairs")
            st.dataframe(pairs_data, use_container_width=True, hide_index=True)
            
            # Show pair metrics
            pair_metrics = load_csv("pair_backtest_metrics.csv", QUANT_DATA)
            if pair_metrics is not None and not pair_metrics.empty:
                st.subheader("Backtest Performance")
                st.dataframe(pair_metrics, use_container_width=True, hide_index=True)
                
                # Show top pair details
                if len(pairs_data) > 0:
                    selected_pair = st.selectbox(
                        "Select pair to visualize",
                        options=range(len(pairs_data)),
                        format_func=lambda i: f"{pairs_data.iloc[i]['ticker_x']} / {pairs_data.iloc[i]['ticker_y']}"
                    )
                    
                    pair_row = pairs_data.iloc[selected_pair]
                    st.markdown(f"""
                    **Pair:** {pair_row['ticker_x']} / {pair_row['ticker_y']}  
                    **P-value:** {pair_row['pvalue']:.4f}  
                    **Hedge Ratio:** {pair_row['hedge_ratio']:.4f}
                    """)
                    
                    # Load spread data if available
                    spread_file = f"pair_spread_{pair_row['ticker_x']}_{pair_row['ticker_y']}.csv"
                    spread_data = load_csv(spread_file, QUANT_DATA)
                    
                    if spread_data is not None:
                        st.caption("Spread and z-score visualization would appear here with actual data")
        else:
            st.info("""
            No pairs data found. To generate:
            1. Run `python src/quant_framework/pairs_trading.py`
            2. Results will be saved to `data/processed/quant/`
            3. Refresh this page
            """)

elif page == "Regime Detection":
    section_header("Regime Detection", "HMM-based market state identification")
    
    if not ADVANCED_VIZ_AVAILABLE:
        st.warning("Advanced visualizations module not available. Ensure `dashboard/advanced_visualizations.py` is present.")
    else:
        st.markdown("""
        **Hidden Markov Models (HMM)** identify distinct market regimes (bull, bear, sideways, crisis)
        based on return and volatility patterns. The model dynamically adjusts portfolio exposure.
        """)
        
        st.info("**Demo:** Run `python src/quant_framework/regime_detection.py` to generate regime data.")
        
        # Check if regime data exists
        regime_data = load_csv("market_regimes.csv", QUANT_DATA)
        
        if regime_data is not None and not regime_data.empty:
            # Current regime
            current_regime = regime_data.iloc[-1]['regime'] if 'regime' in regime_data.columns else "Unknown"
            st.metric("Current Market Regime", current_regime.title())
            
            # Regime statistics
            regime_stats = load_csv("regime_statistics.csv", QUANT_DATA)
            if regime_stats is not None and not regime_stats.empty:
                st.subheader("Regime Statistics")
                st.dataframe(regime_stats, use_container_width=True, hide_index=True)
            
            # Transition matrix
            transition_matrix = load_csv("regime_transitions.csv", QUANT_DATA)
            if transition_matrix is not None and not transition_matrix.empty:
                st.subheader("Transition Probability Matrix")
                st.dataframe(transition_matrix, use_container_width=True)
                st.caption("Each cell shows P(transition from row regime to column regime)")
            
            # Performance comparison
            regime_performance = load_csv("regime_strategy_performance.csv", QUANT_DATA)
            if regime_performance is not None and not regime_performance.empty:
                st.subheader("Strategy Performance")
                col1, col2, col3 = st.columns(3)
                
                if 'strategy_return' in regime_performance.columns:
                    with col1:
                        st.metric("Strategy Return", f"{regime_performance['strategy_return'].iloc[0]:.2f}%")
                if 'strategy_sharpe' in regime_performance.columns:
                    with col2:
                        st.metric("Sharpe Ratio", f"{regime_performance['strategy_sharpe'].iloc[0]:.3f}")
                if 'alpha' in regime_performance.columns:
                    with col3:
                        st.metric("Alpha vs Benchmark", f"{regime_performance['alpha'].iloc[0]:.2f}%")
            
            # Regime timeline visualization
            if 'date' in regime_data.columns and 'regime' in regime_data.columns:
                st.subheader("Regime Timeline")
                st.caption("Colored regions indicate different market states over time")
                # Placeholder for actual visualization
                st.info("Regime timeline chart would appear here with plot_regime_timeline()")
        else:
            st.info("""
            No regime data found. To generate:
            1. Run `python src/quant_framework/regime_detection.py`
            2. Results will be saved to `data/processed/quant/`
            3. Refresh this page
            """)

elif page == "Investment Stages":
    section_header("Investment stages", "Illustrative private-market tables — not licensed deal data")
    vc = load_csv("vc_deals_scd.csv")
    growth = load_csv("growth_equity_deals_scd.csv")
    if vc is not None and growth is not None:
        st.write("**VC funding (illustrative)**")
        st.dataframe(vc, use_container_width=True)
        st.write("**Growth equity (illustrative)**")
        st.dataframe(growth, use_container_width=True)

elif page == "Market Analysis":
    section_header("Market analysis", "Illustrative TAM and competitive scaffolding")
    st.warning(
        "**Demo / non-advisory:** Market size and competitive tables below are illustrative scaffolding. "
        "**Investment attractiveness scores and buy/hold/sell labels are demo weights only**—not research, "
        "not ratings, not recommendations."
    )
    _m = load_manifest()
    _arts = (_m or {}).get("artifacts", {})
    _tier_rows = []
    for fname in PAGE_ARTIFACTS.get("Market Analysis", []):
        meta = _arts.get(fname, {})
        if meta.get("present"):
            _tier_rows.append(
                {
                    "File": fname,
                    "Kind": kind_display_label(meta.get("kind", "")),
                    "Tier": meta.get("tier", "—"),
                    "Summary": (meta.get("source_summary") or "")[:100],
                }
            )
    if _tier_rows:
        with st.expander("Data tier reference (this page’s CSVs)", expanded=False):
            st.dataframe(pd.DataFrame(_tier_rows), use_container_width=True, hide_index=True)
            st.caption(
                "**Tier** labels: `demo_tier_3` = illustrative market scaffolding; "
                "`sourced_public` / `mixed` = see manifest after running collectors. "
                "See README *Data tiers*."
            )
    mkt = load_csv("market_size_scd.csv")
    attr = load_csv("investment_attractiveness_scd.csv")
    if mkt is not None:
        st.caption("market_size_scd.csv — illustrative TAM-style rows unless you replace with sourced estimates.")
        st.dataframe(mkt, use_container_width=True)
    if attr is not None:
        st.caption("investment_attractiveness_scd.csv — demo scores only; do not use for real decisions.")
        st.dataframe(attr, use_container_width=True)
