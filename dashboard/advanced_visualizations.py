"""
Advanced Dashboard Visualizations

Additional charts and interactive components for the Streamlit dashboard.
"""

import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import numpy as np
from typing import Dict, List


def plot_regime_timeline(regimes: pd.Series, returns: pd.Series, title: str = "Market Regime Timeline"):
    """
    Plot market regimes over time with colored background.
    
    Args:
        regimes: Series of regime labels
        returns: Series of returns
        title: Chart title
    """
    # Calculate cumulative returns
    cum_returns = (1 + returns).cumprod()
    
    # Create figure
    fig = go.Figure()
    
    # Add cumulative return line
    fig.add_trace(go.Scatter(
        x=cum_returns.index,
        y=cum_returns.values,
        mode='lines',
        name='Cumulative Returns',
        line=dict(color='black', width=2)
    ))
    
    # Add regime backgrounds
    regime_colors = {
        'bull': 'rgba(0, 255, 0, 0.1)',
        'bear': 'rgba(255, 0, 0, 0.1)',
        'sideways': 'rgba(128, 128, 128, 0.1)',
        'crisis': 'rgba(255, 165, 0, 0.1)'
    }
    
    # Group consecutive regimes
    regime_changes = regimes != regimes.shift()
    regime_groups = regime_changes.cumsum()
    
    for group_id in regime_groups.unique():
        group_mask = regime_groups == group_id
        group_dates = regimes[group_mask].index
        regime_label = regimes[group_mask].iloc[0]
        
        if len(group_dates) > 0:
            fig.add_vrect(
                x0=group_dates[0],
                x1=group_dates[-1],
                fillcolor=regime_colors.get(regime_label, 'rgba(0, 0, 255, 0.1)'),
                layer="below",
                line_width=0,
            )
    
    fig.update_layout(
        title=title,
        xaxis_title="Date",
        yaxis_title="Cumulative Return",
        hovermode='x unified',
        height=500
    )
    
    return fig


def plot_pairs_trading_spread(spread: pd.Series, zscore: pd.Series, 
                               signals: pd.Series, ticker1: str, ticker2: str):
    """
    Plot pairs trading spread with z-score and signals.
    """
    fig = go.Figure()
    
    # Spread
    fig.add_trace(go.Scatter(
        x=spread.index,
        y=spread.values,
        mode='lines',
        name='Spread',
        line=dict(color='blue', width=1),
        yaxis='y1'
    ))
    
    # Z-score
    fig.add_trace(go.Scatter(
        x=zscore.index,
        y=zscore.values,
        mode='lines',
        name='Z-Score',
        line=dict(color='orange', width=2),
        yaxis='y2'
    ))
    
    # Entry/exit thresholds
    fig.add_hline(y=2.0, line_dash="dash", line_color="red", yaxis='y2', annotation_text="Entry (+2σ)")
    fig.add_hline(y=-2.0, line_dash="dash", line_color="green", yaxis='y2', annotation_text="Entry (-2σ)")
    fig.add_hline(y=0, line_dash="dot", line_color="gray", yaxis='y2')
    
    # Trading signals
    long_signals = signals[signals == 1]
    short_signals = signals[signals == -1]
    
    if len(long_signals) > 0:
        fig.add_trace(go.Scatter(
            x=long_signals.index,
            y=zscore.loc[long_signals.index],
            mode='markers',
            name='Long Signal',
            marker=dict(color='green', size=10, symbol='triangle-up'),
            yaxis='y2'
        ))
    
    if len(short_signals) > 0:
        fig.add_trace(go.Scatter(
            x=short_signals.index,
            y=zscore.loc[short_signals.index],
            mode='markers',
            name='Short Signal',
            marker=dict(color='red', size=10, symbol='triangle-down'),
            yaxis='y2'
        ))
    
    fig.update_layout(
        title=f"Pairs Trading: {ticker1} / {ticker2}",
        xaxis_title="Date",
        yaxis=dict(title="Spread ($)", side='left'),
        yaxis2=dict(title="Z-Score", side='right', overlaying='y'),
        hovermode='x unified',
        height=500
    )
    
    return fig


