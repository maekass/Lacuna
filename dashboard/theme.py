"""
2026 glassmorphism theme: frosted panels, dark gradient canvas, Plotly chart defaults.
"""

from __future__ import annotations

import streamlit as st

GLASS_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

html, body, [data-testid="stAppViewContainer"] {
    font-family: 'DM Sans', system-ui, sans-serif;
}
[data-testid="stAppViewContainer"] {
    background: linear-gradient(145deg, #0b1020 0%, #121a32 40%, #1a2744 70%, #0d1528 100%);
}
[data-testid="stHeader"] { background: transparent; }
.block-container { padding-top: 1.5rem; max-width: 1400px; }

.glass-hero {
    text-align: center;
    margin-bottom: 1.25rem;
    padding: 1.5rem 2rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}
.glass-hero h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(90deg, #7dd3fc, #a78bfa, #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.glass-hero p { color: rgba(226, 232, 240, 0.85); margin: 0.5rem 0 0; font-size: 0.95rem; }

.glass-panel {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}
.glass-disclaimer {
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.35);
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 1.25rem;
    color: #fde68a;
    font-size: 0.88rem;
    line-height: 1.5;
}
.glass-zone-label {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 0.35rem;
}
.glass-metric {
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 12px;
    padding: 0.75rem 1rem;
}

[data-testid="stSidebar"] {
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(14px);
    border-right: 1px solid rgba(255,255,255,0.08);
}
[data-testid="stSidebar"] .stRadio label { color: #e2e8f0 !important; }
h1, h2, h3, .stSubheader { color: #f1f5f9 !important; }
p, .stCaption, label { color: #cbd5e1; }
[data-testid="stExpander"] {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
}
</style>
"""

PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(255,255,255,0.03)",
    font=dict(color="#e2e8f0", family="DM Sans, sans-serif"),
    margin=dict(t=48, b=36, l=48, r=24),
    xaxis=dict(gridcolor="rgba(255,255,255,0.06)", zerolinecolor="rgba(255,255,255,0.1)"),
    yaxis=dict(gridcolor="rgba(255,255,255,0.06)", zerolinecolor="rgba(255,255,255,0.1)"),
    colorway=["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"],
)

ZONE_COLORS = {
    "epidemiology": "#38bdf8",
    "pipeline": "#a78bfa",
    "portfolio": "#34d399",
}


def apply_glass_theme() -> None:
    st.markdown(GLASS_CSS, unsafe_allow_html=True)


def glass_hero(title: str, subtitle: str) -> None:
    st.markdown(
        f'<div class="glass-hero"><h1>{title}</h1><p>{subtitle}</p></div>',
        unsafe_allow_html=True,
    )


def zone_banner(zone: str, label: str) -> None:
    color = ZONE_COLORS.get(zone, "#94a3b8")
    st.markdown(
        f'<div class="glass-panel" style="border-left: 4px solid {color};">'
        f'<span class="glass-zone-label">{zone}</span><br/>'
        f'<span style="color:#f1f5f9;font-weight:600;">{label}</span></div>',
        unsafe_allow_html=True,
    )


def apply_plotly_theme(fig):
    fig.update_layout(**PLOTLY_LAYOUT)
    return fig
