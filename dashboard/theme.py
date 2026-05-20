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
}

ZONE_COLORS = {
    "epidemiology": "#6B8E7A",  # Sage green for health data
    "pipeline": "#8FA89A",      # Light sage for trials
    "portfolio": "#5A8A6F",     # Professional green for finance
}

PLOTLY_LAYOUT: dict[str, Any] = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#FAFBFA",
    font=dict(color="#2A3B2E", family="'Inter', 'SF Pro Display', system-ui, sans-serif", size=12),
    title=dict(font=dict(size=14, color="#2A3B2E", family="'Inter', 'SF Pro Display', system-ui, sans-serif", weight=600), x=0, xanchor="left"),
    margin=dict(t=52, b=40, l=48, r=24),
    legend=dict(bgcolor="rgba(255,255,255,0.95)", bordercolor="#D9E2DE", borderwidth=1, font=dict(size=11, color="#5C6B73")),
    hoverlabel=dict(bgcolor="#FFFFFF", bordercolor="#D9E2DE", font=dict(family="'Source Sans 3', sans-serif", size=11, color="#1F2933")),
    xaxis=dict(
        gridcolor="#E8EDEA",
        zerolinecolor="#D9E2DE",
        linecolor="#CBD5D0",
        tickfont=dict(color="#5C6B73", size=11),
        title_font=dict(color="#475569", size=12),
    ),
    yaxis=dict(
        gridcolor="#E8EDEA",
        zerolinecolor="#D9E2DE",
        linecolor="#CBD5D0",
        tickfont=dict(color="#5C6B73", size=11),
        title_font=dict(color="#475569", size=12),
    ),
    colorway=["#5A8A6F", "#8FA89A", "#6B8E7A", "#B8A99A", "#A3C4B5", "#D4C4B8"],
)

CLINICAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

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
    max-width: 1120px;
}