def plot_trial_funnel(trial_counts: Dict[str, int]):
    """
    Plot clinical trial pipeline funnel.
    
    Args:
        trial_counts: Dict mapping phase -> count
    """
    phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Approved']
    counts = [trial_counts.get(phase, 0) for phase in phases]
    
    # Calculate success rates between phases
    success_rates = []
    for i in range(len(counts) - 1):
        if counts[i] > 0:
            rate = counts[i+1] / counts[i] * 100
            success_rates.append(f"{rate:.1f}%")
        else:
            success_rates.append("N/A")
    success_rates.append("")  # No rate after approval
    
    fig = go.Figure()
    
    fig.add_trace(go.Funnel(
        y=phases,
        x=counts,
        textposition="inside",
        textinfo="value+percent initial",
        marker=dict(
            color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c'],
        ),
        connector=dict(line=dict(color="royalblue", dash="dot", width=3))
    ))
    
    # Add success rate annotations
    for i, (phase, rate) in enumerate(zip(phases[:-1], success_rates[:-1])):
        fig.add_annotation(
            x=counts[i] / 2,
            y=i + 0.5,
            text=f"→ {rate}",
            showarrow=False,
            font=dict(size=12, color="white", family="Arial Black")
        )
    
    fig.update_layout(
        title="Clinical Trial Pipeline Funnel",
        height=500
    )
    
    return fig


def plot_feature_importance_radar(importance_df: pd.DataFrame, top_n: int = 10):
    """
    Plot feature importance as radar chart.
    
    Args:
        importance_df: DataFrame with 'feature' and 'importance' columns
        top_n: Number of top features to show
    """
    top_features = importance_df.head(top_n)
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatterpolar(
        r=top_features['importance'].values,
        theta=top_features['feature'].values,
        fill='toself',
        name='Feature Importance',
        line=dict(color='#3498db', width=2),
        fillcolor='rgba(52, 152, 219, 0.3)'
    ))
    
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, top_features['importance'].max() * 1.1]
            )
        ),
        showlegend=False,
        title=f"Top {top_n} Feature Importance (ML Model)",
        height=600
    )
    
    return fig


def plot_correlation_heatmap(data: pd.DataFrame, title: str = "Correlation Matrix"):
    """
    Plot correlation heatmap with annotations.
    """
    corr = data.corr()
    
    fig = go.Figure(data=go.Heatmap(
        z=corr.values,
        x=corr.columns,
        y=corr.columns,
        colorscale='RdBu',
        zmid=0,
        text=corr.values.round(2),
        texttemplate='%{text}',
        textfont={"size": 10},
        colorbar=dict(title="Correlation")
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="",
        yaxis_title="",
        height=600,
        width=700
    )
    
    return fig


def plot_monte_carlo_distribution(simulated_returns: np.ndarray, 
                                   percentiles: List[float] = [5, 50, 95]):
    """
    Plot Monte Carlo simulation results.
    
    Args:
        simulated_returns: Array of simulated returns (n_simulations,)
        percentiles: Percentiles to highlight
    """
    fig = go.Figure()
    
    # Histogram
    fig.add_trace(go.Histogram(
        x=simulated_returns * 100,
        nbinsx=50,
        name='Simulated Returns',
        marker=dict(color='#3498db', opacity=0.7)
    ))
    
    # Add percentile lines
    colors = ['red', 'green', 'orange']
    for pct, color in zip(percentiles, colors):
        value = np.percentile(simulated_returns, pct) * 100
        fig.add_vline(
            x=value,
            line_dash="dash",
            line_color=color,
            annotation_text=f"P{pct}: {value:.1f}%",
            annotation_position="top"
        )
    
    fig.update_layout(
        title="Monte Carlo Simulation: Portfolio Return Distribution",
        xaxis_title="Annual Return (%)",
        yaxis_title="Frequency",
        showlegend=False,
        height=500
    )
    
    return fig


def plot_efficient_frontier(returns: pd.DataFrame, n_portfolios: int = 1000):
    """
    Plot efficient frontier from historical returns.
    
    Args:
        returns: DataFrame of asset returns
        n_portfolios: Number of random portfolios to simulate
    """
    n_assets = len(returns.columns)
    results = np.zeros((3, n_portfolios))
    
    for i in range(n_portfolios):
        # Random weights
        weights = np.random.random(n_assets)
        weights /= np.sum(weights)
        
        # Portfolio return and volatility
        portfolio_return = np.sum(returns.mean() * weights) * 252
        portfolio_std = np.sqrt(np.dot(weights.T, np.dot(returns.cov() * 252, weights)))
        
        results[0, i] = portfolio_std
        results[1, i] = portfolio_return
        results[2, i] = portfolio_return / portfolio_std  # Sharpe
    
    # Create scatter plot
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=results[0, :] * 100,
        y=results[1, :] * 100,
        mode='markers',
        marker=dict(
            size=5,
            color=results[2, :],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title="Sharpe Ratio")
        ),
        text=[f"Sharpe: {s:.2f}" for s in results[2, :]],
        hovertemplate="Vol: %{x:.1f}%<br>Return: %{y:.1f}%<br>%{text}<extra></extra>",
        name='Portfolios'
    ))
    
    # Highlight max Sharpe portfolio
    max_sharpe_idx = np.argmax(results[2, :])
    fig.add_trace(go.Scatter(
        x=[results[0, max_sharpe_idx] * 100],
        y=[results[1, max_sharpe_idx] * 100],
        mode='markers',
        marker=dict(size=15, color='red', symbol='star'),
        name='Max Sharpe',
        hovertemplate="Optimal Portfolio<br>Vol: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>"
    ))
    
    fig.update_layout(
        title="Efficient Frontier",
        xaxis_title="Volatility (%)",
        yaxis_title="Expected Return (%)",
        hovermode='closest',
        height=600
    )
    
    return fig


