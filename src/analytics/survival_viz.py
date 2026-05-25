"""
Visualization functions for survival analysis
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from typing import Optional


def plot_kaplan_meier(
    survival_table: pd.DataFrame,
    metadata: dict,
    title: str = "Trial Survival Curve",
    color_palette: Optional[list] = None
) -> go.Figure:
    """
    Create Kaplan-Meier survival curve plot.
    
    Args:
        survival_table: DataFrame with timeline and survival probabilities
        metadata: Metadata from kaplan_meier_analysis
        title: Plot title
        color_palette: List of colors for different groups
        
    Returns:
        Plotly figure
    """
    if color_palette is None:
        color_palette = ['#5A8A6F', '#7BA88C', '#9CC6A9', '#BDE4C6']
    
    fig = go.Figure()
    
    if metadata['type'] == 'stratified':
        # Multiple curves
        for i, col in enumerate(survival_table.columns[1:]):
            fig.add_trace(go.Scatter(
                x=survival_table['timeline'],
                y=survival_table[col],
                mode='lines',
                name=col,
                line=dict(color=color_palette[i % len(color_palette)], width=2),
                hovertemplate='<b>%{fullData.name}</b><br>Days: %{x}<br>Survival: %{y:.1%}<extra></extra>'
            ))
        
        # Add log-rank test result if available
        if 'logrank_p_value' in metadata.get('groups', {}):
            p_val = metadata['groups']['logrank_p_value']
            annotation_text = f"Log-rank test p-value: {p_val:.4f}"
            if p_val < 0.05:
                annotation_text += " (Significant difference)"
        else:
            annotation_text = ""
            
    else:
        # Single curve
        fig.add_trace(go.Scatter(
            x=survival_table['timeline'],
            y=survival_table['survival_probability'],
            mode='lines',
            name='Survival Probability',
            line=dict(color=color_palette[0], width=3),
            fill='tozeroy',
            fillcolor='rgba(90, 138, 111, 0.1)',
            hovertemplate='Days: %{x}<br>Survival: %{y:.1%}<extra></extra>'
        ))
        
        median = metadata.get('median_survival', 'N/A')
        annotation_text = f"Median survival: {median:.0f} days" if isinstance(median, (int, float)) else ""
    
    fig.update_layout(
        title=title,
        xaxis_title="Days Since Trial Start",
        yaxis_title="Probability of Trial Ongoing",
        yaxis=dict(tickformat='.0%', range=[0, 1.05]),
        hovermode='x unified',
        height=500,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    if annotation_text:
        fig.add_annotation(
            text=annotation_text,
            xref="paper", yref="paper",
            x=0.02, y=0.98,
            showarrow=False,
            bgcolor="rgba(255, 255, 255, 0.8)",
            bordercolor="#5A8A6F",
            borderwidth=1,
            borderpad=4,
            align="left"
        )
    
    return fig


def plot_cox_hazard_ratios(
    coefficients_df: pd.DataFrame,
    metadata: dict,
    title: str = "Cox Proportional Hazards - Risk Factors"
) -> go.Figure:
    """
    Create forest plot of hazard ratios from Cox model.
    
    Args:
        coefficients_df: DataFrame with coefficients and hazard ratios
        metadata: Model metadata
        title: Plot title
        
    Returns:
        Plotly figure
    """
    df = coefficients_df.copy()
    
    # Calculate confidence intervals (approximate)
    df['ci_lower'] = df['hazard_ratio'] * 0.8
    df['ci_upper'] = df['hazard_ratio'] * 1.2
    
    # Color by significance
    df['color'] = df['p'].apply(lambda p: '#5A8A6F' if p < 0.05 else '#CCCCCC')
    
    fig = go.Figure()
    
    # Add reference line at HR = 1
    fig.add_hline(y=1, line_dash="dash", line_color="gray", opacity=0.5)
    
    # Add hazard ratios with error bars
    for idx, row in df.iterrows():
        fig.add_trace(go.Scatter(
            x=[row['feature']],
            y=[row['hazard_ratio']],
            error_y=dict(
                type='data',
                symmetric=False,
                array=[row['ci_upper'] - row['hazard_ratio']],
                arrayminus=[row['hazard_ratio'] - row['ci_lower']],
                color=row['color']
            ),
            mode='markers',
            marker=dict(size=12, color=row['color']),
            name=row['feature'],
            showlegend=False,
            hovertemplate=f"<b>{row['feature']}</b><br>" +
                         f"Hazard Ratio: {row['hazard_ratio']:.3f}<br>" +
                         f"P-value: {row['p']:.4f}<br>" +
                         f"{row['interpretation']}<extra></extra>"
        ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Risk Factor",
        yaxis_title="Hazard Ratio",
        yaxis=dict(type='log'),
        height=400,
        hovermode='closest'
    )
    
    # Add concordance index annotation
    c_index = metadata.get('concordance_index', 'N/A')
    if isinstance(c_index, float):
        fig.add_annotation(
            text=f"C-index: {c_index:.3f}",
            xref="paper", yref="paper",
            x=0.98, y=0.98,
            showarrow=False,
            bgcolor="rgba(255, 255, 255, 0.8)",
            bordercolor="#5A8A6F",
            borderwidth=1,
            borderpad=4
        )
    
    return fig


def plot_competing_risks(
    cif_df: pd.DataFrame,
    title: str = "Competing Risks: Completion vs Termination"
) -> go.Figure:
    """
    Create cumulative incidence function plot for competing risks.
    
    Args:
        cif_df: DataFrame with cumulative incidence functions
        title: Plot title
        
    Returns:
        Plotly figure
    """
    fig = go.Figure()
    
    # Completed trials
    fig.add_trace(go.Scatter(
        x=cif_df['days'],
        y=cif_df['cumulative_completed'],
        mode='lines',
        name='Completed',
        line=dict(color='#5A8A6F', width=3),
        fill='tozeroy',
        fillcolor='rgba(90, 138, 111, 0.2)',
        hovertemplate='Days: %{x:.0f}<br>Cumulative Completed: %{y:.1%}<extra></extra>'
    ))
    
    # Terminated trials
    fig.add_trace(go.Scatter(
        x=cif_df['days'],
        y=cif_df['cumulative_terminated'],
        mode='lines',
        name='Terminated',
        line=dict(color='#D9534F', width=3),
        fill='tozeroy',
        fillcolor='rgba(217, 83, 79, 0.2)',
        hovertemplate='Days: %{x:.0f}<br>Cumulative Terminated: %{y:.1%}<extra></extra>'
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Days Since Trial Start",
        yaxis_title="Cumulative Incidence",
        yaxis=dict(tickformat='.0%'),
        hovermode='x unified',
        height=500,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig


def plot_duration_distribution(
    trials_df: pd.DataFrame,
    stratify_by: Optional[str] = None,
    title: str = "Trial Duration Distribution"
) -> go.Figure:
    """
    Create histogram/violin plot of trial durations.
    
    Args:
        trials_df: DataFrame with trial data
        stratify_by: Column to stratify by
        title: Plot title
        
    Returns:
        Plotly figure
    """
    from src.analytics.survival_analysis import prepare_survival_data
    
    df = prepare_survival_data(trials_df)
    df['duration_years'] = df['duration_days'] / 365.25
    
    if stratify_by and stratify_by in df.columns:
        fig = px.violin(
            df,
            x=stratify_by,
            y='duration_years',
            color=stratify_by,
            box=True,
            points='all',
            title=title,
            labels={'duration_years': 'Duration (Years)'},
            color_discrete_sequence=['#5A8A6F', '#7BA88C', '#9CC6A9', '#BDE4C6']
        )
    else:
        fig = px.histogram(
            df,
            x='duration_years',
            nbins=30,
            title=title,
            labels={'duration_years': 'Duration (Years)'},
            color_discrete_sequence=['#5A8A6F']
        )
        fig.update_traces(opacity=0.7)
    
    fig.update_layout(
        xaxis_title=stratify_by if stratify_by else "Duration (Years)",
        yaxis_title="Count" if not stratify_by else "Duration (Years)",
        height=400,
        showlegend=False
    )
    
    return fig
