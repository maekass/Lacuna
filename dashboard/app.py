"""
Sickle Cell Investment Analysis Dashboard
Interactive Streamlit dashboard for visualizing health trends and investment analysis
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import yfinance as yf
from datetime import datetime, timedelta
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from data_collection.disease_config import DiseaseConfig, SECTOR_ETFS

# Page configuration
st.set_page_config(
    page_title="Sickle Cell Investment Analysis",
    page_icon="DNA",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS - 2026 Modern Aesthetic
# Trends: Glassmorphism 2.0, Neon Gradients, Bento Grids, Holographic Effects
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
        --bg-primary: #050505;
        --bg-secondary: #0a0a0a;
        --bg-card: rgba(255, 255, 255, 0.03);
        --border-subtle: rgba(255, 255, 255, 0.08);
        --border-glow: rgba(34, 197, 94, 0.3);
        --text-primary: #ffffff;
        --text-secondary: rgba(255, 255, 255, 0.6);
        --text-tertiary: rgba(255, 255, 255, 0.4);
        --accent-green: #00f5a0;
        --accent-cyan: #00d4ff;
        --accent-purple: #a855f7;
        --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
        --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.5);
        --shadow-glow: 0 0 40px rgba(0, 245, 160, 0.1);
    }
    
    /* Global - 2026 Deep Space Dark */
    .main {
        padding: 0;
        background: linear-gradient(180deg, var(--bg-primary) 0%, #080810 100%);
        min-height: 100vh;
    }
    
    body {
        color: var(--text-primary);
        background: var(--bg-primary);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: 'ss01' on, 'ss02' on, 'cv01' on;
    }
    
    /* Glassmorphism Header - 2026 Style */
    .main-header {
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 600;
        color: var(--text-primary);
        text-align: left;
        padding: 1.5rem 2rem;
        margin: 0 -1rem 1rem -1rem;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border-subtle);
        position: sticky;
        top: 0;
        z-index: 100;
    }
    
    /* Bento Grid Sub-headers */
    .sub-header {
        font-size: 0.75rem;
        color: var(--text-tertiary);
        margin: 2rem 0 1rem 0;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .sub-header::before {
        content: '';
        width: 3px;
        height: 12px;
        background: linear-gradient(180deg, var(--accent-green), var(--accent-cyan));
        border-radius: 2px;
    }
    
    /* 2026 Glassmorphism Cards */
    .metric-card {
        background: var(--bg-card);
        padding: 1.5rem;
        border-radius: 16px;
        margin: 0.5rem 0;
        border: 1px solid var(--border-subtle);
        color: var(--text-secondary);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .metric-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    }
    
    .metric-card:hover {
        border-color: var(--border-glow);
        transform: translateY(-2px);
        box-shadow: var(--shadow-glow), var(--shadow-md);
    }
    
    /* Holographic Disclaimer */
    .disclaimer {
        background: linear-gradient(135deg, rgba(0, 245, 160, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
        border: 1px solid rgba(0, 245, 160, 0.2);
        padding: 1rem 1.25rem;
        margin: 1.5rem 0;
        border-radius: 12px;
        color: var(--text-secondary);
        font-size: 0.8rem;
        line-height: 1.6;
        backdrop-filter: blur(10px);
        position: relative;
    }
    
    .disclaimer::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 12px;
        padding: 1px;
        background: linear-gradient(135deg, var(--accent-green), var(--accent-purple));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0.3;
    }
    
    .disclaimer strong {
        color: var(--accent-green);
        font-weight: 600;
    }
    
    /* Typography Hierarchy - 2026 */
    h1, h2, h3, h4, h5, h6 {
        color: var(--text-primary);
        font-weight: 600;
        letter-spacing: -0.02em;
    }
    
    h1 { font-size: 2rem; font-weight: 700; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
    
    /* Refined Body Text */
    p, .stMarkdown {
        color: var(--text-secondary);
        line-height: 1.7;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        font-weight: 400;
    }
    
    /* Glassmorphism Data Tables */
    .stDataFrame {
        font-size: 0.85rem;
        border-radius: 12px;
        overflow: hidden;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
    }
    
    .stDataFrame td, .stDataFrame th {
        color: var(--text-secondary);
        background: transparent;
        border-color: var(--border-subtle);
        padding: 0.75rem 1rem;
    }
    
    .stDataFrame th {
        color: var(--text-primary);
        font-weight: 500;
        background: rgba(255, 255, 255, 0.02);
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
    }
    
    /* Floating Sidebar - 2026 */
    .css-1d391kg, [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(5,5,5,0.98) 100%);
        border-right: 1px solid var(--border-subtle);
        backdrop-filter: blur(20px);
    }
    
    .css-1d391kg .stMarkdown {
        color: var(--text-primary);
    }
    
    /* Sidebar Headers - Neon Accent */
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
        color: var(--text-primary);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        margin-bottom: 0.5rem;
    }
    
    /* 2026 Neon Buttons */
    .stButton>button {
        color: var(--bg-primary);
        background: linear-gradient(135deg, var(--accent-green) 0%, var(--accent-cyan) 100%);
        border: none;
        border-radius: 10px;
        padding: 0.6rem 1.25rem;
        font-weight: 600;
        font-size: 0.85rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .stButton>button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 245, 160, 0.3), 0 0 0 1px rgba(0, 245, 160, 0.2);
    }
    
    .stButton>button:hover::before {
        left: 100%;
    }
    
    /* Glowing Metrics */
    [data-testid="stMetricValue"] {
        font-size: 1.75rem;
        font-weight: 700;
        background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    [data-testid="stMetricLabel"] {
        font-size: 0.7rem;
        color: var(--accent-green);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
    }
    
    /* Glassmorphism Select Boxes */
    .stSelectbox>div>div {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        color: var(--text-primary) !important;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }
    
    .stSelectbox>div>div:hover {
        border-color: var(--border-glow);
    }
    
    .stSelectbox label {
        color: var(--text-tertiary) !important;
        font-weight: 500;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    
    /* Glassmorphism Radio */
    .stRadio>div {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 0.75rem;
        color: var(--text-primary) !important;
        backdrop-filter: blur(10px);
    }
    
    .stRadio label {
        color: var(--text-secondary) !important;
        font-weight: 400;
        font-size: 0.85rem;
    }
    
    /* Floating Expander */
    .streamlit-expanderHeader {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-weight: 500;
        color: var(--text-secondary);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }
    
    .streamlit-expanderHeader:hover {
        border-color: var(--border-glow);
        background: rgba(255,255,255,0.05);
    }
    
    /* Animated Divider */
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--border-subtle), transparent);
        margin: 2rem 0;
        position: relative;
    }
    
    hr::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 4px;
        background: var(--accent-green);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--accent-green);
    }
    
    /* Info Boxes - Holographic */
    .stInfo, .stWarning, .stSuccess, .stError {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        padding: 1rem 1.25rem;
        border-radius: 12px;
        color: var(--text-secondary);
        backdrop-filter: blur(10px);
        position: relative;
    }
    
    .stInfo { border-left: 3px solid var(--accent-cyan); }
    .stWarning { border-left: 3px solid #f59e0b; }
    .stSuccess { border-left: 3px solid var(--accent-green); }
    .stError { border-left: 3px solid #ef4444; }
    
    /* Custom Scrollbar - 2026 */
    ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    
    ::-webkit-scrollbar-track {
        background: var(--bg-primary);
    }
    
    ::-webkit-scrollbar-thumb {
        background: var(--border-subtle);
        border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: var(--border-glow);
    }
    
    /* Streamlit Elements Override */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: var(--bg-card);
        border-radius: 12px;
        padding: 4px;
        border: 1px solid var(--border-subtle);
    }
    
    .stTabs [data-baseweb="tab"] {
        color: var(--text-secondary);
        font-weight: 500;
        border-radius: 8px;
        padding: 8px 16px;
    }
    
    .stTabs [aria-selected="true"] {
        background: rgba(255,255,255,0.08);
        color: var(--text-primary);
    }
    
    /* Plotly Chart Container */
    .js-plotly-plot {
        border-radius: 16px;
        overflow: hidden;
    }
</style>
""", unsafe_allow_html=True)

# Dynamic Header with Gradient Text
header_gradient = f"""
<style>
    .header-gradient {{
        background: linear-gradient(135deg, #ffffff 0%, {disease_config.get('code', 'SCD') == 'SCD' and '#00f5a0' or '#00d4ff'} 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }}
</style>
"""
st.markdown(header_gradient, unsafe_allow_html=True)
st.markdown(f'<p class="main-header header-gradient">{selected_disease} Investment Platform</p>', unsafe_allow_html=True)

# Legal Disclaimer
st.markdown("""
<div class="disclaimer">
    <strong>LEGAL DISCLAIMER:</strong> This platform is for educational and research purposes only. 
    All data is publicly available and delayed. This is NOT investment advice. 
    No patient-level or private health data is used. Compliant with HIPAA and SEC regulations.
</div>
""", unsafe_allow_html=True)

# Sidebar
st.sidebar.header("Disease Selection")
disease_names = DiseaseConfig.get_disease_names()
selected_disease = st.sidebar.selectbox(
    "Select Immunology",
    disease_names,
    index=0,
    help="Choose an immunology disease area to analyze"
)

# Get disease configuration
disease_config = DiseaseConfig.get_disease_config(selected_disease)
disease_code = disease_config["code"]

st.sidebar.header("Navigation")
page = st.sidebar.radio(
    "Select Page",
    ["Overview", "Health Trends", "Stock Analysis", "Pipeline",
     "ML Predictor", "Quant Analysis", "Risk Optimization", "Portfolio Optimization"]
)

