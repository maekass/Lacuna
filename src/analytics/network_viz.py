"""
Visualization functions for network analysis
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import Optional


def plot_network_graph(
    nodes_df: pd.DataFrame,
    edges_df: pd.DataFrame,
    title: str = "Collaboration Network",
    layout: str = 'spring'
) -> go.Figure:
    """
    Create interactive network graph visualization.
    
    Args:
        nodes_df: DataFrame with node information
        edges_df: DataFrame with edge information
        title: Plot title
        layout: Layout algorithm ('spring', 'circular', 'random')
        
    Returns:
        Plotly figure
    """
    # Simple layout algorithm (spring-like)
    n_nodes = len(nodes_df)
    
    if layout == 'circular':
        angles = np.linspace(0, 2*np.pi, n_nodes, endpoint=False)
        x_pos = np.cos(angles)
        y_pos = np.sin(angles)
    elif layout == 'random':
        np.random.seed(42)
        x_pos = np.random.rand(n_nodes)
        y_pos = np.random.rand(n_nodes)
    else:  # spring layout (simplified)
        np.random.seed(42)
        x_pos = np.random.randn(n_nodes)
        y_pos = np.random.randn(n_nodes)
    
    # Create position mapping
    pos_map = {node_id: (x, y) for node_id, x, y in zip(nodes_df['id'], x_pos, y_pos)}
    
    # Create edge traces
    edge_traces = []
    for _, edge in edges_df.iterrows():
        if edge['source'] in pos_map and edge['target'] in pos_map:
            x0, y0 = pos_map[edge['source']]
            x1, y1 = pos_map[edge['target']]
            
            edge_traces.append(go.Scatter(
                x=[x0, x1, None],
                y=[y0, y1, None],
                mode='lines',
                line=dict(width=edge.get('weight', 1), color='#CCCCCC'),
                hoverinfo='none',
                showlegend=False
            ))
    
    # Create node trace
    node_x = [pos_map[node_id][0] for node_id in nodes_df['id']]
    node_y = [pos_map[node_id][1] for node_id in nodes_df['id']]
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        marker=dict(
            size=nodes_df['n_trials'].apply(lambda x: min(x * 2, 50)),
            color=nodes_df.get('completion_rate', 0.5),
            colorscale='Greens',
            showscale=True,
            colorbar=dict(title="Completion Rate"),
            line=dict(width=2, color='white')
        ),
        text=nodes_df['label'].apply(lambda x: x[:20] if len(x) > 20 else x),
        textposition='top center',
        hovertemplate='<b>%{text}</b><br>' +
                     'Trials: %{customdata[0]}<br>' +
                     'Completion Rate: %{customdata[1]:.1%}<extra></extra>',
        customdata=nodes_df[['n_trials', 'completion_rate']].values
    ))
    
    fig = go.Figure(data=edge_traces + [node_trace])
    
    fig.update_layout(
        title=title,
        showlegend=False,
        hovermode='closest',
        height=600,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)
    )
    
    return fig


def plot_degree_distribution(
    nodes_df: pd.DataFrame,
    title: str = "Network Degree Distribution"
) -> go.Figure:
    """
    Plot degree distribution histogram.
    
    Args:
        nodes_df: DataFrame with node centrality metrics
        title: Plot title
        
    Returns:
        Plotly figure
    """
    if 'degree' not in nodes_df.columns:
        # Calculate degree if not present
        nodes_df['degree'] = 0
    
    fig = px.histogram(
        nodes_df,
        x='degree',
        nbins=20,
        title=title,
        labels={'degree': 'Degree (Number of Connections)', 'count': 'Number of Nodes'},
        color_discrete_sequence=['#5A8A6F']
    )
    
    fig.update_layout(
        height=400,
        showlegend=False
    )
    
    return fig


def plot_centrality_ranking(
    top_players_df: pd.DataFrame,
    title: str = "Top Network Players by Centrality"
) -> go.Figure:
    """
    Plot top players ranked by centrality.
    
    Args:
        top_players_df: DataFrame with top players
        title: Plot title
        
    Returns:
        Plotly figure
    """
    df = top_players_df.copy().head(10)
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        y=df['id'],
        x=df['centrality_score'],
        orientation='h',
        marker_color='#5A8A6F',
        text=df['centrality_score'].apply(lambda x: f"{x:.3f}"),
        textposition='outside',
        hovertemplate='<b>%{y}</b><br>' +
                     'Centrality: %{x:.3f}<br>' +
                     'Trials: %{customdata[0]}<br>' +
                     'Completion Rate: %{customdata[1]:.1%}<extra></extra>',
        customdata=df[['n_trials', 'completion_rate']].values
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Centrality Score",
        yaxis_title="",
        height=max(400, len(df) * 40),
        showlegend=False
    )
    
    return fig


def plot_bipartite_network(
    nodes_df: pd.DataFrame,
    edges_df: pd.DataFrame,
    title: str = "Drug-Disease Network"
) -> go.Figure:
    """
    Plot bipartite network (drugs on left, diseases on right).
    
    Args:
        nodes_df: DataFrame with nodes (type: 'drug' or 'disease')
        edges_df: DataFrame with edges
        title: Plot title
        
    Returns:
        Plotly figure
    """
    # Separate drug and disease nodes
    drugs = nodes_df[nodes_df['type'] == 'drug'].copy()
    diseases = nodes_df[nodes_df['type'] == 'disease'].copy()
    
    # Position drugs on left, diseases on right
    drug_y = np.linspace(0, 1, len(drugs))
    disease_y = np.linspace(0, 1, len(diseases))
    
    drug_pos = {drug_id: (0, y) for drug_id, y in zip(drugs['id'], drug_y)}
    disease_pos = {disease_id: (1, y) for disease_id, y in zip(diseases['id'], disease_y)}
    
    pos_map = {**drug_pos, **disease_pos}
    
    # Create edge traces
    edge_traces = []
    for _, edge in edges_df.iterrows():
        if edge['source'] in pos_map and edge['target'] in pos_map:
            x0, y0 = pos_map[edge['source']]
            x1, y1 = pos_map[edge['target']]
            
            edge_traces.append(go.Scatter(
                x=[x0, x1, None],
                y=[y0, y1, None],
                mode='lines',
                line=dict(width=1, color='rgba(90, 138, 111, 0.3)'),
                hoverinfo='none',
                showlegend=False
            ))
    
    # Drug nodes
    drug_trace = go.Scatter(
        x=[0] * len(drugs),
        y=drug_y,
        mode='markers+text',
        marker=dict(size=15, color='#5A8A6F', line=dict(width=2, color='white')),
        text=drugs['label'],
        textposition='middle left',
        name='Drugs',
        hovertemplate='<b>%{text}</b><br>Trials: %{customdata}<extra></extra>',
        customdata=drugs['n_trials']
    ))
    
    # Disease nodes
    disease_trace = go.Scatter(
        x=[1] * len(diseases),
        y=disease_y,
        mode='markers+text',
        marker=dict(size=15, color='#7BA88C', line=dict(width=2, color='white')),
        text=diseases['label'],
        textposition='middle right',
        name='Diseases',
        hovertemplate='<b>%{text}</b><br>Trials: %{customdata}<extra></extra>',
        customdata=diseases['n_trials']
    ))
    
    fig = go.Figure(data=edge_traces + [drug_trace, disease_trace])
    
    fig.update_layout(
        title=title,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        height=max(600, max(len(drugs), len(diseases)) * 30),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-0.3, 1.3]),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)
    )
    
    return fig


def plot_repurposing_candidates(
    repurposing_df: pd.DataFrame,
    title: str = "Drug Repurposing Candidates"
) -> go.Figure:
    """
    Plot drug repurposing opportunities.
    
    Args:
        repurposing_df: DataFrame with repurposing candidates
        title: Plot title
        
    Returns:
        Plotly figure
    """
    df = repurposing_df.copy().head(15)
    
    fig = go.Figure()
    
    # Color by repurposing potential
    color_map = {'High': '#5A8A6F', 'Medium': '#7BA88C', 'Low': '#9CC6A9'}
    df['color'] = df['repurposing_potential'].map(color_map)
    
    fig.add_trace(go.Scatter(
        x=df['n_diseases'],
        y=df['success_rate'],
        mode='markers+text',
        marker=dict(
            size=df['n_trials'] * 5,
            color=df['color'],
            line=dict(width=2, color='white')
        ),
        text=df['drug'],
        textposition='top center',
        hovertemplate='<b>%{text}</b><br>' +
                     'Diseases: %{x}<br>' +
                     'Success Rate: %{y:.1%}<br>' +
                     'Trials: %{customdata[0]}<br>' +
                     'Potential: %{customdata[1]}<extra></extra>',
        customdata=df[['n_trials', 'repurposing_potential']].values
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Number of Diseases Tested",
        yaxis_title="Success Rate",
        yaxis=dict(tickformat='.0%'),
        height=500,
        showlegend=False
    )
    
    return fig
