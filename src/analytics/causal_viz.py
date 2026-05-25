"""
Visualization functions for causal inference
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import Optional


def plot_propensity_scores(
    matched_df: pd.DataFrame,
    title: str = "Propensity Score Distribution"
) -> go.Figure:
    """
    Plot propensity score distributions for treated and control groups.
    
    Args:
        matched_df: DataFrame with matched data including propensity_score and group
        title: Plot title
        
    Returns:
        Plotly figure
    """
    fig = go.Figure()
    
    # Treated group
    treated = matched_df[matched_df['group'] == 'Treated']['propensity_score']
    fig.add_trace(go.Histogram(
        x=treated,
        name='Treated',
        opacity=0.7,
        marker_color='#5A8A6F',
        nbinsx=20
    ))
    
    # Control group
    control = matched_df[matched_df['group'] == 'Control']['propensity_score']
    fig.add_trace(go.Histogram(
        x=control,
        name='Control',
        opacity=0.7,
        marker_color='#7BA88C',
        nbinsx=20
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Propensity Score",
        yaxis_title="Count",
        barmode='overlay',
        height=400,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def plot_covariate_balance(
    balance_df: pd.DataFrame,
    title: str = "Covariate Balance (Standardized Mean Differences)"
) -> go.Figure:
    """
    Plot covariate balance before/after matching.
    
    Args:
        balance_df: DataFrame with covariate balance statistics
        title: Plot title
        
    Returns:
        Plotly figure
    """
    df = balance_df.copy()
    
    # Color by balance status
    df['color'] = df['balanced'].map({True: '#5A8A6F', False: '#D9534F'})
    
    fig = go.Figure()
    
    # Add reference lines
    fig.add_hline(y=0.1, line_dash="dash", line_color="gray", opacity=0.5)
    fig.add_hline(y=-0.1, line_dash="dash", line_color="gray", opacity=0.5)
    fig.add_hline(y=0, line_color="black", opacity=0.3)
    
    # Add scatter points
    fig.add_trace(go.Scatter(
        x=df['covariate'],
        y=df['std_mean_diff'],
        mode='markers',
        marker=dict(
            size=12,
            color=df['color'],
            line=dict(width=1, color='white')
        ),
        text=df.apply(lambda r: f"SMD: {r['std_mean_diff']:.3f}<br>Balanced: {r['balanced']}", axis=1),
        hovertemplate='<b>%{x}</b><br>%{text}<extra></extra>',
        showlegend=False
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Covariate",
        yaxis_title="Standardized Mean Difference",
        height=400,
        hovermode='closest'
    )
    
    # Add annotation
    fig.add_annotation(
        text="Balanced if |SMD| < 0.1",
        xref="paper", yref="paper",
        x=0.02, y=0.98,
        showarrow=False,
        bgcolor="rgba(255, 255, 255, 0.8)",
        bordercolor="#5A8A6F",
        borderwidth=1,
        borderpad=4
    )
    
    return fig


def plot_treatment_effect(
    results: dict,
    title: str = "Average Treatment Effect"
) -> go.Figure:
    """
    Plot treatment effect with confidence interval.
    
    Args:
        results: Dictionary with ATE, CI, and p-value
        title: Plot title
        
    Returns:
        Plotly figure
    """
    ate = results['average_treatment_effect']
    ci_lower = results['ci_lower']
    ci_upper = results['ci_upper']
    p_value = results['p_value']
    
    fig = go.Figure()
    
    # Add reference line at 0 (no effect)
    fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
    
    # Add treatment effect with error bars
    color = '#5A8A6F' if p_value < 0.05 else '#CCCCCC'
    
    fig.add_trace(go.Scatter(
        x=['Treatment Effect'],
        y=[ate],
        error_y=dict(
            type='data',
            symmetric=False,
            array=[ci_upper - ate],
            arrayminus=[ate - ci_lower],
            color=color,
            thickness=3,
            width=10
        ),
        mode='markers',
        marker=dict(size=20, color=color),
        showlegend=False,
        hovertemplate=f'<b>ATE: {ate:.3f}</b><br>' +
                     f'95% CI: [{ci_lower:.3f}, {ci_upper:.3f}]<br>' +
                     f'P-value: {p_value:.4f}<extra></extra>'
    ))
    
    fig.update_layout(
        title=title,
        yaxis_title="Effect Size",
        height=400,
        xaxis=dict(showticklabels=False)
    )
    
    # Add significance annotation
    sig_text = "Statistically Significant" if p_value < 0.05 else "Not Significant"
    fig.add_annotation(
        text=f"{sig_text} (p={p_value:.4f})",
        xref="paper", yref="paper",
        x=0.5, y=0.98,
        showarrow=False,
        bgcolor="rgba(255, 255, 255, 0.8)",
        bordercolor=color,
        borderwidth=2,
        borderpad=4
    )
    
    return fig


def plot_subgroup_effects(
    heterogeneity_df: pd.DataFrame,
    title: str = "Treatment Effect Heterogeneity"
) -> go.Figure:
    """
    Plot treatment effects across subgroups.
    
    Args:
        heterogeneity_df: DataFrame with subgroup-specific effects
        title: Plot title
        
    Returns:
        Plotly figure
    """
    df = heterogeneity_df.copy()
    df['color'] = df['significant'].map({True: '#5A8A6F', False: '#CCCCCC'})
    
    fig = go.Figure()
    
    # Add reference line at 0
    fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
    
    # Add bars
    fig.add_trace(go.Bar(
        x=df['subgroup'],
        y=df['treatment_effect'],
        marker_color=df['color'],
        text=df['treatment_effect'].apply(lambda x: f"{x:.3f}"),
        textposition='outside',
        hovertemplate='<b>%{x}</b><br>' +
                     'Effect: %{y:.3f}<br>' +
                     'P-value: %{customdata:.4f}<extra></extra>',
        customdata=df['p_value']
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Subgroup",
        yaxis_title="Treatment Effect",
        height=400,
        showlegend=False
    )
    
    return fig


def plot_did_parallel_trends(
    did_results: dict,
    title: str = "Difference-in-Differences"
) -> go.Figure:
    """
    Plot DiD visualization showing parallel trends.
    
    Args:
        did_results: Dictionary with DiD estimates
        title: Plot title
        
    Returns:
        Plotly figure
    """
    # Create data for visualization
    periods = ['Pre', 'Post']
    treated = [did_results['treated_pre'], did_results['treated_post']]
    control = [did_results['control_pre'], did_results['control_post']]
    
    fig = go.Figure()
    
    # Treated group
    fig.add_trace(go.Scatter(
        x=periods,
        y=treated,
        mode='lines+markers',
        name='Treated',
        line=dict(color='#5A8A6F', width=3),
        marker=dict(size=12)
    ))
    
    # Control group
    fig.add_trace(go.Scatter(
        x=periods,
        y=control,
        mode='lines+markers',
        name='Control',
        line=dict(color='#7BA88C', width=3, dash='dash'),
        marker=dict(size=12)
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Period",
        yaxis_title="Outcome",
        height=400,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    # Add DiD estimate annotation
    did_est = did_results['did_estimate']
    fig.add_annotation(
        text=f"DiD Estimate: {did_est:.3f}",
        xref="paper", yref="paper",
        x=0.02, y=0.98,
        showarrow=False,
        bgcolor="rgba(255, 255, 255, 0.8)",
        bordercolor="#5A8A6F",
        borderwidth=1,
        borderpad=4
    )
    
    return fig