/* Hero */
.glass-hero {
    margin-bottom: 1.5rem;
    padding: 2.5rem 2.75rem;
    border-radius: 16px;
    background: linear-gradient(135deg, #FFFFFF 0%, #FAFCFA 100%);
    border: 1px solid #E8F2EC;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.03), 0 12px 32px rgba(42, 59, 46, 0.04);
}
.glass-hero .eyebrow {
    display: inline-block;
    margin-bottom: 0.875rem;
    padding: 0.375rem 0.875rem;
    border-radius: 6px;
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
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.2;
    color: #2A3B2E;
}
.glass-hero p {
    margin: 0;
    max-width: 52rem;
    color: #6B7C6F;
    font-size: 0.9375rem;
    line-height: 1.65;
    font-weight: 400;
}

/* Panels */
.glass-panel {
    background: #FFFFFF;
    border: 1px solid #E8F2EC;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(42, 59, 46, 0.02), 0 4px 12px rgba(42, 59, 46, 0.03);
}
.glass-section {
    margin: 2rem 0 1rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid #E8F2EC;
}
.glass-section h2 {
    margin: 0;
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: #2A3B2E !important;
    letter-spacing: -0.015em;
}
.glass-section p.sub {
    margin: 0.5rem 0 0.875rem;
    font-size: 0.875rem;
    color: #6B7C6F;
    line-height: 1.6;
    font-weight: 400;
}

/* Disclaimer / notice */
.glass-disclaimer {
    background: #F4F7F2;
    border: 1px solid #C4D4C0;
    border-left: 3px solid #5A8A6F;
    border-radius: 10px;
    padding: 1.125rem 1.5rem;
    margin-bottom: 1.5rem;
    color: #2A3B2E !important;
    font-size: 0.875rem;
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

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #FAFCFA 0%, #FFFFFF 100%) !important;
    border-right: 1px solid #E8F2EC !important;
    box-shadow: 2px 0 16px rgba(42, 59, 46, 0.02);
}
[data-testid="stSidebar"] > div:first-child { padding-top: 1.5rem; }
.sidebar-brand {
    padding: 0 1rem 1.5rem;
    margin: 0 0.5rem 1.25rem;
    border-bottom: 1px solid #E8F2EC;
}
.sidebar-brand .logo {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8FA89A;
}
.sidebar-brand .name {
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
    font-size: 1.125rem;
    font-weight: 600;
    color: #2A3B2E;
    margin-top: 0.5rem;
    letter-spacing: -0.015em;
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
    background: #F4F7F2 !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label[data-checked="true"],
[data-testid="stSidebar"] [data-testid="stRadio"] div[role="radiogroup"] label:has(input:checked) {
    background: #E8F2EC !important;
    color: #2A3B2E !important;
    font-weight: 600 !important;
}
[data-testid="stSidebar"] [data-testid="stSelectbox"] > div > div {
    background: #FAFCFA !important;
    border: 1px solid #E8F2EC !important;
    border-radius: 10px !important;
    color: #2A3B2E !important;
}

/* Main */
h1, h2, h3, .stSubheader {
    font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif !important;
    color: #2A3B2E !important;
    font-weight: 600 !important;
    letter-spacing: -0.015em !important;
}
p, .stCaption, label { color: #6B7C6F; font-weight: 400; }
.stAlert {
    border-radius: 8px !important;
    border: 1px solid #D9E2DE !important;
    background: #FAFBFA !important;
}

[data-testid="stDataFrame"] {
    border: 1px solid #D9E2DE;
    border-radius: 8px;
    overflow: hidden;
}
[data-testid="stExpander"] {
    background: #FFFFFF !important;
    border: 1px solid #D9E2DE !important;
    border-radius: 8px !important;
}
[data-testid="stMetric"] {
    background: #FFFFFF;
    border: 1px solid #D9E2DE;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    box-shadow: 0 1px 2px rgba(31, 41, 51, 0.03);
}
[data-testid="stMetricLabel"] { color: #7A8F84 !important; font-size: 0.72rem !important; text-transform: uppercase; letter-spacing: 0.06em; }
[data-testid="stMetricValue"] { color: #1F2933 !important; font-weight: 600 !important; }

.stButton > button {
    border-radius: 8px !important;
    border: 1px solid #4A6B5C !important;
    background: #4A6B5C !important;
    color: #FFFFFF !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    transition: background 0.15s ease, border-color 0.15s ease !important;
}
.stButton > button:hover {
    background: #3D5A4E !important;
    border-color: #3D5A4E !important;
    box-shadow: none !important;
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
        """
<div class="sidebar-brand">
  <div class="logo">Research platform</div>
  <div class="name">Immunology Investment</div>
</div>
""",
        unsafe_allow_html=True,
    )


def apply_plotly_theme(fig: go.Figure) -> go.Figure:
    fig.update_layout(**PLOTLY_LAYOUT)
    fig.update_xaxes(showgrid=True, gridwidth=1)
    fig.update_yaxes(showgrid=True, gridwidth=1)
    return fig


def styled_line_chart(fig: go.Figure, *, accent: str | None = None) -> go.Figure:
    accent = accent or COLORS["accent"]
    apply_plotly_theme(fig)
    for i, trace in enumerate(fig.data):
        if isinstance(trace, go.Scatter) and trace.mode and "lines" in str(trace.mode):
            color = PLOTLY_LAYOUT["colorway"][i % len(PLOTLY_LAYOUT["colorway"])]
            fig.data[i].update(
                line=dict(width=2.25, color=color if i else accent, shape="spline"),
                marker=dict(size=4, color=color if i else accent, line=dict(width=1, color="#FFFFFF")),
            )
    return fig


def styled_bar_chart(fig: go.Figure) -> go.Figure:
    apply_plotly_theme(fig)
    if fig.data:
        fig.data[0].update(marker=dict(color=COLORS["accent_blue"], line=dict(width=0), opacity=0.85))
    return fig
