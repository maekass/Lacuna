"""
Tableau-Style Visualizations for Healthcare Investment Analysis
Professional, publication-ready charts with Tableau aesthetic
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple

# Tableau Color Palettes
TABLEAU_COLORS = {
    'blue': '#4E79A7',
    'orange': '#F28E2B',
    'red': '#E15759',
    'teal': '#76B7B2',
    'green': '#59A14F',
    'yellow': '#EDC948',
    'purple': '#B07AA1',
    'pink': '#FF9DA7',
    'brown': '#9C755F',
    'gray': '#BAB0AC'
}

TABLEAU_10 = list(TABLEAU_COLORS.values())

TABLEAU_20 = [
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
    '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
    '#A0CBE8', '#FFBE7D', '#FF9D9A', '#86BCB6', '#8CD17D',
    '#F1CE63', '#D4A6C8', '#FABFD2', '#D7B5A6', '#D4D4D4'
]

# Tableau Layout Template
TABLEAU_LAYOUT = dict(
    font=dict(family="Tableau Book, Arial, sans-serif", size=12, color="#333333"),
    plot_bgcolor='#FFFFFF',
    paper_bgcolor='#F5F5F5',
    title_font=dict(size=16, color="#333333", family="Tableau Medium, Arial, sans-serif"),
    showlegend=True,
    legend=dict(
        bgcolor='rgba(255,255,255,0.9)',
        bordercolor='#CCCCCC',
        borderwidth=1,
        font=dict(size=11)
    ),
    margin=dict(l=60, r=40, t=80, b=60),
    hovermode='closest'
)


class TableauVisualizer:
    """
    Creates Tableau-style visualizations for healthcare investment analysis
    """
    
    def __init__(self, color_palette: str = 'tableau10'):
        """
        Initialize with color palette
        
        Args:
            color_palette: 'tableau10', 'tableau20', or custom list
        """
        if color_palette == 'tableau10':
            self.colors = TABLEAU_10
        elif color_palette == 'tableau20':
            self.colors = TABLEAU_20
        else:
            self.colors = color_palette
    
    def clinical_trial_funnel(self, 
                              phase_data: pd.DataFrame,
                              disease_name: str = "Disease") -> go.Figure:
        """
        Tableau-style funnel chart showing clinical trial progression
        
        Args:
            phase_data: DataFrame with columns ['Phase', 'Count', 'Success_Rate']
            disease_name: Name of disease for title
        
        Returns:
            Plotly Figure object
        """
        fig = go.Figure()
        
        # Calculate funnel widths
        max_count = phase_data['Count'].max()
        
        for idx, row in phase_data.iterrows():
            fig.add_trace(go.Funnel(
                name=row['Phase'],
                y=[row['Phase']],
                x=[row['Count']],
                textposition="inside",
                textinfo="value+percent initial",
                marker=dict(
                    color=self.colors[idx % len(self.colors)],
                    line=dict(width=2, color='white')
                ),
                connector=dict(line=dict(color='#CCCCCC', width=2))
            ))
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title=f"{disease_name} Clinical Trial Funnel",
            showlegend=False,
            height=500
        )
        
        return fig
    
    def portfolio_treemap(self,
                         holdings: pd.DataFrame,
                         value_col: str = 'market_value',
                         label_col: str = 'company',
                         sector_col: str = 'sector',
                         color_metric: str = 'return_pct') -> go.Figure:
        """
        Tableau-style treemap for portfolio composition
        
        Args:
            holdings: DataFrame with portfolio holdings
            value_col: Column for box size
            label_col: Column for labels
            sector_col: Column for grouping
            color_metric: Column for color scale (e.g., returns)
        
        Returns:
            Plotly Figure object
        """
        fig = px.treemap(
            holdings,
            path=[sector_col, label_col],
            values=value_col,
            color=color_metric,
            color_continuous_scale=[
                [0, TABLEAU_COLORS['red']],
                [0.5, TABLEAU_COLORS['gray']],
                [1, TABLEAU_COLORS['green']]
            ],
            color_continuous_midpoint=0,
            hover_data={
                value_col: ':$,.0f',
                color_metric: ':.2%'
            }
        )
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title="Portfolio Composition & Performance",
            height=600
        )
        
        fig.update_traces(
            textposition='middle center',
            textfont=dict(size=11, color='white'),
            marker=dict(line=dict(width=2, color='white'))
        )
        
        return fig
    
    def dual_axis_timeline(self,
                          df: pd.DataFrame,
                          date_col: str,
                          y1_col: str,
                          y2_col: str,
                          y1_name: str = "Metric 1",
                          y2_name: str = "Metric 2",
                          title: str = "Dual Axis Timeline") -> go.Figure:
        """
        Tableau-style dual-axis time series (e.g., trials vs stock price)
        
        Args:
            df: DataFrame with time series data
            date_col: Date column name
            y1_col: First metric column
            y2_col: Second metric column
            y1_name: Display name for first metric
            y2_name: Display name for second metric
            title: Chart title
        
        Returns:
            Plotly Figure object
        """
        fig = make_subplots(specs=[[{"secondary_y": True}]])
        
        # Primary axis
        fig.add_trace(
            go.Scatter(
                x=df[date_col],
                y=df[y1_col],
                name=y1_name,
                line=dict(color=TABLEAU_COLORS['blue'], width=3),
                mode='lines+markers',
                marker=dict(size=6)
            ),
            secondary_y=False
        )
        
        # Secondary axis
        fig.add_trace(
            go.Scatter(
                x=df[date_col],
                y=df[y2_col],
                name=y2_name,
                line=dict(color=TABLEAU_COLORS['orange'], width=3, dash='dot'),
                mode='lines+markers',
                marker=dict(size=6, symbol='diamond')
            ),
            secondary_y=True
        )
        
        fig.update_xaxes(
            title_text="Date",
            showgrid=True,
            gridcolor='#E5E5E5',
            zeroline=False
        )
        
        fig.update_yaxes(
            title_text=y1_name,
            secondary_y=False,
            showgrid=True,
            gridcolor='#E5E5E5',
            zeroline=False
        )
        
        fig.update_yaxes(
            title_text=y2_name,
            secondary_y=True,
            showgrid=False,
            zeroline=False
        )
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title=title,
            height=500,
            hovermode='x unified'
        )
        
        return fig
    
    def bullet_chart(self,
                    metrics: pd.DataFrame,
                    metric_col: str = 'metric',
                    actual_col: str = 'actual',
                    target_col: str = 'target',
                    ranges_col: str = 'ranges') -> go.Figure:
        """
        Tableau-style bullet chart for KPI tracking
        
        Args:
            metrics: DataFrame with KPI data
            metric_col: Column with metric names
            actual_col: Column with actual values
            target_col: Column with target values
            ranges_col: Column with performance ranges (list of 3 values)
        
        Returns:
            Plotly Figure object
        """
        fig = go.Figure()
        
        for idx, row in metrics.iterrows():
            ranges = row[ranges_col] if ranges_col in metrics.columns else [50, 75, 100]
            
            # Background ranges
            fig.add_trace(go.Bar(
                y=[row[metric_col]],
                x=[ranges[2]],
                orientation='h',
                marker=dict(color='#E5E5E5'),
                showlegend=False,
                hoverinfo='skip'
            ))
            
            fig.add_trace(go.Bar(
                y=[row[metric_col]],
                x=[ranges[1]],
                orientation='h',
                marker=dict(color='#CCCCCC'),
                showlegend=False,
                hoverinfo='skip'
            ))
            
            fig.add_trace(go.Bar(
                y=[row[metric_col]],
                x=[ranges[0]],
                orientation='h',
                marker=dict(color='#B3B3B3'),
                showlegend=False,
                hoverinfo='skip'
            ))
            
            # Actual value
            fig.add_trace(go.Bar(
                y=[row[metric_col]],
                x=[row[actual_col]],
                orientation='h',
                marker=dict(color=TABLEAU_COLORS['blue']),
                name='Actual',
                showlegend=(idx == 0)
            ))
            
            # Target marker
            fig.add_trace(go.Scatter(
                y=[row[metric_col]],
                x=[row[target_col]],
                mode='markers',
                marker=dict(
                    symbol='line-ns',
                    size=20,
                    color='black',
                    line=dict(width=3)
                ),
                name='Target',
                showlegend=(idx == 0)
            ))
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title="KPI Performance Dashboard",
            barmode='overlay',
            height=400,
            xaxis=dict(title="Value", showgrid=True, gridcolor='#E5E5E5')
        )
        
        return fig
    
    def waterfall_chart(self,
                       categories: List[str],
                       values: List[float],
                       title: str = "Waterfall Analysis") -> go.Figure:
        """
        Tableau-style waterfall chart for variance analysis
        
        Args:
            categories: List of category names
            values: List of values (positive/negative changes)
            title: Chart title
        
        Returns:
            Plotly Figure object
        """
        # Calculate cumulative values
        cumulative = [0]
        for val in values[:-1]:
            cumulative.append(cumulative[-1] + val)
        
        # Determine colors
        colors = []
        for val in values:
            if val > 0:
                colors.append(TABLEAU_COLORS['green'])
            elif val < 0:
                colors.append(TABLEAU_COLORS['red'])
            else:
                colors.append(TABLEAU_COLORS['gray'])
        
        fig = go.Figure(go.Waterfall(
            name="",
            orientation="v",
            measure=["relative"] * (len(values) - 1) + ["total"],
            x=categories,
            y=values,
            connector=dict(line=dict(color=TABLEAU_COLORS['gray'], width=2)),
            increasing=dict(marker=dict(color=TABLEAU_COLORS['green'])),
            decreasing=dict(marker=dict(color=TABLEAU_COLORS['red'])),
            totals=dict(marker=dict(color=TABLEAU_COLORS['blue']))
        ))
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title=title,
            showlegend=False,
            height=500,
            xaxis=dict(title="", showgrid=False),
            yaxis=dict(title="Value", showgrid=True, gridcolor='#E5E5E5')
        )
        
        return fig
    
    def scatter_matrix(self,
                      df: pd.DataFrame,
                      dimensions: List[str],
                      color_col: Optional[str] = None,
                      title: str = "Correlation Matrix") -> go.Figure:
        """
        Tableau-style scatter plot matrix (SPLOM)
        
        Args:
            df: DataFrame with data
            dimensions: List of column names to plot
            color_col: Optional column for color coding
            title: Chart title
        
        Returns:
            Plotly Figure object
        """
        if color_col:
            fig = px.scatter_matrix(
                df,
                dimensions=dimensions,
                color=color_col,
                color_continuous_scale=[
                    [0, TABLEAU_COLORS['blue']],
                    [0.5, TABLEAU_COLORS['purple']],
                    [1, TABLEAU_COLORS['orange']]
                ]
            )
        else:
            fig = px.scatter_matrix(
                df,
                dimensions=dimensions,
                color_discrete_sequence=[TABLEAU_COLORS['blue']]
            )
        
        fig.update_traces(
            diagonal_visible=False,
            marker=dict(size=4, opacity=0.6, line=dict(width=0))
        )
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title=title,
            height=800,
            width=800
        )
        
        return fig
    
    def geographic_heatmap(self,
                          df: pd.DataFrame,
                          location_col: str,
                          value_col: str,
                          title: str = "Geographic Distribution") -> go.Figure:
        """
        Tableau-style choropleth map
        
        Args:
            df: DataFrame with geographic data
            location_col: Column with state/country codes
            value_col: Column with values to display
            title: Chart title
        
        Returns:
            Plotly Figure object
        """
        fig = go.Figure(data=go.Choropleth(
            locations=df[location_col],
            z=df[value_col],
            locationmode='USA-states',
            colorscale=[
                [0, TABLEAU_COLORS['blue']],
                [0.5, TABLEAU_COLORS['teal']],
                [1, TABLEAU_COLORS['orange']]
            ],
            colorbar=dict(
                title=value_col,
                thickness=15,
                len=0.7,
                bgcolor='rgba(255,255,255,0.9)',
                bordercolor='#CCCCCC',
                borderwidth=1
            ),
            marker_line_color='white',
            marker_line_width=1.5
        ))
        
        fig.update_layout(
            **TABLEAU_LAYOUT,
            title=title,
            geo=dict(
                scope='usa',
                projection=go.layout.geo.Projection(type='albers usa'),
                showlakes=True,
                lakecolor='rgb(255, 255, 255)'
            ),
            height=600
        )
        
        return fig


def create_dashboard_summary(metrics: Dict[str, float]) -> go.Figure:
    """
    Create Tableau-style executive summary dashboard
    
    Args:
        metrics: Dictionary of key metrics
    
    Returns:
        Plotly Figure with 4-panel summary
    """
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=list(metrics.keys()),
        specs=[[{"type": "indicator"}, {"type": "indicator"}],
               [{"type": "indicator"}, {"type": "indicator"}]]
    )
    
    positions = [(1, 1), (1, 2), (2, 1), (2, 2)]
    colors = [TABLEAU_COLORS['blue'], TABLEAU_COLORS['green'], 
              TABLEAU_COLORS['orange'], TABLEAU_COLORS['purple']]
    
    for (metric_name, value), (row, col), color in zip(metrics.items(), positions, colors):
        fig.add_trace(
            go.Indicator(
                mode="number+delta",
                value=value,
                title=dict(text=metric_name, font=dict(size=14)),
                number=dict(font=dict(size=40, color=color)),
                domain={'x': [0, 1], 'y': [0, 1]}
            ),
            row=row, col=col
        )
    
    fig.update_layout(
        **TABLEAU_LAYOUT,
        title="Executive Summary",
        height=500,
        showlegend=False
    )
    
    return fig
