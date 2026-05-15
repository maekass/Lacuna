"""
2026 professional glass UI — design tokens, Streamlit overrides, Plotly theme.
"""

from __future__ import annotations

import html
from typing import Any

import plotly.graph_objects as go
import streamlit as st

# ── Design tokens ─────────────────────────────────────────────────────────────
COLORS = {
    "bg_deep": "#070b14",
    "bg_elevated": "#0f1420",
    "glass": "rgba(255, 255, 255, 0.04)",
    "glass_border": "rgba(255, 255, 255, 0.08)",
    "text": "#f1f5f9",
    "text_muted": "#94a3b8",
    "accent": "#818cf8",
    "accent_soft": "rgba(129, 140, 248, 0.15)",
    "cyan": "#22d3ee",
    "violet": "#a78bfa",
    "emerald": "#34d399",
}

ZONE_COLORS = {
    "epidemiology": COLORS["cyan"],
    "pipeline": COLORS["violet"],
    "portfolio": COLORS["emerald"],
}

PLOTLY_LAYOUT: dict[str, Any] = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(255,255,255,0.02)",
    font=dict(color="#e2e8f0", family="Plus Jakarta Sans, system-ui, sans-serif", size=12),
    title=dict(font=dict(size=15, color="#f8fafc"), x=0, xanchor="left"),
    margin=dict(t=56, b=44, l=52, r=28),
    legend=dict(
        bgcolor="rgba(15, 20, 32, 0.8)",
        bordercolor="rgba(255,255,255,0.08)",
        borderwidth=1,
        font=dict(size=11, color="#cbd5e1"),
    ),
    hoverlabel=dict(
        bgcolor="#1e293b",
        bordercolor="rgba(255,255,255,0.12)",
        font=dict(family="JetBrains Mono, monospace", size=11, color="#f8fafc"),
    ),
    xaxis=dict(
        gridcolor="rgba(255,255,255,0.05)",
        zerolinecolor="rgba(255,255,255,0.08)",
        linecolor="rgba(255,255,255,0.12)",
        tickfont=dict(color="#94a3b8", size=11),
        title_font=dict(color="#cbd5e1", size=12),
    ),
    yaxis=dict(
        gridcolor="rgba(255,255,255,0.05)",
        zerolinecolor="rgba(255,255,255,0.08)",
        linecolor="rgba(255,255,255,0.12)",
        tickfont=dict(color="#94a3b8", size=11),
        title_font=dict(color="#cbd5e1", size=12),
    ),
    colorway=["#818cf8", "#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"],
)

GLASS_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Canvas ── */
html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
}
[data-testid="stAppViewContainer"] {
    background:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129, 140, 248, 0.12), transparent),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(34, 211, 238, 0.06), transparent),
        linear-gradient(180deg, #070b14 0%, #0a0f1a 50%, #070b14 100%);
}
[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stToolbar"] { display: none; }
.block-container {
    padding-top: 1.25rem;
    padding-bottom: 3rem;
    max-width: 1280px;
}

/* ── Hero ── */
.glass-hero {
    position: relative;
    overflow: hidden;
    margin-bottom: 1rem;
    padding: 2rem 2.25rem 1.75rem;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.5);
}
.glass-hero::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(129,140,248,0.5), transparent);
}
.glass-hero .eyebrow {
    display: inline-block;
    margin-bottom: 0.65rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(129, 140, 248, 0.12);
    border: 1px solid rgba(129, 140, 248, 0.25);
    color: #c7d2fe;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}
.glass-hero h1 {
    margin: 0 0 0.5rem;
    font-size: 1.85rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #f8fafc;
}
.glass-hero p {
    margin: 0;
    max-width: 52rem;
    color: #94a3b8;
    font-size: 0.95rem;
    line-height: 1.55;
    font-weight: 400;
}

/* ── Panels ── */
.glass-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
    margin-bottom: 0.85rem;
    backdrop-filter: blur(12px);
}
.glass-section {
    margin: 1.5rem 0 0.75rem;
}
.glass-section h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #f8fafc !important;
}
.glass-section p.sub {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #64748b;
}