def plot_drawdown_chart(returns: pd.Series, title: str = "Drawdown Analysis"):
    """
    Plot cumulative returns with drawdown shading.
    """
    cum_returns = (1 + returns).cumprod()
    running_max = cum_returns.expanding().max()
    drawdown = (cum_returns - running_max) / running_max
    
    fig = go.Figure()
    
    # Cumulative returns
    fig.add_trace(go.Scatter(
        x=cum_returns.index,
        y=cum_returns.values,
        mode='lines',
        name='Cumulative Returns',
        line=dict(color='blue', width=2),
        yaxis='y1'
    ))
    
    # Running max
    fig.add_trace(go.Scatter(
        x=running_max.index,
        y=running_max.values,
        mode='lines',
        name='Peak',
        line=dict(color='green', width=1, dash='dot'),
        yaxis='y1'
    ))
    
    # Drawdown
    fig.add_trace(go.Scatter(
        x=drawdown.index,
        y=drawdown.values * 100,
        mode='lines',
        name='Drawdown',
        fill='tozeroy',
        line=dict(color='red', width=1),
        fillcolor='rgba(255, 0, 0, 0.2)',
        yaxis='y2'
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Date",
        yaxis=dict(title="Cumulative Return", side='left'),
        yaxis2=dict(title="Drawdown (%)", side='right', overlaying='y'),
        hovermode='x unified',
        height=500
    )
    
    return fig


# Streamlit integration examples
def render_advanced_visualizations():
    """
    Example Streamlit page with advanced visualizations.
    """
    st.title("Advanced Visualizations")
    
    st.markdown("""
    This page demonstrates advanced quantitative visualizations for the platform.
    """)
    
    # Tabs for different viz types
    tab1, tab2, tab3, tab4 = st.tabs([
        "Regime Detection", 
        "Pairs Trading", 
        "Portfolio Analysis",
        "ML Insights"
    ])
    
    with tab1:
        st.subheader("Market Regime Detection")
        st.info("HMM-based regime detection with bull/bear/sideways/crisis classification")
        # Add regime timeline plot here
        
    with tab2:
        st.subheader("Pairs Trading Analysis")
        st.info("Statistical arbitrage opportunities using cointegration")
        # Add pairs trading plots here
        
    with tab3:
        st.subheader("Portfolio Optimization")
        st.info("Efficient frontier and risk-return analysis")
        # Add efficient frontier and drawdown plots here
        
    with tab4:
        st.subheader("ML Model Insights")
        st.info("Feature importance and prediction confidence")
        # Add feature importance radar and Monte Carlo plots here


if __name__ == "__main__":
    # Demo
    print("Advanced visualization module loaded.")
    print("Import these functions into your Streamlit dashboard:")
    print("  - plot_regime_timeline()")
    print("  - plot_pairs_trading_spread()")
    print("  - plot_trial_funnel()")
    print("  - plot_feature_importance_radar()")
    print("  - plot_correlation_heatmap()")
    print("  - plot_monte_carlo_distribution()")
    print("  - plot_efficient_frontier()")
    print("  - plot_drawdown_chart()")