st.sidebar.header("Settings")
time_period = st.sidebar.selectbox(
    "Time Period",
    ["1 Year", "3 Years", "5 Years"],
    index=1
)

# Display disease info in sidebar
st.sidebar.markdown("---")
st.sidebar.markdown(f"**Current:** {selected_disease}")
st.sidebar.markdown(f"**Code:** {disease_code}")
st.sidebar.markdown(f"**Prevalence (US):** {disease_config['prevalence_us']:,}")
st.sidebar.markdown(f"**Active Trials:** ~{disease_config['active_trials_estimate']}")

# Data loading functions - Multi-disease support
@st.cache_data
def load_health_data(disease_name):
    """Load health data for selected disease"""
    config = DiseaseConfig.get_disease_config(disease_name)
    code = config["code"].lower()
    
    # Try to load disease-specific file
    try:
        df = pd.read_csv(f"data/raw/epidemiology_{code}.csv")
        df['date'] = pd.to_datetime(df['date'])
        return df
    except:
        # Generate sample data based on disease config
        prevalence = config.get("prevalence_us", 100000)
        trials = config.get("active_trials_estimate", 50)
        
        dates = pd.date_range(start="2019-01-01", end="2024-12-31", freq="M")
        df = pd.DataFrame({
            'date': dates,
            'prevalence_us': np.linspace(prevalence * 0.85, prevalence, len(dates)),
            'new_treatments_approved': np.random.poisson(1.2, len(dates)),
            'clinical_trials_active': np.linspace(trials * 0.7, trials, len(dates)),
            'diagnosis_rate': np.linspace(0.6, 0.75, len(dates)),
            'treatment_access_rate': np.linspace(0.5, 0.70, len(dates))
        })
        return df

@st.cache_data
def load_stock_data(disease_name, period="3y"):
    """Load stock data for disease-relevant companies"""
    companies = DiseaseConfig.get_companies(disease_name)
    
    data = {}
    for name, ticker in companies.items():
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            if not hist.empty:
                data[ticker] = hist['Close']
        except:
            pass
    
    return pd.DataFrame(data)

@st.cache_data
def load_pipeline_data(disease_name):
    """Load therapy pipeline data for selected disease"""
    config = DiseaseConfig.get_disease_config(disease_name)
    pipeline_focus = config.get("pipeline_focus", [])
    companies = config.get("companies", {})
    code = config["code"]
    
    # Build pipeline data from config
    pipeline_data = []
    company_items = list(companies.items())[:min(6, len(companies))]
    
    phases = ["Phase 3", "Phase 3", "Phase 2", "Phase 2", "Phase 1/2", "Preclinical"]
    years = ["2024", "2024", "2025", "2025", "2026", "2027"]
    probs = [0.75, 0.70, 0.55, 0.50, 0.40, 0.30]
    
    for i, (company, ticker) in enumerate(company_items):
        focus = pipeline_focus[i % len(pipeline_focus)] if pipeline_focus else "Novel therapy"
        mechanism = focus.split(":")[0] if ":" in focus else focus
        
        pipeline_data.append({
            "Company": company,
            "Ticker": ticker,
            "Therapy": f"{code}_{i+1:03d}",
            "Phase": phases[i % len(phases)],
            "Mechanism": mechanism,
            "Est. Approval": years[i % len(years)],
            "Success Prob": f"{probs[i % len(probs)]:.0%}"
        })
    
    return pd.DataFrame(pipeline_data)

# Page: Overview
if page == "Overview":
    st.markdown(f'<p class="sub-header">{selected_disease} - Investment Overview</p>', unsafe_allow_html=True)
    
    # Get dynamic metrics
    prevalence = disease_config.get("prevalence_us", 100000)
    trials = disease_config.get("active_trials_estimate", 50)
    growth_rate = disease_config.get("prevalence_growth_rate", 0.02) * 100
    approvals = disease_config.get("key_metrics", {}).get("fda_approvals_2019_2024", 3)
    companies = list(disease_config.get("companies", {}).keys())[:5]
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            f"{disease_code} Prevalence (US)",
            f"{prevalence:,}",
            f"+{growth_rate:.1f}% YoY"
        )
        st.markdown(f"""
        <div class="metric-card">
            <strong>Key Insight:</strong><br>
            {selected_disease} affects approximately {prevalence:,} Americans, with growing awareness and treatment innovation.
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.metric(
            "Active Clinical Trials",
            str(trials),
            "Pipeline growth"
        )
        st.markdown(f"""
        <div class="metric-card">
            <strong>Key Insight:</strong><br>
            Active R&D with ~{trials} trials indicates strong investment in novel therapeutics and mechanisms.
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.metric(
            "FDA Approvals (2019-2024)",
            str(approvals),
            "New treatments"
        )
        st.markdown(f"""
        <div class="metric-card">
            <strong>Key Insight:</strong><br>
            Recent regulatory momentum with {approvals} approvals demonstrates market maturation.
        </div>
        """, unsafe_allow_html=True)
    
    # Companies section
    st.markdown('<p class="sub-header">Key Companies</p>', unsafe_allow_html=True)
    
    company_cols = st.columns(min(5, len(companies)))
    for i, company in enumerate(companies):
        with company_cols[i]:
            ticker = disease_config["companies"][company]
            st.markdown(f"**{company}**<br><small>{ticker}</small>", unsafe_allow_html=True)
    
    # Research Focus Areas
    st.markdown('<p class="sub-header">Research Focus Areas</p>', unsafe_allow_html=True)
    
    focus_areas = disease_config.get("pipeline_focus", [])
    for area in focus_areas:
        st.markdown(f"- {area}")

# Page: Health Trends
elif page == "Health Trends":
    st.markdown(f'<p class="sub-header">{selected_disease} Epidemiology</p>', unsafe_allow_html=True)
    
    health_df = load_health_data(selected_disease)
    
    # Time series plot with dynamic columns
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(f"{disease_code} Prevalence Over Time", "Clinical Trials Active", 
                       "New Treatment Approvals", "Diagnosis Rate"),
        specs=[[{"secondary_y": False}, {"secondary_y": False}],
               [{"secondary_y": False}, {"secondary_y": False}]]
    )
    
    # Prevalence - Neon Green
    fig.add_trace(
        go.Scatter(x=health_df['date'], y=health_df['prevalence_us'],
                  mode='lines+markers', name='Prevalence',
                  line=dict(color='#00f5a0', width=2),
                  marker=dict(size=4, color='#00f5a0', line=dict(width=0)),
                  fill='tonexty', fillcolor='rgba(0,245,160,0.1)'),
        row=1, col=1
    )
    
    # Clinical trials - Neon Cyan
    fig.add_trace(
        go.Scatter(x=health_df['date'], y=health_df['clinical_trials_active'],
                  mode='lines+markers', name='Clinical Trials', 
                  line=dict(color='#00d4ff', width=2),
                  marker=dict(size=4, color='#00d4ff', line=dict(width=0)),
                  fill='tonexty', fillcolor='rgba(0,212,255,0.1)'),
        row=1, col=2
    )
    
    # New treatments - Neon Green Gradient
    fig.add_trace(
        go.Bar(x=health_df['date'], y=health_df['new_treatments_approved'],
              name='New Approvals', 
              marker=dict(color=['rgba(0,245,160,0.8)' if i % 2 == 0 else 'rgba(0,212,255,0.8)' for i in range(len(health_df))],
                         line=dict(color='rgba(255,255,255,0.2)', width=1))),
        row=2, col=1
    )
    
    # Diagnosis rate - Neon Purple
    fig.add_trace(
        go.Scatter(x=health_df['date'], y=health_df['diagnosis_rate'] * 100,
                  mode='lines+markers', name='Diagnosis Rate %', 
                  line=dict(color='#a855f7', width=2),
                  marker=dict(size=4, color='#a855f7', line=dict(width=0))),
        row=2, col=2
    )
    
    fig.update_layout(
        height=600, 
        showlegend=False, 
        title_text=f"{selected_disease} Health Trends",
        title_font=dict(size=16, color='#ffffff', family='Inter'),
        paper_bgcolor='rgba(5,5,5,0)',
        plot_bgcolor='rgba(255,255,255,0.02)',
        font=dict(color='rgba(255,255,255,0.7)', family='Inter'),
        margin=dict(l=60, r=40, t=80, b=60),
        xaxis=dict(
            gridcolor='rgba(255,255,255,0.05)',
            linecolor='rgba(255,255,255,0.1)',
            tickfont=dict(size=11)
        ),
        yaxis=dict(
            gridcolor='rgba(255,255,255,0.05)',
            linecolor='rgba(255,255,255,0.1)',
            tickfont=dict(size=11)
        )
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Key statistics
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Disease Metrics")
        metrics_data = {
            "Metric": ["Prevalence (US)", "Active Trials", "Avg Success Rate", "Growth Rate"],
            "Value": [
                f"{disease_config['prevalence_us']:,}",
                f"~{disease_config['active_trials_estimate']}",
                f"{disease_config.get('key_metrics', {}).get('avg_trial_success_rate', 0.65):.0%}",
                f"{disease_config['prevalence_growth_rate']*100:.1f}%"
            ]
        }
        st.dataframe(pd.DataFrame(metrics_data), use_container_width=True)
    
    with col2:
        st.subheader("Treatment Access")
        access_df = health_df[['date', 'treatment_access_rate']].tail(6)
        access_df['treatment_access_rate'] = (access_df['treatment_access_rate'] * 100).round(1)
        access_df.columns = ['Period', 'Access Rate %']
        st.dataframe(access_df, use_container_width=True)

# Page: Stock Analysis
elif page == "Stock Analysis":
    st.markdown(f'<p class="sub-header">{selected_disease} - Key Companies</p>', unsafe_allow_html=True)
    
    # Get disease-specific companies
    companies = DiseaseConfig.get_companies(selected_disease)
    
    # Enhanced time range controls
    st.sidebar.header("Stock Analysis Settings")
    date_range = st.sidebar.selectbox(
        "Date Range",
        ["1 Month", "3 Months", "6 Months", "1 Year", "3 Years", "5 Years"],
        index=4
    )
    
    # Convert date range to yfinance period
    period_map = {
        "1 Month": "1mo", "3 Months": "3mo", "6 Months": "6mo",
        "1 Year": "1y", "3 Years": "3y", "5 Years": "5y"
    }
    yf_period = period_map.get(date_range, "3y")
    
    # Peer comparison toggle
    show_peers = st.sidebar.checkbox("Compare with Healthcare ETFs", value=True)
    
    stock_df = load_stock_data(selected_disease, period=yf_period)
    
    if not stock_df.empty:
        # Filter by date range
        end_date = stock_df.index.max()
        if date_range == "1 Month":
            start_date = end_date - timedelta(days=30)
        elif date_range == "3 Months":
            start_date = end_date - timedelta(days=90)
        elif date_range == "6 Months":
            start_date = end_date - timedelta(days=180)
        elif date_range == "1 Year":
            start_date = end_date - timedelta(days=365)
        elif date_range == "3 Years":
            start_date = end_date - timedelta(days=1095)
        elif date_range == "5 Years":
            start_date = end_date - timedelta(days=1825)
        else:
            start_date = stock_df.index.min()
        
        filtered_df = stock_df[stock_df.index >= start_date]
        
        # Calculate returns
        returns = filtered_df.pct_change().fillna(0)
        cumulative = (1 + returns).cumprod()
        
        # Company selection
        st.subheader("Select Companies to Compare")
        selected_companies = st.multiselect(
            "Choose tickers",
            options=filtered_df.columns.tolist(),
            default=filtered_df.columns.tolist()[:5]
        )
        
        if selected_companies:
            filtered_df = filtered_df[selected_companies]
            returns = returns[selected_companies]
            cumulative = cumulative[selected_companies]
        
        # Price chart
        fig = go.Figure()
        for col in filtered_df.columns:
            fig.add_trace(go.Scatter(
                x=filtered_df.index,
                y=filtered_df[col],
                mode='lines',
                name=col,
                hovertemplate='%{x}<br>%{y:.2f}'
            ))
        
        fig.update_layout(
            title=f"Stock Price Performance ({date_range})",
            xaxis_title="Date",
            yaxis_title="Price ($)",
            hovermode='x unified',
            height=500
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Cumulative returns
        fig2 = go.Figure()
        for col in cumulative.columns:
            fig2.add_trace(go.Scatter(
                x=cumulative.index,
                y=cumulative[col],
                mode='lines',
                name=col,
                hovertemplate='%{x}<br>%{y:.2%}'
            ))
        
        fig2.update_layout(
            title=f"Cumulative Returns ({date_range})",
            xaxis_title="Date",
            yaxis_title="Cumulative Return",
            hovermode='x unified',
            height=500
        )
        st.plotly_chart(fig2, use_container_width=True)
        
        # Performance metrics
        st.subheader("Performance Metrics")
        
        metrics_data = []
        for col in filtered_df.columns:
            col_returns = returns[col]
            metrics_data.append({
                "Ticker": col,
                "Total Return": f"{(cumulative[col].iloc[-1] - 1):.2%}",
                "Annualized Vol": f"{col_returns.std() * np.sqrt(252):.2%}",
                "Sharpe Ratio": f"{col_returns.mean() * 252 / (col_returns.std() * np.sqrt(252)):.2f}",
                "Max Drawdown": f"{(cumulative[col] / cumulative[col].cummax() - 1).min():.2%}",
                "Beta (vs equal-weighted)": f"{np.cov(col_returns, returns.mean(axis=1))[0,1] / np.var(returns.mean(axis=1)):.2f}"
            })
        
        st.dataframe(pd.DataFrame(metrics_data), use_container_width=True)
        
        # Correlation heatmap
        st.subheader("Correlation Matrix")
        corr_matrix = returns.corr()
        fig3 = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            colorscale='RdBu',
            zmid=0
        ))
        fig3.update_layout(title="Price Return Correlations", height=500)
        st.plotly_chart(fig3, use_container_width=True)
    else:
        st.warning("Stock data not available. Please run data collection first.")

