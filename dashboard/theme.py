"""
Clinical wellness UI — neutral palette, Source typography, restrained layout.
"""

from __future__ import annotations

import html
from typing import Any

import plotly.graph_objects as go
import streamlit as st

# 2026 Clinical Professional Palette - Light Green & Neutral Taupe
COLORS = {
    "bg": "#F8FAF7",              # Soft off-white with green undertone
    "surface": "#FFFFFF",         # Pure white for cards
    "surface_alt": "#F2F5F1",     # Light sage for alternating rows
    "border": "#D8E3D6",          # Soft green-gray border
    "text": "#2A3B2E",            # Deep forest green for text
    "text_muted": "#6B7C6F",      # Muted taupe-green
    "accent": "#5A8A6F",          # Professional sage green
    "accent_secondary": "#8FA89A", # Lighter sage
    "accent_soft": "#E8F2EC",     # Very light green background
    "taupe": "#B8A99A",           # Warm neutral taupe
    "taupe_light": "#E5DED6",     # Light taupe for subtle backgrounds
    "notice_bg": "#F4F7F2",       # Subtle notice background
    "notice_border": "#C4D4C0",   # Soft green border
    "accent_blue": "#5B8A9A",     # Muted teal for charts
    "success": "#3D7A55",         # Darker green for success states
    "warning": "#B8860B",         # Dark goldenrod for warnings
}

ZONE_COLORS = {
    "epidemiology": "#6B8E7A",  # Sage green for health data
    "pipeline": "#8FA89A",      # Light sage for trials
    "portfolio": "#5A8A6F",     # Professional green for finance
}

PLOTLY_LAYOUT: dict[str, Any] = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#FAFCFB",
    font=dict(color="#2A3B2E", family="'Inter', 'SF Pro Display', system-ui, sans-serif", size=12),
    title=dict(
        font=dict(size=14, color="#1E2D22", family="'Inter', 'SF Pro Display', system-ui, sans-serif", weight=600),
        x=0,
        xanchor="left",
        pad=dict(b=12),
    ),
    margin=dict(t=56, b=48, l=56, r=28),
    legend=dict(
        bgcolor="rgba(255,255,255,0.97)",
        bordercolor="#D8E3D6",
        borderwidth=1,
        font=dict(size=11, color="#475569"),
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="left",
        x=0,
    ),
    hoverlabel=dict(
        bgcolor="#FFFFFF",
        bordercolor="#D8E3D6",
        font=dict(family="'Inter', 'SF Pro Display', sans-serif", size=12, color="#1E2D22"),
    ),
    xaxis=dict(
        gridcolor="#EDF1EE",
        griddash="dot",
        zerolinecolor="#D8E3D6",
        linecolor="#CBD5D0",
        tickfont=dict(color="#5A6B5F", size=11),
        title_font=dict(color="#3A4D40", size=12, weight=500),
        title_standoff=12,
    ),
    yaxis=dict(
        gridcolor="#EDF1EE",
        griddash="dot",
        zerolinecolor="#D8E3D6",
        linecolor="#CBD5D0",
        tickfont=dict(color="#5A6B5F", size=11),
        title_font=dict(color="#3A4D40", size=12, weight=500),
        title_standoff=12,
    ),
    colorway=["#5A8A6F", "#5B8A9A", "#8FA89A", "#6B8E7A", "#B8A99A", "#A3C4B5", "#7A9BB5", "#D4C4B8"],
)

CLINICAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* ---- Global ---- */
html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2A3B2E;
    font-weight: 400;
    letter-spacing: -0.01em;
}
[data-testid="stAppViewContainer"] {
    background: linear-gradient(180deg, #FAFCF9 0%, #F8FAF7 50%, #F4F7F2 100%);
}
[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stToolbar"] { display: none; }
.block-container {
    padding-top: 1.5rem;
    padding-bottom: 3rem;
    max-width: 1140px;
}

/* ---- Hero ---- */
.glass-hero {
    margin-bottom: 1.75rem;
    padding: 2.5rem 2.75rem;
    border-radius: 16px;
    background: linear-gradient(135deg, #FFFFFF 0%, #FAFCFA 100%);
    border: 1px solid #D8E3D6;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.04), 0 8px 24px rgba(42, 59, 46, 0.05);
}
.glass-hero .eyebrow {
    display: inline-block;
    margin-bottom: 0.875rem;
    padding: 0.375rem 0.875rem;
    border-radius: 20px;
    background: #E8F2EC;
    color: #5A8A6F;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}
.glass-hero h1 {
    margin: 0 0 0.75rem;
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    font-size: 1.875rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: #1E2D22;
}
.glass-hero p {
    margin: 0;
    max-width: 52rem;
    color: #5A6B5F;
    font-size: 0.9375rem;
    line-height: 1.65;
    font-weight: 400;
}

/* ---- Panels ---- */
.glass-panel {
    background: #FFFFFF;
    border: 1px solid #D8E3D6;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03);
    transition: box-shadow 0.2s ease;
}
.glass-panel:hover {
    box-shadow: 0 2px 8px rgba(42, 59, 46, 0.06);
}
.glass-section {
    margin: 2.25rem 0 1.125rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #E8F2EC;
}
.glass-section h2 {
    margin: 0;
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1E2D22 !important;
    letter-spacing: -0.02em;
}
.glass-section p.sub {
    margin: 0.375rem 0 0.75rem;
    font-size: 0.8125rem;
    color: #6B7C6F;
    line-height: 1.6;
    font-weight: 400;
}

/* ---- Disclaimer / notice ---- */
.glass-disclaimer {
    background: #F4F7F2;
    border: 1px solid #C4D4C0;
    border-left: 3px solid #5A8A6F;
    border-radius: 10px;
    padding: 1.125rem 1.5rem;
    margin-bottom: 1.5rem;
    color: #2A3B2E !important;
    font-size: 0.8125rem;
    line-height: 1.7;
    font-weight: 400;
}
.glass-disclaimer strong { color: #2A3B2E !important; font-weight: 600; }
.glass-disclaimer code {
    color: #5A8A6F !important;
    background: #E8F2EC;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.glass-zone-label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8FA89A;
}

/* ---- Sidebar ---- */
[data-testid="stSidebar"] {
    background: #FAFCFA !important;
    border-right: 1px solid #D8E3D6 !important;
}
[data-testid="stSidebar"] > div:first-child { padding-top: 1.5rem; }
.sidebar-brand {
    padding: 0.25rem 1rem 1.25rem;
    margin: 0 0.5rem 1.25rem;
    border-bottom: 2px solid #E8F2EC;
}
.sidebar-brand .logo {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #8FA89A;
    margin-bottom: 0.25rem;
}
.sidebar-brand .name {
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    font-size: 1.0625rem;
    font-weight: 700;
    color: #1E2D22;
    margin-top: 0.375rem;
    letter-spacing: -0.02em;
    line-height: 1.25;
}
[data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
    font-size: 0.6875rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
    color: #8FA89A !important;
    margin-top: 1.5rem !important;
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif !important;
}
[data-testid="stSidebar"] label, [data-testid="stSidebar"] .stCaption {
    color: #6B7C6F !important;
    font-size: 0.875rem !important;
}
/* Do not hide .stRadio > label — new Streamlit lays out horizontal options as direct labels; hiding breaks Indication / Universe / Navigation radios. */
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    padding: 0.5rem 0.75rem !important;
    border-radius: 8px !important;
    color: #2A3B2E !important;
    font-weight: 500 !important;
    font-size: 0.9375rem !important;
    transition: all 0.15s ease !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
    background: #E8F2EC !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label[data-checked="true"],
[data-testid="stSidebar"] [data-testid="stRadio"] div[role="radiogroup"] label:has(input:checked) {
    background: #D4E8DC !important;
    color: #1E2D22 !important;
    font-weight: 600 !important;
}
[data-testid="stSidebar"] [data-testid="stSelectbox"] > div > div {
    background: #FFFFFF !important;
    border: 1px solid #D8E3D6 !important;
    border-radius: 8px !important;
    color: #2A3B2E !important;
}

/* ---- Main typography ---- */
h1, h2, h3, .stSubheader {
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif !important;
    color: #1E2D22 !important;
    font-weight: 600 !important;
    letter-spacing: -0.02em !important;
}
p, .stCaption, label { color: #5A6B5F; font-weight: 400; }
.stAlert {
    border-radius: 10px !important;
    border: 1px solid #D8E3D6 !important;
    background: #FAFBFA !important;
}

/* ---- Data display ---- */
[data-testid="stDataFrame"] {
    border: 1px solid #D8E3D6;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03);
}
[data-testid="stDataFrame"] table { font-size: 0.8125rem !important; }
[data-testid="stDataFrame"] th {
    background: #F4F7F2 !important;
    color: #1E2D22 !important;
    font-weight: 600 !important;
    font-size: 0.75rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    border-bottom: 2px solid #D8E3D6 !important;
    padding: 0.625rem 0.75rem !important;
}
[data-testid="stDataFrame"] td {
    color: #2A3B2E !important;
    padding: 0.5rem 0.75rem !important;
    border-bottom: 1px solid #EDF1EE !important;
}
[data-testid="stDataFrame"] tr:hover td {
    background: #F8FAF7 !important;
}
[data-testid="stMetric"] {
    background: #FFFFFF;
    border: 1px solid #D8E3D6;
    border-radius: 10px;
    padding: 1rem 1.125rem;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03);
    transition: box-shadow 0.2s ease;
}
[data-testid="stMetric"]:hover {
    box-shadow: 0 2px 8px rgba(42, 59, 46, 0.06);
}
[data-testid="stMetricLabel"] { color: #7A8F84 !important; font-size: 0.72rem !important; text-transform: uppercase; letter-spacing: 0.06em; }
[data-testid="stMetricValue"] { color: #1E2D22 !important; font-weight: 700 !important; }

/* ---- Chart containers ---- */
[data-testid="stPlotlyChart"] {
    background: #FFFFFF;
    border: 1px solid #D8E3D6;
    border-radius: 10px;
    padding: 0.5rem;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03);
    margin-bottom: 1rem;
}

/* ---- Table labels ---- */
.table-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #1E2D22;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.table-label .badge {
    font-size: 0.6875rem;
    font-weight: 500;
    color: #5A8A6F;
    background: #E8F2EC;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
}

/* ---- Buttons ---- */
.stButton > button {
    border-radius: 8px !important;
    border: 1px solid #4A6B5C !important;
    background: #4A6B5C !important;
    color: #FFFFFF !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    padding: 0.5rem 1.25rem !important;
    transition: all 0.2s ease !important;
}
.stButton > button:hover {
    background: #3D5A4E !important;
    border-color: #3D5A4E !important;
    box-shadow: 0 2px 6px rgba(61, 90, 78, 0.2) !important;
    transform: translateY(-1px) !important;
}
.stButton > button:active {
    transform: translateY(0) !important;
    box-shadow: none !important;
}

/* ---- Tabs ---- */
.stTabs [data-baseweb="tab-list"] {
    gap: 0.25rem;
    border-bottom: 2px solid #E8F2EC;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 8px 8px 0 0;
    padding: 0.5rem 1rem;
    font-weight: 500;
    color: #6B7C6F;
    transition: all 0.15s ease;
}
.stTabs [data-baseweb="tab"]:hover { background: #F4F7F2; color: #2A3B2E; }
.stTabs [aria-selected="true"] {
    font-weight: 600 !important;
    color: #1E2D22 !important;
    border-bottom-color: #5A8A6F !important;
}

/* ---- Number input / sliders ---- */
[data-testid="stNumberInput"] input,
[data-testid="stTextInput"] input {
    border-radius: 8px !important;
    border: 1px solid #D8E3D6 !important;
    font-size: 0.875rem !important;
}
.stSlider [data-testid="stThumbValue"] { font-weight: 600 !important; color: #1E2D22 !important; }

/* ---- Verification banner ---- */
.cert-banner {
    background: linear-gradient(135deg, #F0F7F2 0%, #E8F2EC 100%);
    padding: 1.5rem 2rem;
    border-radius: 12px;
    margin-bottom: 1.75rem;
    border: 1px solid #C4D4C0;
    border-left: 4px solid #3D7A55;
}
.cert-banner h3 {
    color: #1E3A28;
    margin: 0 0 0.625rem 0;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.015em;
}
.cert-banner p {
    color: #2A5A3B;
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    line-height: 1.6;
}
.cert-banner .cert-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}
.cert-banner .cert-actions a {
    padding: 0.5rem 1.125rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.8125rem;
    display: inline-block;
    transition: all 0.15s ease;
}
.cert-banner .cert-actions a.primary {
    background: #3D7A55;
    color: white;
}
.cert-banner .cert-actions a.primary:hover { background: #2D6444; }
.cert-banner .cert-actions a.secondary {
    background: white;
    color: #3D7A55;
    border: 1.5px solid #3D7A55;
}
.cert-banner .cert-actions a.secondary:hover { background: #F0F7F2; }
.cert-banner .cert-meta {
    color: #5A7A63;
    font-size: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #C4D4C0;
}
.cert-banner .cert-meta code {
    background: #D4E8DC;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    color: #1E3A28;
}

/* ---- Hero metric cards ---- */
.hero-metrics {
    background: #F4F7F2;
    padding: 1.75rem 2rem;
    border-radius: 12px;
    margin-bottom: 1.75rem;
    border: 1px solid #D8E3D6;
}
.hero-metrics .hero-tagline {
    color: #5A6B5F;
    margin: 0 0 1.5rem 0;
    font-size: 0.9375rem;
    text-align: center;
    line-height: 1.6;
}
.hero-metrics .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}
.hero-metrics .metric-card {
    background: #FFFFFF;
    padding: 1.375rem 1.25rem;
    border-radius: 10px;
    border: 1px solid #D8E3D6;
    text-align: center;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03);
}
.hero-metrics .metric-card:hover {
    border-color: #5A8A6F;
    box-shadow: 0 4px 12px rgba(90, 138, 111, 0.1);
    transform: translateY(-2px);
}
.hero-metrics .metric-card .value {
    color: #3D7A55;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
    letter-spacing: -0.02em;
}
.hero-metrics .metric-card .label {
    color: #1E2D22;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.hero-metrics .metric-card .detail {
    color: #7A8F84;
    font-size: 0.6875rem;
    margin-top: 0.375rem;
}
.hero-metrics .hero-footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #D8E3D6;
    text-align: center;
}
.hero-metrics .hero-footer p {
    color: #5A6B5F;
    font-size: 0.8125rem;
    margin: 0;
    line-height: 1.7;
}
.hero-metrics .hero-footer strong {
    color: #3D7A55;
}

/* ---- Real data badge ---- */
.real-data-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: linear-gradient(135deg, #E8F2EC 0%, #D4E8DC 100%);
    padding: 0.625rem 1.125rem;
    border-radius: 8px;
    border-left: 3px solid #3D7A55;
    margin-bottom: 1rem;
}
.real-data-badge span {
    color: #1E3A28;
    font-weight: 600;
    font-size: 0.875rem;
}

/* ---- Spinner ---- */
.stSpinner > div {
    border-color: #5A8A6F transparent transparent transparent !important;
}
.stSpinner > div + div {
    color: #5A6B5F !important;
    font-size: 0.8125rem !important;
    font-weight: 500 !important;
}

/* ---- Tooltips ---- */
[data-testid="stTooltipIcon"] {
    color: #8FA89A !important;
    transition: color 0.15s ease;
}
[data-testid="stTooltipIcon"]:hover {
    color: #5A8A6F !important;
}

/* ---- Expanders (collapsible) ---- */
[data-testid="stExpander"] {
    background: #FFFFFF !important;
    border: 1px solid #D8E3D6 !important;
    border-radius: 10px !important;
    box-shadow: 0 1px 2px rgba(42, 59, 46, 0.02) !important;
    margin-bottom: 0.75rem !important;
    transition: box-shadow 0.2s ease !important;
}
[data-testid="stExpander"]:hover {
    box-shadow: 0 2px 6px rgba(42, 59, 46, 0.05) !important;
}
[data-testid="stExpander"] summary {
    font-weight: 500 !important;
    color: #2A3B2E !important;
    font-size: 0.875rem !important;
    padding: 0.75rem 1rem !important;
}
[data-testid="stExpander"] summary:hover {
    color: #1E2D22 !important;
}
[data-testid="stExpander"] [data-testid="stExpanderContent"] {
    padding: 0 1rem 0.75rem !important;
}

/* ---- Empty state ---- */
.empty-state {
    text-align: center;
    padding: 2.5rem 2rem;
    background: #FAFCFA;
    border: 1px dashed #D8E3D6;
    border-radius: 12px;
    margin: 1rem 0;
}
.empty-state .icon { font-size: 2rem; margin-bottom: 0.75rem; color: #8FA89A; }
.empty-state .title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #2A3B2E;
    margin-bottom: 0.375rem;
}
.empty-state .detail {
    font-size: 0.8125rem;
    color: #6B7C6F;
    line-height: 1.6;
}
.empty-state code {
    background: #E8F2EC;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8em;
    color: #3D7A55;
}

hr { border-color: #E2E8E4 !important; margin: 1.5rem 0 !important; }
</style>
"""


def apply_glass_theme() -> None:
    """Apply clinical wellness theme (kept name for app compatibility)."""
    st.markdown(CLINICAL_CSS, unsafe_allow_html=True)


def glass_hero(
    title: str,
    subtitle: str,
    *,
    eyebrow: str = "Clinical research · Immunology · Quantitative analysis",
) -> None:
    safe_title = html.escape(title)
    safe_sub = html.escape(subtitle)
    safe_eye = html.escape(eyebrow)
    st.markdown(
        f'<div class="glass-hero">'
        f'<span class="eyebrow">{safe_eye}</span>'
        f'<h1>{safe_title}</h1><p>{safe_sub}</p></div>',
        unsafe_allow_html=True,
    )


def section_header(title: str, subtitle: str = "") -> None:
    safe_t = html.escape(title)
    safe_s = html.escape(subtitle) if subtitle else ""
    sub_html = f'<p class="sub">{safe_s}</p>' if subtitle else ""
    st.markdown(f'<div class="glass-section"><h2>{safe_t}</h2>{sub_html}</div>', unsafe_allow_html=True)


def zone_banner(zone: str, label: str) -> None:
    color = ZONE_COLORS.get(zone, "#7A8F84")
    st.markdown(
        f'<div class="glass-panel" style="border-left: 3px solid {color};">'
        f'<span class="glass-zone-label">{html.escape(zone)}</span><br/>'
        f'<span style="color:#1F2933;font-weight:500;font-size:0.9rem;">{html.escape(label)}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def equity_context_card(note: str) -> None:
    st.markdown(
        f'<div class="glass-panel" style="border-left: 3px solid {COLORS["accent_blue"]}; background:#F7FAFC;">'
        f'<span class="glass-zone-label">Population health context</span><br/>'
        f'<span style="color:#475569;font-size:0.88rem;line-height:1.55;">{html.escape(note)}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def sidebar_brand() -> None:
    st.sidebar.markdown(
        '<div class="sidebar-brand">'
        '<div class="logo">&#9670; Research Platform</div>'
        '<div class="name">Immunology Investment Intelligence</div>'
        '</div>',
        unsafe_allow_html=True,
    )


def apply_plotly_theme(fig: go.Figure) -> go.Figure:
    """Apply clinical theme to any Plotly figure."""
    fig.update_layout(**PLOTLY_LAYOUT)
    fig.update_xaxes(showgrid=True, gridwidth=1, showline=True, linewidth=1)
    fig.update_yaxes(showgrid=True, gridwidth=1, showline=True, linewidth=1)
    return fig


def styled_line_chart(fig: go.Figure, *, accent: str | None = None) -> go.Figure:
    """Style a line chart with spline curves and themed markers."""
    accent = accent or COLORS["accent"]
    apply_plotly_theme(fig)
    cw = PLOTLY_LAYOUT["colorway"]
    for i, trace in enumerate(fig.data):
        if isinstance(trace, go.Scatter) and trace.mode and "lines" in str(trace.mode):
            color = cw[i % len(cw)] if i else accent
            fig.data[i].update(
                line=dict(width=2.5, color=color, shape="spline"),
                marker=dict(
                    size=5,
                    color=color,
                    line=dict(width=1.5, color="#FFFFFF"),
                    symbol="circle",
                ),
            )
    fig.update_layout(
        hovermode="x unified",
    )
    return fig


def styled_bar_chart(fig: go.Figure) -> go.Figure:
    """Style a bar chart with themed colors, rounded corners, and text labels."""
    apply_plotly_theme(fig)
    cw = PLOTLY_LAYOUT["colorway"]
    for i, trace in enumerate(fig.data):
        if isinstance(trace, go.Bar):
            color = cw[i % len(cw)] if i else COLORS["accent_blue"]
            trace.update(
                marker=dict(
                    color=color,
                    line=dict(width=0),
                    opacity=0.9,
                    cornerradius=4,
                ),
            )
    fig.update_layout(
        bargap=0.3,
        bargroupgap=0.1,
    )
    return fig


def empty_state(title: str, detail: str, *, icon: str = "&#128269;") -> None:
    """Render a styled empty state placeholder."""
    st.markdown(
        f'<div class="empty-state">'
        f'<div class="icon">{icon}</div>'
        f'<div class="title">{html.escape(title)}</div>'
        f'<div class="detail">{detail}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def styled_dataframe(
    df: "pd.DataFrame",
    *,
    height: int | None = None,
    max_rows: int | None = None,
) -> None:
    """Render a DataFrame with professional styling."""
    display = df.head(max_rows) if max_rows else df
    st.dataframe(
        display,
        use_container_width=True,
        hide_index=True,
        height=height,
    )
