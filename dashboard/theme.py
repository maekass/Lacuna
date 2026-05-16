"""
Clinical wellness UI — neutral palette, Source typography, restrained layout.
"""

from __future__ import annotations

import html
from typing import Any

import plotly.graph_objects as go
import streamlit as st

# Wellness / clinical palette (neutral, low saturation)
COLORS = {
    "bg": "#F4F6F4",
    "surface": "#FFFFFF",
    "surface_alt": "#EEF2EF",
    "border": "#D9E2DE",
    "text": "#1F2933",
    "text_muted": "#5C6B73",
    "accent": "#4A6B5C",
    "accent_blue": "#5B7C99",
    "accent_soft": "#E8F0EB",
    "notice_bg": "#F0F4F2",
    "notice_border": "#B8C9BE",
}

ZONE_COLORS = {
    "epidemiology": "#5B7C99",
    "pipeline": "#6B7B73",
    "portfolio": "#4A6B5C",
}

PLOTLY_LAYOUT: dict[str, Any] = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#FAFBFA",
    font=dict(color="#334155", family="'Source Sans 3', system-ui, sans-serif", size=12),
    title=dict(font=dict(size=14, color="#1F2933", family="'Source Serif 4', Georgia, serif"), x=0, xanchor="left"),
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
    colorway=["#4A6B5C", "#5B7C99", "#7A8F84", "#94A3B8", "#6B8E7A", "#8B9DAF"],
)

CLINICAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap');

html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #1F2933;
}
[data-testid="stAppViewContainer"] {
    background: linear-gradient(180deg, #F8FAF8 0%, #F4F6F4 40%, #F1F4F2 100%);
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
    margin-bottom: 1.25rem;
    padding: 2rem 2.25rem;
    border-radius: 12px;
    background: #FFFFFF;
    border: 1px solid #D9E2DE;
    box-shadow: 0 1px 2px rgba(31, 41, 51, 0.04), 0 8px 24px rgba(31, 41, 51, 0.04);
}
.glass-hero .eyebrow {
    display: inline-block;
    margin-bottom: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    background: #E8F0EB;
    color: #4A6B5C;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}
.glass-hero h1 {
    margin: 0 0 0.6rem;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: #1F2933;
}
.glass-hero p {
    margin: 0;
    max-width: 48rem;
    color: #5C6B73;
    font-size: 0.95rem;
    line-height: 1.6;
}

/* Panels */
.glass-panel {
    background: #FFFFFF;
    border: 1px solid #D9E2DE;
    border-radius: 10px;
    padding: 1rem 1.15rem;
    margin-bottom: 0.85rem;
    box-shadow: 0 1px 2px rgba(31, 41, 51, 0.03);
}
.glass-section {
    margin: 1.75rem 0 0.85rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #E2E8E4;
}
.glass-section h2 {
    margin: 0;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1F2933 !important;
    letter-spacing: -0.01em;
}
.glass-section p.sub {
    margin: 0.35rem 0 0.75rem;
    font-size: 0.875rem;
    color: #5C6B73;
    line-height: 1.5;
}

/* Disclaimer / notice */
.glass-disclaimer {
    background: #F0F4F2;
    border: 1px solid #B8C9BE;
    border-left: 3px solid #4A6B5C;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    color: #334155 !important;
    font-size: 0.84rem;
    line-height: 1.65;
}
.glass-disclaimer strong { color: #1F2933 !important; font-weight: 600; }
.glass-disclaimer code {
    color: #4A6B5C !important;
    background: #E8F0EB;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.82em;
}

.glass-zone-label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7A8F84;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: #FFFFFF !important;
    border-right: 1px solid #D9E2DE !important;
    box-shadow: 2px 0 12px rgba(31, 41, 51, 0.03);
}
[data-testid="stSidebar"] > div:first-child { padding-top: 1.5rem; }
.sidebar-brand {
    padding: 0 0.75rem 1.25rem;
    margin: 0 0.5rem 1rem;
    border-bottom: 1px solid #E2E8E4;
}
.sidebar-brand .logo {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7A8F84;
}
.sidebar-brand .name {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #1F2933;
    margin-top: 0.35rem;
    letter-spacing: -0.01em;
}
[data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
    font-size: 0.65rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.1em !important;
    text-transform: uppercase !important;
    color: #7A8F84 !important;
    margin-top: 1.25rem !important;
}
[data-testid="stSidebar"] label, [data-testid="stSidebar"] .stCaption {
    color: #5C6B73 !important;
    font-size: 0.84rem !important;
}
/* Do not hide .stRadio > label — new Streamlit lays out horizontal options as direct labels; hiding breaks Indication / Universe / Navigation radios. */
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    padding: 0.4rem 0.6rem !important;
    border-radius: 6px !important;
    color: #334155 !important;
    font-weight: 500 !important;
    font-size: 0.9rem !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
    background: #F0F4F2 !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label[data-checked="true"],
[data-testid="stSidebar"] [data-testid="stRadio"] div[role="radiogroup"] label:has(input:checked) {
    background: #E8F0EB !important;
    color: #1F2933 !important;
}
[data-testid="stSidebar"] [data-testid="stSelectbox"] > div > div {
    background: #FAFBFA !important;
    border: 1px solid #D9E2DE !important;
    border-radius: 8px !important;
    color: #1F2933 !important;
}

/* Main */
h1, h2, h3, .stSubheader {
    font-family: 'Source Serif 4', Georgia, serif !important;
    color: #1F2933 !important;
}
p, .stCaption, label { color: #5C6B73; }
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