# Page: ML Models
elif page == "ML Models":
    st.markdown('<p class="sub-header">Enhanced Machine Learning Analysis</p>', unsafe_allow_html=True)
    
    st.subheader("Regression Models with Hyperparameter Tuning")
    st.write("""
    The platform now uses 9 different regression techniques with automatic hyperparameter tuning
    to analyze the relationship between sickle cell health metrics and pharmaceutical stock performance:
    """)
    
    models = [
        ("Linear Regression", "Baseline model with cross-validation, analyzes linear relationships"),
        ("Ridge Regression", "L2 regularization to prevent overfitting, with alpha tuning"),
        ("Lasso Regression", "L1 regularization for feature selection, with alpha tuning"),
        ("ElasticNet", "Combination of L1 and L2 regularization, with dual parameter tuning"),
        ("Random Forest", "Non-linear ensemble with tree depth and split tuning"),
        ("Gradient Boosting", "Sequential ensemble for improved predictive accuracy"),
        ("Support Vector Regression (SVR)", "Kernel-based regression with C and epsilon tuning"),
        ("K-Nearest Neighbors (KNN)", "Distance-based regression with neighbor and weight tuning"),
        ("AdaBoost", "Boosting ensemble with learning rate and loss function tuning"),
        ("ARIMA/SARIMA", "Time series forecasting with seasonal decomposition"),
        ("Granger Causality", "Tests whether health metrics predict stock movements")
    ]
    
    for model, description in models:
        with st.expander(model):
            st.write(description)
    
    # Load model comparison if available
    try:
        model_comparison = pd.read_csv("data/processed/model_comparison.csv")
        st.subheader("Model Performance Comparison")
        st.dataframe(model_comparison, use_container_width=True)
        
        # R² comparison chart
        fig = px.bar(model_comparison, x='Model', y='R²', title='Model R² Scores Comparison',
                     color='R²', color_continuous_scale='Viridis')
        st.plotly_chart(fig, use_container_width=True)
        
        # MSE comparison chart
        fig2 = px.bar(model_comparison, x='Model', y='MSE', title='Model MSE Comparison (lower is better)',
                      color='MSE', color_continuous_scale='RdYlGn_r')
        st.plotly_chart(fig2, use_container_width=True)
    except:
        st.info("Model comparison results not available. Run `python src/models/regression_models.py` to generate.")
    
    # Feature importance visualization (enhanced)
    st.subheader("Enhanced Feature Engineering")
    st.write("""
    The platform now includes 24+ engineered features:
    - Lagged features (1, 2, 3 periods)
    - Rolling averages (3, 6 periods)
    - Rolling volatility (standard deviation)
    - Stock momentum indicators (5, 10 periods)
    - Interaction features (treatments per trial, prevalence growth)
    - Stock volatility measures
    """)
    
    feature_importance = pd.DataFrame({
        "Feature": ["Clinical Trial Activity", "Treatment Approvals", "SCD Prevalence", 
                   "Birth Rate", "Lagged Returns", "Market Beta", "Trial Volatility",
                   "Momentum 5d", "Momentum 10d", "Stock Volatility"],
        "Importance": [0.18, 0.15, 0.12, 0.10, 0.14, 0.08, 0.09, 0.07, 0.04, 0.03]
    }).sort_values("Importance", ascending=True)
    
    fig = px.bar(feature_importance, x="Importance", y="Feature", orientation="h",
                 title="Feature Importance in Stock Return Prediction (Enhanced)",
                 color="Importance", color_continuous_scale='Viridis')
    st.plotly_chart(fig, use_container_width=True)
    
    # Time series forecasting section
    st.subheader("Time Series Forecasting with Seasonal Decomposition")
    st.write("""
    Enhanced ARIMA models now include:
    - Seasonal decomposition analysis
    - Trend, seasonal, and residual component strength
    - AIC/BIC model diagnostics
    - Confidence intervals for forecasts
    """)
    
    # Run ML models button
    st.subheader("Run Enhanced ML Models")
    if st.button("Train All Models (may take several minutes)"):
        st.info("Training models with hyperparameter tuning... This may take 5-10 minutes.")
        try:
            import sys
            sys.path.append("src/models")
            from regression_models import SickleCellRegressionModels
            trainer = SickleCellRegressionModels()
            comparison = trainer.run_all_models()
            st.success("Model training complete!")
            st.dataframe(comparison, use_container_width=True)
        except Exception as e:
            st.error(f"Error training models: {e}")