/* ── Disclaimer ── */
.glass-disclaimer {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #e5c76b;
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 1rem;
    color: #1c1917 !important;
    font-size: 0.84rem;
    line-height: 1.6;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.glass-disclaimer strong { color: #451a03 !important; font-weight: 600; }
.glass-disclaimer code {
    color: #78350f !important;
    background: rgba(253, 230, 138, 0.6);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82em;
}

.glass-zone-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
}

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: rgba(7, 11, 20, 0.92) !important;
    backdrop-filter: blur(16px);
    border-right: 1px solid rgba(255,255,255,0.06) !important;
}
[data-testid="stSidebar"] > div:first-child {
    padding-top: 1.25rem;
}
.sidebar-brand {
    padding: 0 0.5rem 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sidebar-brand .logo {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #818cf8;
}
.sidebar-brand .name {
    font-size: 1rem;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.02em;
    margin-top: 0.15rem;
}
[data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    color: #64748b !important;
    margin-top: 1rem !important;
}
[data-testid="stSidebar"] label, [data-testid="stSidebar"] .stCaption {
    color: #94a3b8 !important;
    font-size: 0.85rem !important;
}
[data-testid="stSidebar"] .stRadio > label { display: none; }
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    padding: 0.45rem 0.65rem !important;
    border-radius: 8px !important;
    color: #cbd5e1 !important;
    font-weight: 500 !important;
    transition: background 0.15s ease;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
    background: rgba(255,255,255,0.04) !important;
}
[data-testid="stSidebar"] [data-testid="stSelectbox"] > div > div {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
    color: #f1f5f9 !important;
}

/* ── Main content typography ── */
h1, h2, h3, .stSubheader { color: #f8fafc !important; letter-spacing: -0.02em; }
p, .stCaption, label { color: #94a3b8; }
.stAlert { border-radius: 12px !important; border: 1px solid rgba(255,255,255,0.08) !important; }

/* ── Dataframes & expanders ── */
[data-testid="stDataFrame"] {
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    overflow: hidden;
}
[data-testid="stExpander"] {
    background: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(255,255,255,0.07) !important;
    border-radius: 12px !important;
}
[data-testid="stMetric"] {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 0.75rem 1rem;
}
[data-testid="stMetricLabel"] { color: #64748b !important; font-size: 0.75rem !important; }
[data-testid="stMetricValue"] { color: #f8fafc !important; font-weight: 600 !important; }

/* ── Buttons ── */
.stButton > button {
    border-radius: 10px !important;
    border: 1px solid rgba(129, 140, 248, 0.4) !important;
    background: linear-gradient(180deg, rgba(129,140,248,0.25), rgba(99,102,241,0.15)) !important;
    color: #e0e7ff !important;
    font-weight: 600 !important;
    transition: all 0.15s ease !important;
}
.stButton > button:hover {
    border-color: rgba(129, 140, 248, 0.7) !important;
    box-shadow: 0 0 20px rgba(129, 140, 248, 0.2) !important;
}

/* ── Dividers ── */
hr { border-color: rgba(255,255,255,0.06) !important; margin: 1.25rem 0 !important; }
</style>
"""


def apply_glass_theme() -> None:
    st.markdown(GLASS_CSS, unsafe_allow_html=True)


def glass_hero(title: str, subtitle: str, *, eyebrow: str = "Immunology · Rare disease · Quant research") -> None:
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
    st.markdown(
        f'<div class="glass-section"><h2>{safe_t}</h2>{sub_html}</div>',
        unsafe_allow_html=True,
    )


def zone_banner(zone: str, label: str) -> None:
    color = ZONE_COLORS.get(zone, "#94a3b8")
    st.markdown(
        f'<div class="glass-panel" style="border-left: 3px solid {color};">'
        f'<span class="glass-zone-label">{html.escape(zone)}</span><br/>'
        f'<span style="color:#f1f5f9;font-weight:600;font-size:0.9rem;">{html.escape(label)}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def equity_context_card(note: str) -> None:
    st.markdown(
        f'<div class="glass-panel" style="border-left: 3px solid {COLORS["cyan"]};">'
        f'<span class="glass-zone-label">Health equity context</span><br/>'
        f'<span style="color:#cbd5e1;font-size:0.88rem;line-height:1.5;">{html.escape(note)}</span>'
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


def styled_line_chart(fig: go.Figure, *, accent: str = "#818cf8") -> go.Figure:
    """Apply theme plus subtle gradient line styling for primary series."""
    apply_plotly_theme(fig)
    for i, trace in enumerate(fig.data):
        if isinstance(trace, go.Scatter) and trace.mode and "lines" in trace.mode:
            color = PLOTLY_LAYOUT["colorway"][i % len(PLOTLY_LAYOUT["colorway"])]
            fig.data[i].update(
                line=dict(width=2.5, color=color if i else accent, shape="spline"),
                marker=dict(size=5, line=dict(width=1, color="#0f1420")),
            )
    return fig


def styled_bar_chart(fig: go.Figure) -> go.Figure:
    apply_plotly_theme(fig)
    if fig.data:
        fig.data[0].update(marker=dict(line=dict(width=0), opacity=0.88))
    return fig