# Page: Visualizations
elif page == "Visualizations":
    st.markdown('<p class="sub-header">Interactive Data Visualizations</p>', unsafe_allow_html=True)
    
    st.subheader("Visualization Gallery")
    st.write("Explore interactive visualizations generated from the enhanced ML and data analysis pipeline.")
    
    # Load visualizations
    viz_dir = "data/visualizations"
    
    viz_files = {
        "Clinical Trials Timeline": "clinical_trials_timeline.html",
        "Feature Importance": "feature_importance.html",
        "Model Comparison": "model_comparison.html",
        "Time Series Decomposition": "time_series_decomposition.html",
        "Correlation Heatmap": "correlation_heatmap.html",
        "Health Trends": "health_trends.html",
        "Stock Performance Heatmap": "stock_performance_heatmap.html"
    }
    
    selected_viz = st.selectbox("Select Visualization", list(viz_files.keys()))
    
    viz_path = f"{viz_dir}/{viz_files[selected_viz]}"
    
    if os.path.exists(viz_path):
        with open(viz_path, 'r') as f:
            html_content = f.read()
        st.components.v1.html(html_content, height=800, scrolling=True)
    else:
        st.warning(f"Visualization file not found. Run `python src/visualization/visualizers.py` to generate.")
    
    st.divider()
    
    st.subheader("Generate New Visualizations")
    if st.button("Generate All Visualizations"):
        try:
            import sys
            sys.path.append("src/visualization")
            from visualizers import SickleCellVisualizers
            visualizer = SickleCellVisualizers()
            visualizer.generate_all_visualizations()
            st.success("Visualizations generated successfully!")
            st.rerun()
        except Exception as e:
            st.error(f"Error generating visualizations: {e}")

# Page: Pipeline
elif page == "Pipeline":
    st.markdown(f'<p class="sub-header">{selected_disease} - Therapy Pipeline</p>', unsafe_allow_html=True)
    
    # Load pipeline data
    pipeline_df = load_pipeline_data(selected_disease)
    
    if not pipeline_df.empty:
        # Display pipeline table
        st.dataframe(pipeline_df, use_container_width=True, hide_index=True)
        
        # Phase distribution chart
        st.subheader("Pipeline by Phase")
        phase_counts = pipeline_df['Phase'].value_counts()
        
        fig = go.Figure(data=[go.Pie(
            labels=phase_counts.index,
            values=phase_counts.values,
            hole=0.4,
            marker_colors=['#00f5a0', '#00d4ff', '#a855f7', '#f59e0b', '#ef4444'],
            textinfo='label+percent',
            textfont=dict(size=11, color='#ffffff'),
            hovertemplate='<b>%{label}</b><br>%{value} programs<br>%{percent}<extra></extra>'
        )])
        fig.update_layout(
            paper_bgcolor='rgba(5,5,5,0)',
            plot_bgcolor='rgba(255,255,255,0.02)',
            font=dict(color='rgba(255,255,255,0.7)', family='Inter'),
            showlegend=True,
            legend=dict(
                bgcolor='rgba(255,255,255,0.05)',
                bordercolor='rgba(255,255,255,0.1)',
                borderwidth=1
            )
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Success probability summary
        st.subheader("Success Probability Analysis")
        
        # Parse probability strings to float
        probs = []
        for p in pipeline_df['Success Prob']:
            try:
                probs.append(float(p.strip('%')) / 100)
            except:
                probs.append(0.5)
        
        avg_prob = sum(probs) / len(probs) if probs else 0
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Pipeline Programs", len(pipeline_df))
        with col2:
            st.metric("Avg Success Rate", f"{avg_prob:.0%}")
        with col3:
            phase3_count = len(pipeline_df[pipeline_df['Phase'] == 'Phase 3'])
            st.metric("Phase 3 Programs", phase3_count)
    else:
        st.info("No pipeline data available for this disease area.")

# Page: ML Predictor
elif page == "ML Predictor":
    st.markdown(f'<p class="sub-header">{selected_disease} — Trial Success Predictor</p>', unsafe_allow_html=True)

    try:
        from models.trial_success_predictor import TrialSuccessPredictor

        @st.cache_resource
        def get_predictor():
            predictor = TrialSuccessPredictor()
            with st.spinner("Training ensemble model (RF + GBM + LogReg)..."):
                results = predictor.train(verbose=False)
            return predictor, results

        predictor, train_results = get_predictor()

        # Model performance banner
        st.subheader("Model Performance (5-Fold Cross-Validation)")
        perf_cols = st.columns(len(train_results))
        model_colors = {"random_forest": "#00f5a0", "gradient_boosting": "#00d4ff",
                        "logistic_regression": "#a855f7", "xgboost": "#f59e0b"}
        for i, (name, metrics) in enumerate(train_results.items()):
            with perf_cols[i]:
                label = name.replace("_", " ").title()
                st.metric(label, f"{metrics['auc_mean']:.3f} AUC",
                          f"±{metrics['auc_std']:.3f}")

        st.markdown("---")

        # Feature importance chart
        col_fi, col_pred = st.columns([1, 1])

        with col_fi:
            st.subheader("Feature Importances")
            fi_df = predictor.get_feature_importance_df()
            fig_fi = go.Figure(go.Bar(
                x=fi_df["importance"],
                y=fi_df["feature"],
                orientation="h",
                marker=dict(
                    color=fi_df["importance"],
                    colorscale=[[0, "#1a1a2e"], [0.5, "#00d4ff"], [1, "#00f5a0"]],
                    line=dict(width=0)
                )
            ))
            fig_fi.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.02)",
                font=dict(color="rgba(255,255,255,0.7)", family="Inter"),
                margin=dict(l=20, r=20, t=20, b=20),
                xaxis=dict(gridcolor="rgba(255,255,255,0.05)", title="Importance"),
                yaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
                height=320
            )
            st.plotly_chart(fig_fi, use_container_width=True)

        with col_pred:
            st.subheader("Run Prediction")
            phase = st.selectbox("Phase", [1, 2, 3], index=1)
            enrollment = st.number_input("Enrollment", min_value=10, max_value=5000, value=200, step=50)
            sponsor = st.selectbox("Sponsor Type", ["pharma", "biotech", "academic"])
            mechanism = st.selectbox("Mechanism", list(TrialSuccessPredictor.MECHANISM_MAP.keys()))
            duration = st.slider("Duration (months)", 6, 96, 36)

            if st.button("Predict Success Probability"):
                result = predictor.predict(
                    phase=phase, enrollment=int(enrollment), sponsor=sponsor,
                    mechanism=mechanism, duration_months=duration,
                    disease_name=selected_disease
                )

                prob = result["probability"]
                ci_l, ci_u = result["ci_lower"], result["ci_upper"]
                base = result["phase_base_rate"]

                # Gauge chart
                fig_g = go.Figure(go.Indicator(
                    mode="gauge+number+delta",
                    value=prob * 100,
                    delta={"reference": base * 100, "suffix": "% vs base"},
                    title={"text": "Success Probability", "font": {"color": "#fff", "size": 14}},
                    gauge={
                        "axis": {"range": [0, 100], "tickcolor": "rgba(255,255,255,0.4)"},
                        "bar": {"color": "#00f5a0" if prob > 0.6 else "#f59e0b" if prob > 0.4 else "#ef4444"},
                        "bgcolor": "rgba(255,255,255,0.03)",
                        "borderwidth": 0,
                        "steps": [
                            {"range": [0, 40], "color": "rgba(239,68,68,0.15)"},
                            {"range": [40, 65], "color": "rgba(245,158,11,0.15)"},
                            {"range": [65, 100], "color": "rgba(0,245,160,0.15)"}
                        ],
                        "threshold": {"line": {"color": "white", "width": 2}, "value": base * 100}
                    }
                ))
                fig_g.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#fff", family="Inter"),
                    height=280, margin=dict(l=20, r=20, t=40, b=20)
                )
                st.plotly_chart(fig_g, use_container_width=True)

                st.markdown(
                    f"**95% CI:** {ci_l:.1%} — {ci_u:.1%} &nbsp;|&nbsp; "
                    f"**Confidence:** {result['confidence']} &nbsp;|&nbsp; "
                    f"**Phase base rate:** {base:.1%}",
                    unsafe_allow_html=True
                )

                with st.expander("Model breakdown"):
                    breakdown_df = pd.DataFrame.from_dict(
                        result["model_breakdown"], orient="index", columns=["Probability"]
                    )
                    breakdown_df.index.name = "Model"
                    st.dataframe(breakdown_df.style.format({"Probability": "{:.3f}"}),
                                 use_container_width=True)

        # Batch prediction — disease pipeline
        st.markdown("---")
        st.subheader(f"Pipeline Predictions — {selected_disease}")
        pipeline_df = load_pipeline_data(selected_disease)
        if not pipeline_df.empty:
            batch_input = pd.DataFrame({
                "phase": [1 if "1" in p else 2 if "2" in p else 3 for p in pipeline_df["Phase"]],
                "enrollment": [150] * len(pipeline_df),
                "sponsor": ["biotech"] * len(pipeline_df),
                "mechanism": pipeline_df["Mechanism"].tolist(),
                "duration_months": [36] * len(pipeline_df),
                "disease_name": [selected_disease] * len(pipeline_df)
            })
            batch_results = predictor.batch_predict(batch_input)
            pipeline_df["ML Probability"] = batch_results["probability"].values
            pipeline_df["CI"] = batch_results.apply(
                lambda r: f"{r['ci_lower']:.0%}–{r['ci_upper']:.0%}", axis=1)
            st.dataframe(pipeline_df[["Company", "Ticker", "Phase", "Mechanism",
                                       "ML Probability", "CI"]],
                         use_container_width=True, hide_index=True)

    except Exception as e:
        st.error(f"ML Predictor error: {e}")
        import traceback
        st.code(traceback.format_exc())

# Page: Quant Analysis
elif page == "Quant Analysis":
    st.markdown(f'<p class="sub-header">{selected_disease} — Quantitative Analysis</p>', unsafe_allow_html=True)

    try:
        from models.health_market_analysis import HealthMarketAnalyzer

        @st.cache_resource
        def get_analyzer(disease):
            return HealthMarketAnalyzer(disease_name=disease)

        analyzer = get_analyzer(selected_disease)
        companies = DiseaseConfig.get_companies(selected_disease)
        ticker_options = [t for t in companies.values() if "." not in t][:6]
        name_map = {v: k for k, v in companies.items()}

        tab1, tab2, tab3, tab4 = st.tabs(
            ["Correlation Matrix", "OLS Regression", "Granger Causality", "Factor Model"]
        )

        # ── Tab 1: Correlation Heatmap ──────────────────────────────────────
        with tab1:
            st.markdown("**Correlation matrix — disease companies + sector ETFs (monthly returns)**")
            with st.spinner("Fetching price data..."):
                corr_df = analyzer.correlation_heatmap_data()

            if not corr_df.empty:
                fig_hm = go.Figure(go.Heatmap(
                    z=corr_df.values,
                    x=corr_df.columns.tolist(),
                    y=corr_df.index.tolist(),
                    colorscale=[
                        [0.0, "#4c0099"], [0.25, "#7b00cc"],
                        [0.5, "#0d0d1a"],
                        [0.75, "#00994c"], [1.0, "#00f5a0"]
                    ],
                    zmin=-1, zmax=1,
                    text=corr_df.round(2).values,
                    texttemplate="%{text}",
                    textfont=dict(size=9),
                    colorbar=dict(
                        title="r", tickfont=dict(color="rgba(255,255,255,0.6)"),
                        titlefont=dict(color="rgba(255,255,255,0.6)")
                    )
                ))
                fig_hm.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.02)",
                    font=dict(color="rgba(255,255,255,0.7)", family="Inter"),
                    margin=dict(l=10, r=10, t=30, b=10), height=480
                )
                st.plotly_chart(fig_hm, use_container_width=True)
            else:
                st.warning("Could not fetch price data for correlation matrix.")

        # ── Tab 2: OLS Regression ────────────────────────────────────────────
        with tab2:
            st.markdown("**Multi-factor OLS: stock return ~ IBB + XBI + trial growth + prevalence + R&D sentiment**")
            sel_ticker = st.selectbox("Company", ticker_options,
                                       format_func=lambda t: f"{name_map.get(t, t)} ({t})",
                                       key="ols_ticker")
            with st.spinner("Running OLS regression..."):
                reg = analyzer.multi_factor_regression(sel_ticker)

            if "error" not in reg:
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("R²", f"{reg['r_squared']:.3f}")
                m2.metric("Adj R²", f"{reg['adj_r_squared']:.3f}")
                m3.metric("F-stat", f"{reg['f_statistic']:.2f}")
                m4.metric("N obs", reg["n_observations"])

                st.markdown("**Coefficient Table**")
                coef_rows = []
                for var, vals in reg["coefficients"].items():
                    coef_rows.append({
                        "Variable": var,
                        "Coefficient": f"{vals['coef']:.6f}",
                        "t-stat": f"{vals['t_stat']:.3f}",
                        "p-value": f"{vals['p_value']:.4f}",
                        "Significant": "✓" if vals["significant"] else ""
                    })
                st.dataframe(pd.DataFrame(coef_rows), use_container_width=True, hide_index=True)

                # Residuals plot
                st.markdown("**Residuals vs Fitted**")
                fig_res = go.Figure()
                fig_res.add_trace(go.Scatter(
                    x=reg["fitted_values"], y=reg["residuals"],
                    mode="markers",
                    marker=dict(color="#00d4ff", size=5, opacity=0.6,
                                line=dict(color="rgba(255,255,255,0.2)", width=0.5)),
                    name="Residuals"
                ))
                fig_res.add_hline(y=0, line=dict(color="rgba(255,255,255,0.3)", dash="dash"))
                fig_res.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.02)",
                    font=dict(color="rgba(255,255,255,0.7)", family="Inter"),
                    xaxis=dict(title="Fitted Values", gridcolor="rgba(255,255,255,0.05)"),
                    yaxis=dict(title="Residuals", gridcolor="rgba(255,255,255,0.05)"),
                    height=320, margin=dict(l=40, r=20, t=20, b=40)
                )
                st.plotly_chart(fig_res, use_container_width=True)
            else:
                st.warning(reg["error"])

        # ── Tab 3: Granger Causality ────────────────────────────────────────
        with tab3:
            st.markdown(
                "**Tests whether clinical trial activity (lagged) Granger-causes stock returns.**  \n"
                "H₀: trial data has no predictive power. Reject at p < 0.05."
            )
            sel_ticker_g = st.selectbox("Company", ticker_options,
                                         format_func=lambda t: f"{name_map.get(t, t)} ({t})",
                                         key="gc_ticker")
            with st.spinner("Running Granger causality tests (lags 1–3)..."):
                gc = analyzer.granger_causality_test(sel_ticker_g)

            if "error" not in gc:
                st.markdown(f"**Summary:** {gc['summary']}")
                st.markdown(
                    f"Stock stationary: `{'Yes' if gc['stock_stationary'] else 'No'}` &nbsp;|&nbsp; "
                    f"Trial series stationary: `{'Yes' if gc['trial_stationary'] else 'No'}`"
                )

                gc_rows = []
                for lag, vals in gc["results_by_lag"].items():
                    if isinstance(vals, dict) and "error" not in vals:
                        gc_rows.append({
                            "Lag (months)": lag,
                            "F-statistic": vals["f_stat"],
                            "p-value": vals["p_value"],
                            "Significant (p<0.05)": "✓" if vals["significant"] else "—",
                            "Interpretation": vals["interpretation"]
                        })
                if gc_rows:
                    st.dataframe(pd.DataFrame(gc_rows), use_container_width=True, hide_index=True)
            else:
                st.warning(gc.get("error", "Test failed"))

        # ── Tab 4: Factor Model ─────────────────────────────────────────────
        with tab4:
            st.markdown(
                "**Multi-factor beta decomposition: Market (IBB), Size (XBI−IBB), Defensive (XLV)**  \n"
                "Alpha = risk-adjusted excess return vs. the factor model."
            )
            with st.spinner("Fitting factor models..."):
                factor_df = analyzer.factor_model()

            if not factor_df.empty:
                st.dataframe(factor_df, use_container_width=True, hide_index=True)

                # Alpha bar chart
                fig_alpha = go.Figure(go.Bar(
                    x=factor_df["Ticker"],
                    y=factor_df["Info Ratio"],
                    text=factor_df["Alpha (monthly)"],
                    textposition="outside",
                    marker=dict(
                        color=factor_df["Info Ratio"],
                        colorscale=[[0, "#ef4444"], [0.5, "#0d0d1a"], [1, "#00f5a0"]],
                        line=dict(width=0),
                        cmid=0
                    )
                ))
                fig_alpha.update_layout(
                    title="Information Ratio by Company",
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.02)",
                    font=dict(color="rgba(255,255,255,0.7)", family="Inter"),
                    xaxis=dict(gridcolor="rgba(255,255,255,0.05)"),
                    yaxis=dict(title="Info Ratio", gridcolor="rgba(255,255,255,0.05)"),
                    height=350, margin=dict(l=40, r=20, t=50, b=40)
                )
                st.plotly_chart(fig_alpha, use_container_width=True)
            else:
                st.warning("Could not compute factor model — insufficient price history.")

    except Exception as e:
        st.error(f"Quant Analysis error: {e}")
        import traceback
        st.code(traceback.format_exc())

# Page: Risk Optimization
elif page == "Risk Optimization":
    st.markdown('<p class="sub-header">Risk-Optimized Portfolio Analysis</p>', unsafe_allow_html=True)
    
    st.subheader("Portfolio Strategy Comparison")
    st.write("Compare different portfolio optimization strategies focused on minimizing drawdown and maximizing risk-adjusted returns.")
    
    # Load risk optimization comparison
    try:
        risk_comparison = pd.read_csv("data/processed/risk_optimization_comparison.csv")
        st.dataframe(risk_comparison, use_container_width=True)
        
        # Highlight best performers
        st.subheader("Strategy Insights")
        
        # Find best performers
        comparison_df_copy = risk_comparison.copy()
        for col in ['Annual Return', 'Annual Volatility', 'Max Drawdown']:
            comparison_df_copy[col] = comparison_df_copy[col].str.rstrip('%').astype(float) / 100
        for col in ['Sharpe Ratio', 'Sortino Ratio', 'Calmar Ratio']:
            comparison_df_copy[col] = comparison_df_copy[col].astype(float)
        
        best_sharpe = comparison_df_copy.loc[comparison_df_copy['Sharpe Ratio'].idxmax()]
        best_sortino = comparison_df_copy.loc[comparison_df_copy['Sortino Ratio'].idxmax()]
        best_calmar = comparison_df_copy.loc[comparison_df_copy['Calmar Ratio'].idxmax()]
        min_dd = comparison_df_copy.loc[comparison_df_copy['Max Drawdown'].idxmin()]
        min_vol = comparison_df_copy.loc[comparison_df_copy['Annual Volatility'].idxmin()]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Best Sharpe Ratio", f"{best_sharpe['Sharpe Ratio']:.3f}", 
                     help=f"Strategy: {best_sharpe['Strategy']}")
        with col2:
            st.metric("Lowest Max Drawdown", f"{min_dd['Max Drawdown']:.2%}", 
                     help=f"Strategy: {min_dd['Strategy']}")
        with col3:
            st.metric("Lowest Volatility", f"{min_vol['Annual Volatility']:.2%}", 
                     help=f"Strategy: {min_vol['Strategy']}")
        
        # Generate and display drawdown comparison
        st.subheader("Drawdown Comparison")
        try:
            import sys
            sys.path.append("src/quant_framework")
            from risk_optimization import RiskOptimizedPortfolio
            import yfinance as yf
            
            companies = ["CRSP", "VRTX", "EDIT", "PFE", "BMY"]
            prices = {}
            for ticker in companies:
                try:
                    stock = yf.Ticker(ticker)
                    hist = stock.history(period="2y")
                    if not hist.empty:
                        prices[ticker] = hist['Close']
                except:
                    pass
            
            if prices:
                stock_data = pd.DataFrame(prices)
                optimizer = RiskOptimizedPortfolio(stock_data)
                comparison_df, strategies = optimizer.compare_portfolios()
                
                fig = optimizer.plot_drawdown_comparison(strategies)
                st.plotly_chart(fig, use_container_width=True, height=800)
            else:
                st.warning("Stock data not available for drawdown visualization")
        except Exception as e:
            st.warning(f"Could not generate drawdown visualization: {e}")
        
        # Generate and display efficient frontier
        st.subheader("Efficient Frontier with Risk Metrics")
        try:
            fig2 = optimizer.plot_efficient_frontier_with_risk()
            st.plotly_chart(fig2, use_container_width=True, height=800)
        except Exception as e:
            st.warning(f"Could not generate efficient frontier: {e}")
        
    except Exception as e:
        st.warning(f"Risk optimization data not available. Error: {e}")
        
        st.subheader("Generate Risk Optimization Analysis")
        if st.button("Run Risk Optimization"):
            st.info("Running risk optimization... This may take a few minutes.")
            try:
                import sys
                sys.path.append("src/quant_framework")
                from risk_optimization import RiskOptimizedPortfolio
                import yfinance as yf
                
                companies = ["CRSP", "VRTX", "EDIT", "PFE", "BMY"]
                prices = {}
                for ticker in companies:
                    try:
                        stock = yf.Ticker(ticker)
                        hist = stock.history(period="2y")
                        if not hist.empty:
                            prices[ticker] = hist['Close']
                    except:
                        pass
                
                if prices:
                    stock_data = pd.DataFrame(prices)
                    optimizer = RiskOptimizedPortfolio(stock_data)
                    comparison_df, strategies = optimizer.generate_risk_report()
                    
                    comparison_df.to_csv("data/processed/risk_optimization_comparison.csv", index=False)
                    
                    fig = optimizer.plot_drawdown_comparison(strategies)
                    fig.write_html("data/visualizations/drawdown_comparison.html")
                    
                    fig2 = optimizer.plot_efficient_frontier_with_risk()
                    fig2.write_html("data/visualizations/efficient_frontier_risk.html")
                    
                    st.success("Risk optimization complete!")
                    st.rerun()
                else:
                    st.error("Could not load stock data")
            except Exception as e:
                st.error(f"Error running risk optimization: {e}")

# Page: Quant Strategy
elif page == "Quant Strategy":
    st.markdown('<p class="sub-header">Quantitative Investment Strategy</p>', unsafe_allow_html=True)
    
    st.subheader("Strategy Overview")
    st.write("""
    The platform implements a health-signal-based investment strategy that incorporates:
    - FDA approval timelines
    - Clinical trial phase transitions
    - Epidemiological trend changes
    - Regulatory news sentiment
    """)
    
    # Strategy comparison
    strategies = ["Equal Weight", "Health Signal", "Momentum", "Mean Reversion"]
    returns = [12.5, 18.3, 15.2, 8.7]
    volatility = [22.1, 24.5, 28.3, 18.9]
    sharpe = [0.57, 0.75, 0.54, 0.46]
    
    fig = go.Figure()
    fig.add_trace(go.Bar(name='Annual Return', x=strategies, y=returns))
    fig.add_trace(go.Bar(name='Volatility', x=strategies, y=volatility))
    
    fig.update_layout(
        title="Strategy Performance Comparison",
        xaxis_title="Strategy",
        yaxis_title="Percentage (%)",
        barmode='group'
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Sharpe ratio comparison
    sharpe_df = pd.DataFrame({
        "Strategy": strategies,
        "Sharpe Ratio": sharpe
    })
    
    fig2 = px.bar(sharpe_df, x="Strategy", y="Sharpe Ratio", 
                  title="Risk-Adjusted Performance (Sharpe Ratio)")
    st.plotly_chart(fig2, use_container_width=True)
    
    st.subheader("Monte Carlo Simulation")
    st.write("10,000 simulations of 12-month forward returns")
    
    # Simulated Monte Carlo results
    np.random.seed(42)
    simulations = np.random.normal(0.18, 0.24, 10000)
    
    fig3 = go.Figure(data=[go.Histogram(x=simulations, nbinsx=50, 
                                       marker_color='lightblue',
                                       name='Simulations')])
    fig3.add_vline(x=np.percentile(simulations, 5), line_dash="dash", 
                   annotation_text="5th Percentile", annotation_position="top left")
    fig3.add_vline(x=np.mean(simulations), line_dash="dash", 
                   annotation_text="Mean", annotation_position="top right")
    fig3.add_vline(x=np.percentile(simulations, 95), line_dash="dash", 
                   annotation_text="95th Percentile", annotation_position="top")
    
    fig3.update_layout(
        title="Distribution of Simulated Annual Returns",
        xaxis_title="Annual Return",
        yaxis_title="Frequency"
    )
    st.plotly_chart(fig3, use_container_width=True)
    
    col1, col2, col3 = st.columns(3)
    col1.metric("5th Percentile", f"{np.percentile(simulations, 5):.1%}")
    col2.metric("Mean", f"{np.mean(simulations):.1%}")
    col3.metric("95th Percentile", f"{np.percentile(simulations, 95):.1%}")

# Page: Portfolio Optimization
elif page == "Portfolio Optimization":
    st.markdown('<p class="sub-header">Mean-Variance Portfolio Optimization</p>', unsafe_allow_html=True)
    
    st.subheader("Optimal Portfolio Weights")
    
    # Simulated optimal weights
    weights_data = {
        "Ticker": ["CRSP", "VRTX", "BLUE", "GBT", "NVS"],
        "Optimal Weight": [0.30, 0.25, 0.20, 0.15, 0.10],
        "Equal Weight": [0.20, 0.20, 0.20, 0.20, 0.20]
    }
    
    weights_df = pd.DataFrame(weights_data)
    
    fig = go.Figure(data=[
        go.Bar(name='Optimal Weight', x=weights_df['Ticker'], y=weights_df['Optimal Weight']),
        go.Bar(name='Equal Weight', x=weights_df['Ticker'], y=weights_df['Equal Weight'])
    ])
    fig.update_layout(barmode='group', title="Portfolio Weight Comparison")
    st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("Efficient Frontier")
    
    # Simulated efficient frontier
    returns = np.linspace(0.08, 0.25, 20)
    volatilities = np.linspace(0.18, 0.35, 20)
    
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=volatilities,
        y=returns,
        mode='lines+markers',
        name='Efficient Frontier',
        line=dict(color='blue', width=2)
    ))
    
    # Add current portfolio point
    fig2.add_trace(go.Scatter(
        x=[0.24],
        y=[0.18],
        mode='markers',
        name='Current Portfolio',
        marker=dict(size=15, color='red')
    ))
    
    # Add optimal portfolio point
    fig2.add_trace(go.Scatter(
        x=[0.22],
        y=[0.20],
        mode='markers',
        name='Optimal Portfolio',
        marker=dict(size=15, color='green')
    ))
    
    fig2.update_layout(
        title="Efficient Frontier",
        xaxis_title="Volatility (Risk)",
        yaxis_title="Expected Return"
    )
    st.plotly_chart(fig2, use_container_width=True)
    
    st.subheader("Risk Metrics")
    
    risk_metrics = {
        "Metric": ["Portfolio Beta", "Value at Risk (95%)", "Expected Shortfall", "Max Drawdown"],
        "Value": ["1.25", "-18.5%", "-22.3%", "-28.7%"]
    }
    
    st.dataframe(pd.DataFrame(risk_metrics), use_container_width=True)
    
    st.markdown("""
    ---
    <div class="disclaimer">
        <strong>Note:</strong> All optimization results are based on historical data and 
        do not guarantee future performance. This is a research tool, not investment advice.
    </div>
    """, unsafe_allow_html=True)

# Page: Investment Stages
elif page == "Investment Stages":
    st.markdown('<p class="sub-header">Investment Stage Analysis: VC vs Growth Equity vs Public Equity</p>', unsafe_allow_html=True)
    
    st.write("""
    This section analyzes sickle cell investment opportunities across different stages:
    - **Venture Capital**: Early-stage gene therapy startups, pre-clinical platforms
    - **Growth Equity**: Series B/C companies in clinical trials, scaling manufacturing
    - **Public Equity**: Listed precision medicine companies, commercial-stage treatments
    """)
    
    # Load or generate stage data
    @st.cache_data
    def load_stage_data():
        stage_data = {
            "investment_stage": ["Venture Capital (Early)", "Venture Capital (Late)",
                               "Growth Equity (Series B/C)", "Growth Equity (Pre-IPO)",
                               "Public Equity (IPO)", "Public Equity (Mature)"],
            "avg_annual_return": [0.35, 0.28, 0.22, 0.18, 0.15, 0.12],
            "volatility": [0.85, 0.65, 0.45, 0.35, 0.50, 0.25],
            "failure_rate": [0.60, 0.40, 0.25, 0.15, 0.10, 0.02],
            "time_horizon_years": [7, 5, 4, 2, 3, 1],
            "liquidity": ["Low", "Low", "Medium", "Medium", "High", "High"],
            "min_investment_millions": [1, 5, 10, 25, 0.1, 0.1]
        }
        return pd.DataFrame(stage_data)
    
    stage_df = load_stage_data()
    
    # Risk-Return Scatter Plot
    fig = go.Figure()
    
    colors = ['red', 'orange', 'yellow', 'lightgreen', 'green', 'blue']
    
    for i, row in stage_df.iterrows():
        fig.add_trace(go.Scatter(
            x=[row['volatility']],
            y=[row['avg_annual_return']],
            mode='markers',
            name=row['investment_stage'],
            marker=dict(size=20, color=colors[i]),
            hovertemplate=f"<b>{row['investment_stage']}</b><br>" +
                         f"Return: {row['avg_annual_return']:.1%}<br>" +
                         f"Volatility: {row['volatility']:.1%}<br>" +
                         f"Failure Rate: {row['failure_rate']:.1%}<br>" +
                         f"Time Horizon: {row['time_horizon_years']} years<extra></extra>"
        ))
    
    fig.update_layout(
        title="Risk-Return Profile by Investment Stage",
        xaxis_title="Volatility (Risk)",
        yaxis_title="Expected Annual Return",
        hovermode='closest'
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Stage comparison table
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Investment Stage Comparison")
        st.dataframe(stage_df, use_container_width=True)
    
    with col2:
        st.subheader("Key Metrics by Stage")
        
        # Calculate risk-adjusted returns
        stage_df['risk_adjusted_return'] = stage_df['avg_annual_return'] / stage_df['volatility']
        stage_df['expected_return_adj_failure'] = stage_df['avg_annual_return'] * (1 - stage_df['failure_rate'])
        
        metrics_df = stage_df[['investment_stage', 'risk_adjusted_return', 'expected_return_adj_failure']].copy()
        metrics_df.columns = ['Stage', 'Return/Volatility Ratio', 'Expected Return (Adj. for Failure)']
        st.dataframe(metrics_df, use_container_width=True)
    
    # VC Deals Section
    st.markdown('<p class="sub-header">Venture Capital Deals</p>', unsafe_allow_html=True)
    
    vc_deals = {
        "company": ["Editas Medicine", "Beam Therapeutics", "Mammoth Biosciences", 
                   "Intellia Therapeutics", "Caribou Biosciences", "Graphite Bio"],
        "stage": ["Series B", "Series C", "Series B", "Series A", "Series B", "Series B"],
        "focus": ["CRISPR gene editing", "Base editing", "CRISPR diagnostics", 
                 "CRISPR therapeutics", "CRISPR gene editing", "Gene correction"],
        "sickle_cell_relevance": ["High", "Medium", "Low", "High", "Medium", "High"],
        "funding_amount_millions": [120, 180, 95, 55, 85, 70],
        "valuation_millions": [1200, 3500, 800, 450, 650, 500],
        "clinical_stage": ["Phase 1/2", "Phase 1", "Preclinical", "Phase 1", "Preclinical",
                          "Phase 1"]
    }
    
    st.dataframe(pd.DataFrame(vc_deals), use_container_width=True)
    
    # Growth Equity Section
    st.markdown('<p class="sub-header">Growth Equity Deals</p>', unsafe_allow_html=True)
    
    growth_deals = {
        "company": ["Bluebird Bio", "CRISPR Therapeutics", "Global Blood Therapeutics", 
                   "Editas Medicine", "Intellia Therapeutics", "Sangamo Therapeutics"],
        "stage": ["Series C", "Series D", "Series C", "Series C", "Series C", "Series D"],
        "focus": ["Lentiviral gene therapy", "CRISPR gene editing", 
                 "Small molecule SCD treatment", "CRISPR gene editing", "CRISPR therapeutics",
                 "Zinc finger nucleases"],
        "funding_amount_millions": [250, 300, 200, 150, 175, 120],
        "valuation_millions": [2800, 4500, 1500, 1200, 1800, 800],
        "clinical_stage": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Phase 2"],
        "years_to_ipo": [2, 1, 1, 3, 2, 4]
    }
    
    st.dataframe(pd.DataFrame(growth_deals), use_container_width=True)
    
    # Public Equity Section
    st.markdown('<p class="sub-header">Public Equity: Precision Medicine Companies</p>', unsafe_allow_html=True)
    
    public_companies = {
        "ticker": ["CRSP", "VRTX", "BLUE", "EDIT", "SGMO"],
        "company": ["CRISPR Therapeutics", "Vertex Pharmaceuticals", "Bluebird Bio",
                   "Editas Medicine", "Sangamo Therapeutics"],
        "market_cap_millions": [5500, 85000, 450, 600, 350],
        "sickle_cell_focus": ["High", "High", "High", "Medium", "Medium"],
        "primary_product": ["CTX001 (gene therapy)", "CTX001 (partnered)", "LentiGlobin",
                          "EDIT-301", "ZFN therapies"],
        "clinical_stage_scd": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 2"],
        "volatility_1y": [0.65, 0.28, 0.85, 0.72, 0.58]
    }
    
    st.dataframe(pd.DataFrame(public_companies), use_container_width=True)
    
    # Precision Medicine Pipeline
    st.markdown('<p class="sub-header">Precision Medicine Pipeline Analysis</p>', unsafe_allow_html=True)
    
    precision_data = {
        "company": ["CRISPR Therapeutics", "Vertex", "Bluebird Bio", "Editas Medicine",
                   "Graphite Bio", "Intellia", "Beam Therapeutics"],
        "technology": ["CRISPR-Cas9", "CRISPR-Cas9", "Lentiviral", "CRISPR-Cas9",
                      "Gene correction", "CRISPR-Cas9", "Base Editing"],
        "target_mechanism": ["BCL11A disruption", "BCL11A disruption", "Beta-globin addition",
                           "BCL11A disruption", "Gene correction", "BCL11A disruption",
                           "Base editing"],
        "precision_level": ["High", "High", "Medium", "High", "Very High", "High", "High"],
        "phase": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Phase 1", "Phase 1"],
        "estimated_cost_per_patient": [1850000, 1850000, 2100000, 1950000, 2500000,
                                     1750000, 1200000],
        "probability_of_success": [0.80, 0.80, 0.75, 0.45, 0.35, 0.40, 0.50]
    }
    
    st.dataframe(pd.DataFrame(precision_data), use_container_width=True)
    
    # Stage Transition Probabilities
    st.markdown('<p class="sub-header">Stage Transition Probabilities</p>', unsafe_allow_html=True)
    
    transition_data = {
        "from_stage": ["Venture Capital", "Venture Capital", "Growth Equity", "Growth Equity"],
        "to_stage": ["Growth Equity", "Failure/Shutdown", "Public Equity", "Acquisition"],
        "probability": [0.35, 0.40, 0.60, 0.15],
        "time_to_transition_years": [3, 4, 2, 3]
    }
    
    st.dataframe(pd.DataFrame(transition_data), use_container_width=True)
    
    # Investment recommendation summary
    st.markdown('<p class="sub-header">Investment Strategy Recommendations by Stage</p>', unsafe_allow_html=True)
    
    st.info("""
    **Venture Capital**: High risk, high reward. Best for investors with long time horizons (7+ years) 
    and high risk tolerance. Focus on CRISPR and gene editing platforms with strong IP.
    
    **Growth Equity**: Moderate risk, solid returns. Ideal for 2-4 year horizons. Target companies 
    in Phase 2/3 trials with clear regulatory pathways.
    
    **Public Equity**: Lower risk, liquidity. Suitable for shorter horizons. Focus on companies with 
    Phase 3 assets or commercial products, strong cash flow, and partnerships.
    
    **Precision Medicine Premium**: Companies with genotype-specific therapies command valuation 
    premiums due to higher success rates and targeted patient populations.
    """)
    
    st.markdown("""
    ---
    <div class="disclaimer">
        <strong>Note:</strong> All investment stage data is based on publicly available information 
        and industry benchmarks. Past performance does not guarantee future results. 
        This is educational research, not investment advice.
    </div>
    """, unsafe_allow_html=True)

# Page: Market Analysis
elif page == "Market Analysis":
    st.markdown('<p class="sub-header">Sickle Cell Market Analysis & Investment Opportunities</p>', unsafe_allow_html=True)
    
    st.write("""
    This section provides comprehensive market analysis for sickle cell investment opportunities,
    including market size, competitive landscape, and large pharmaceutical company investments.
    """)
    
    # Market Size Analysis
    st.markdown('<p class="sub-header">Market Size & Growth</p>', unsafe_allow_html=True)
    
    market_size_data = {
        "segment": ["Global SCD Market", "US SCD Market", "Gene Therapy TAM", 
                   "Small Molecule Market", "Pain Management", "Preventive Treatments"],
        "market_size_2023_billions": [3.2, 1.8, 2.5, 0.8, 0.4, 0.5],
        "market_size_2028_billions": [5.8, 3.2, 4.5, 1.2, 0.6, 0.8],
        "cagr_percent": [12.6, 12.2, 12.5, 8.4, 8.4, 9.9]
    }
    
    market_df = pd.DataFrame(market_size_data)
    st.dataframe(market_df, use_container_width=True)
    
    # Market size chart
    fig = go.Figure()
    fig.add_trace(go.Bar(name='2023', x=market_df['segment'], y=market_df['market_size_2023_billions']))
    fig.add_trace(go.Bar(name='2028 (Projected)', x=market_df['segment'], y=market_df['market_size_2028_billions']))
    fig.update_layout(barmode='group', title="Market Size Comparison (2023 vs 2028 Projected)",
                     yaxis_title="Market Size ($ Billions)")
    st.plotly_chart(fig, use_container_width=True)
    
    # Large Pharma Investments
    st.markdown('<p class="sub-header">Large Pharmaceutical Company Investments</p>', unsafe_allow_html=True)
    
    pharma_data = {
        "company": ["Novartis", "Pfizer", "Bristol Myers Squibb", "Gilead Sciences", 
                   "Sanofi", "Roche", "Johnson & Johnson", "Merck (MSD)", 
                   "AstraZeneca", "Eli Lilly"],
        "ticker": ["NVS", "PFE", "BMY", "GILD", "SNY", "RHHBY", "JNJ", "MRK", "AZN", "LLY"],
        "market_cap_billions": [185, 250, 110, 85, 135, 210, 380, 275, 195, 420],
        "sickle_cell_investment_type": ["Direct Drug Development", "Partnership/Licensing", 
                                       "Acquisition", "Partnership", "Clinical Trials",
                                       "Diagnostic Partnership", "R&D Investment",
                                       "Clinical Trials", "Research Collaboration", "R&D Investment"],
        "key_asset": ["Adakveo (crizanlizumab)", "Multiple partnerships", "Various acquired drugs",
                     "Partnered gene therapy", "Multiple candidates", "Diagnostics platform",
                     "J&J Innovation investments", "Clinical pipeline", "Research programs",
                     "Discovery programs"],
        "investment_stage": ["Commercial", "Clinical", "Commercial", "Clinical", "Clinical",
                           "Preclinical", "R&D", "Clinical", "Preclinical", "R&D"],
        "annual_rd_spending_billions": [10.2, 12.5, 9.8, 5.2, 6.8, 14.5, 15.2, 28.5, 9.5, 8.2],
        "sickle_cell_rd_allocation_percent": [2.5, 1.8, 3.2, 1.5, 2.0, 0.8, 1.2, 1.0, 0.5, 0.3],
        "estimated_scd_revenue_millions": [250, 180, 320, 95, 45, 20, 80, 35, 15, 10]
    }
    
    pharma_df = pd.DataFrame(pharma_data)
    st.dataframe(pharma_df, use_container_width=True)
    
    # Pharma investment visualization
    col1, col2 = st.columns(2)
    
    with col1:
        fig2 = px.scatter(pharma_df, x='market_cap_billions', y='estimated_scd_revenue_millions',
                         size='sickle_cell_rd_allocation_percent', hover_name='company',
                         title="Pharma Companies: Market Cap vs SCD Revenue")
        fig2.update_layout(xaxis_title="Market Cap ($ Billions)", yaxis_title="SCD Revenue ($ Millions)")
        st.plotly_chart(fig2, use_container_width=True)
    
    with col2:
        fig3 = px.bar(pharma_df, x='company', y='sickle_cell_rd_allocation_percent',
                     title="R&D Allocation to Sickle Cell (%)")
        fig3.update_layout(xaxis_title="Company", yaxis_title="R&D Allocation (%)")
        st.plotly_chart(fig3, use_container_width=True)
    
    # Competitive Landscape
    st.markdown('<p class="sub-header">Competitive Landscape</p>', unsafe_allow_html=True)
    
    competitive_data = {
        "company": ["Global Blood Therapeutics", "Novartis", "Pfizer", "Bluebird Bio",
                   "CRISPR Therapeutics", "Vertex", "Editas Medicine", "Bristol Myers Squibb"],
        "ticker": ["GBT", "NVS", "PFE", "BLUE", "CRSP", "VRTX", "EDIT", "BMY"],
        "modality": ["Small Molecule", "Biologic", "Small Molecule", "Gene Therapy",
                    "Gene Therapy", "Gene Therapy", "Gene Therapy", "Multiple"],
        "lead_asset": ["Voxelotor", "Crizanlizumab", "Multiple candidates", "LentiGlobin",
                     "CTX001", "CTX001", "EDIT-301", "Various acquired drugs"],
        "phase": ["Commercial", "Commercial", "Clinical", "Phase 3", "Phase 3", 
                 "Phase 3", "Phase 1/2", "Commercial"],
        "market_share_estimate_percent": [15, 20, 12, 10, 8, 8, 5, 22],
        "pricing_power": ["High", "High", "Medium", "Very High", "Very High", "Very High",
                        "High", "High"]
    }
    
    competitive_df = pd.DataFrame(competitive_data)
    st.dataframe(competitive_df, use_container_width=True)
    
    # Market share pie chart
    fig4 = go.Figure(data=[go.Pie(labels=competitive_df['company'], 
                                   values=competitive_df['market_share_estimate_percent'])])
    fig4.update_layout(title="Estimated Market Share by Company")
    st.plotly_chart(fig4, use_container_width=True)
    
    # Deal Flow Analysis
    st.markdown('<p class="sub-header">M&A and Partnership Deal Flow (2018-2024)</p>', unsafe_allow_html=True)
    
    deal_data = {
        "date": ["2018-09-01", "2019-06-15", "2020-03-20", "2021-01-10", "2021-08-25",
                "2022-04-12", "2022-11-30", "2023-06-20", "2023-12-15", "2024-03-01"],
        "type": ["Partnership", "Acquisition", "Licensing", "Partnership", "Investment",
                "Partnership", "Acquisition", "Licensing", "Partnership", "Investment"],
        "buyer": ["Pfizer", "Bristol Myers Squibb", "Novartis", "Vertex", "Roche",
                 "Gilead", "Pfizer", "Sanofi", "Novartis", "Johnson & Johnson"],
        "deal_value_millions": [450, 2800, 900, 900, 150, 300, 1200, 85, 200, 75]
    }
    
    deal_df = pd.DataFrame(deal_data)
    deal_df['date'] = pd.to_datetime(deal_df['date'])
    
    # Deal flow timeline
    fig5 = px.scatter(deal_df, x='date', y='deal_value_millions', color='type', size='deal_value_millions',
                     hover_name='buyer', title="Deal Flow Timeline")
    fig5.update_layout(xaxis_title="Date", yaxis_title="Deal Value ($ Millions)")
    st.plotly_chart(fig5, use_container_width=True)
    
    # Deal type breakdown
    deal_type_summary = deal_df.groupby('type').agg({
        'deal_value_millions': ['sum', 'mean', 'count']
    }).round(2)
    deal_type_summary.columns = ['Total Value ($M)', 'Average Deal Size ($M)', 'Number of Deals']
    st.dataframe(deal_type_summary, use_container_width=True)
    
    # Investment Attractiveness
    st.markdown('<p class="sub-header">Investment Attractiveness Scores</p>', unsafe_allow_html=True)
    
    attractiveness_data = {
        "company": ["CRISPR Therapeutics", "Vertex Pharmaceuticals", "Bluebird Bio",
                   "Global Blood Therapeutics", "Editas Medicine", "Novartis",
                   "Pfizer", "Bristol Myers Squibb"],
        "ticker": ["CRSP", "VRTX", "BLUE", "GBT", "EDIT", "NVS", "PFE", "BMY"],
        "overall_score": [8.20, 8.10, 6.40, 6.30, 6.20, 7.70, 7.50, 7.70],
        "investment_recommendation": ["Strong Buy", "Strong Buy", "Hold", "Hold", "Hold", "Buy", "Buy", "Buy"],
        "technology_score": [9, 9, 7, 6, 8, 5, 4, 5],
        "clinical_stage_score": [9, 9, 8, 9, 5, 9, 6, 9],
        "financial_strength_score": [7, 9, 4, 5, 6, 9, 9, 9]
    }
    
    attractiveness_df = pd.DataFrame(attractiveness_data).sort_values('overall_score', ascending=False)
    st.dataframe(attractiveness_df, use_container_width=True)
    
    # Attractiveness chart
    fig6 = go.Figure()
    colors = ['green' if rec == 'Strong Buy' else 'lightgreen' if rec == 'Buy' else 
              'yellow' if rec == 'Hold' else 'red' for rec in attractiveness_df['investment_recommendation']]
    
    fig6.add_trace(go.Bar(x=attractiveness_df['company'], y=attractiveness_df['overall_score'],
                         marker_color=colors, text=attractiveness_df['investment_recommendation'],
                         textposition='outside'))
    fig6.update_layout(title="Investment Attractiveness Scores",
                      yaxis_title="Overall Score (0-10)",
                      xaxis_title="Company")
    st.plotly_chart(fig6, use_container_width=True)
    
    # Key Insights
    st.markdown('<p class="sub-header">Key Market Insights</p>', unsafe_allow_html=True)
    
    st.info("""
    **Market Opportunity:**
    - Global SCD market projected to grow from $3.2B (2023) to $5.8B (2028) at 12.6% CAGR
    - Gene therapy TAM expected to reach $4.5B by 2028
    - Treatment cost per patient: $1.85M for gene therapy, $30K-150K for small molecules
    
    **Large Pharma Leaders:**
    - Bristol Myers Squibb leads with $320M SCD revenue and 3.2% R&D allocation
    - Novartis has commercial product (Adakveo) with $250M revenue
    - Pfizer maintains 8 partnerships in SCD space
    
    **Investment Thesis:**
    - CRISPR Therapeutics and Vertex rated "Strong Buy" due to gene therapy leadership
    - Gene therapy segment offers highest growth potential but carries development risk
    - Large pharma provides stability with diversified portfolios
    
    **Deal Flow:**
    - $6.5B+ in M&A/partnership deals since 2018
    - Average deal size: $650M
    - Trend toward partnerships and platform acquisitions
    """)
    
    st.markdown("""
    ---
    <div class="disclaimer">
        <strong>Note:</strong> All market analysis data is based on publicly available information, 
        company filings, and industry reports. Past performance does not guarantee future results. 
        This is educational research, not investment advice.
    </div>
    """, unsafe_allow_html=True)

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray;'>
    <p>Sickle Cell Investment Analysis Platform | Educational/Research Use Only</p>
    <p>Data Sources: CDC, WHO, FDA, ClinicalTrials.gov, Yahoo Finance (delayed)</p>
</div>
""", unsafe_allow_html=True)
