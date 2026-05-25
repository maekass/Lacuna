"""
Network Analysis for Clinical Trials
Company collaboration networks, investigator networks, and drug-disease relationships
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Optional
from collections import defaultdict, Counter
import itertools


def build_collaboration_network(trials_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Build company collaboration network from clinical trials.
    
    Args:
        trials_df: DataFrame with trial data including sponsor_name
        
    Returns:
        Tuple of (nodes_df, edges_df, network_stats)
    """
    # Extract unique sponsors
    sponsors = trials_df['sponsor_name'].dropna().unique()
    
    # Build nodes
    node_data = []
    for sponsor in sponsors:
        sponsor_trials = trials_df[trials_df['sponsor_name'] == sponsor]
        node_data.append({
            'id': sponsor,
            'label': sponsor,
            'n_trials': len(sponsor_trials),
            'n_completed': (sponsor_trials['status'] == 'COMPLETED').sum(),
            'completion_rate': (sponsor_trials['status'] == 'COMPLETED').sum() / len(sponsor_trials),
            'sponsor_type': sponsor_trials['sponsor_type'].mode()[0] if len(sponsor_trials) > 0 else 'UNKNOWN'
        })
    
    nodes_df = pd.DataFrame(node_data)
    
    # Build edges (co-sponsorship or drug overlap)
    edges = []
    
    # Group trials by drug to find collaborations
    if 'primary_drug' in trials_df.columns:
        for drug in trials_df['primary_drug'].dropna().unique():
            drug_trials = trials_df[trials_df['primary_drug'] == drug]
            drug_sponsors = drug_trials['sponsor_name'].dropna().unique()
            
            # Create edges between all sponsors working on same drug
            for s1, s2 in itertools.combinations(drug_sponsors, 2):
                edges.append({
                    'source': s1,
                    'target': s2,
                    'weight': 1,
                    'drug': drug,
                    'relationship': 'shared_drug'
                })
    
    # Aggregate edge weights
    edge_counts = defaultdict(lambda: {'weight': 0, 'drugs': []})
    for edge in edges:
        key = tuple(sorted([edge['source'], edge['target']]))
        edge_counts[key]['weight'] += edge['weight']
        edge_counts[key]['drugs'].append(edge['drug'])
    
    edges_df = pd.DataFrame([
        {
            'source': key[0],
            'target': key[1],
            'weight': data['weight'],
            'drugs': ', '.join(set(data['drugs']))
        }
        for key, data in edge_counts.items()
    ])
    
    # Network statistics
    stats = {
        'n_nodes': len(nodes_df),
        'n_edges': len(edges_df),
        'density': len(edges_df) / (len(nodes_df) * (len(nodes_df) - 1) / 2) if len(nodes_df) > 1 else 0,
        'avg_degree': (2 * len(edges_df)) / len(nodes_df) if len(nodes_df) > 0 else 0
    }
    
    return nodes_df, edges_df, stats


def calculate_centrality_metrics(nodes_df: pd.DataFrame, edges_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate network centrality metrics for nodes.
    
    Args:
        nodes_df: DataFrame with node information
        edges_df: DataFrame with edge information
        
    Returns:
        DataFrame with centrality metrics
    """
    # Degree centrality (number of connections)
    degree = defaultdict(int)
    for _, edge in edges_df.iterrows():
        degree[edge['source']] += 1
        degree[edge['target']] += 1
    
    # Weighted degree (sum of edge weights)
    weighted_degree = defaultdict(float)
    for _, edge in edges_df.iterrows():
        weight = edge.get('weight', 1)
        weighted_degree[edge['source']] += weight
        weighted_degree[edge['target']] += weight
    
    # Add centrality to nodes
    nodes_with_centrality = nodes_df.copy()
    nodes_with_centrality['degree'] = nodes_with_centrality['id'].map(degree).fillna(0)
    nodes_with_centrality['weighted_degree'] = nodes_with_centrality['id'].map(weighted_degree).fillna(0)
    
    # Normalize
    max_degree = nodes_with_centrality['degree'].max()
    if max_degree > 0:
        nodes_with_centrality['degree_normalized'] = nodes_with_centrality['degree'] / max_degree
    else:
        nodes_with_centrality['degree_normalized'] = 0
    
    return nodes_with_centrality


def identify_communities(nodes_df: pd.DataFrame, edges_df: pd.DataFrame) -> pd.DataFrame:
    """
    Identify communities/clusters in the network using simple heuristics.
    
    Args:
        nodes_df: DataFrame with node information
        edges_df: DataFrame with edge information
        
    Returns:
        DataFrame with community assignments
    """
    # Simple community detection based on sponsor type and connections
    nodes_with_community = nodes_df.copy()
    
    # Assign communities based on sponsor type
    community_map = {
        'INDUSTRY': 0,
        'ACADEMIC': 1,
        'NIH': 2,
        'OTHER': 3,
        'UNKNOWN': 4
    }
    
    nodes_with_community['community'] = nodes_with_community['sponsor_type'].map(community_map).fillna(4)
    
    return nodes_with_community


def drug_disease_bipartite_network(trials_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Build bipartite network of drugs and diseases.
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        Tuple of (nodes_df, edges_df)
    """
    nodes = []
    edges = []
    
    # Drug nodes
    if 'primary_drug' in trials_df.columns:
        drugs = trials_df['primary_drug'].dropna().unique()
        for drug in drugs:
            drug_trials = trials_df[trials_df['primary_drug'] == drug]
            nodes.append({
                'id': f"drug_{drug}",
                'label': drug,
                'type': 'drug',
                'n_trials': len(drug_trials)
            })
    
    # Disease nodes
    if 'disease_id' in trials_df.columns:
        diseases = trials_df['disease_id'].dropna().unique()
        for disease in diseases:
            disease_trials = trials_df[trials_df['disease_id'] == disease]
            nodes.append({
                'id': f"disease_{disease}",
                'label': disease,
                'type': 'disease',
                'n_trials': len(disease_trials)
            })
    
    # Edges (drug-disease pairs)
    if 'primary_drug' in trials_df.columns and 'disease_id' in trials_df.columns:
        for _, trial in trials_df.iterrows():
            if pd.notna(trial['primary_drug']) and pd.notna(trial['disease_id']):
                edges.append({
                    'source': f"drug_{trial['primary_drug']}",
                    'target': f"disease_{trial['disease_id']}",
                    'trial_id': trial.get('nct_id', ''),
                    'phase': trial.get('phase', 'UNKNOWN')
                })
    
    nodes_df = pd.DataFrame(nodes)
    edges_df = pd.DataFrame(edges)
    
    return nodes_df, edges_df


def identify_drug_repurposing_opportunities(trials_df: pd.DataFrame) -> pd.DataFrame:
    """
    Identify potential drug repurposing opportunities based on network patterns.
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        DataFrame with repurposing candidates
    """
    if 'primary_drug' not in trials_df.columns or 'disease_id' not in trials_df.columns:
        return pd.DataFrame()
    
    # Find drugs tested in multiple diseases
    drug_disease_pairs = trials_df[['primary_drug', 'disease_id', 'status', 'phase']].dropna()
    
    drug_stats = []
    for drug in drug_disease_pairs['primary_drug'].unique():
        drug_data = drug_disease_pairs[drug_disease_pairs['primary_drug'] == drug]
        diseases = drug_data['disease_id'].unique()
        
        if len(diseases) > 1:  # Drug tested in multiple diseases
            success_rate = (drug_data['status'] == 'COMPLETED').sum() / len(drug_data)
            
            drug_stats.append({
                'drug': drug,
                'n_diseases': len(diseases),
                'diseases': ', '.join(diseases),
                'n_trials': len(drug_data),
                'success_rate': success_rate,
                'max_phase': drug_data['phase'].mode()[0] if len(drug_data) > 0 else 'UNKNOWN',
                'repurposing_potential': 'High' if len(diseases) > 2 and success_rate > 0.5 else 'Medium'
            })
    
    return pd.DataFrame(drug_stats).sort_values('n_diseases', ascending=False)


def investigator_network(trials_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Build investigator collaboration network (if investigator data available).
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        Tuple of (nodes_df, edges_df)
    """
    # Placeholder - would need investigator data from ClinicalTrials.gov
    # For now, use sponsor as proxy
    return build_collaboration_network(trials_df)[:2]


def network_summary_statistics(nodes_df: pd.DataFrame, edges_df: pd.DataFrame) -> dict:
    """
    Calculate comprehensive network statistics.
    
    Args:
        nodes_df: DataFrame with nodes
        edges_df: DataFrame with edges
        
    Returns:
        Dictionary of network statistics
    """
    n_nodes = len(nodes_df)
    n_edges = len(edges_df)
    
    # Degree distribution
    degree_dist = defaultdict(int)
    for _, edge in edges_df.iterrows():
        degree_dist[edge['source']] += 1
        degree_dist[edge['target']] += 1
    
    degrees = list(degree_dist.values())
    
    stats = {
        'n_nodes': n_nodes,
        'n_edges': n_edges,
        'density': n_edges / (n_nodes * (n_nodes - 1) / 2) if n_nodes > 1 else 0,
        'avg_degree': np.mean(degrees) if degrees else 0,
        'max_degree': max(degrees) if degrees else 0,
        'min_degree': min(degrees) if degrees else 0,
        'isolated_nodes': sum(1 for d in degree_dist.values() if d == 0),
        'connected_components': 'Requires graph library for accurate calculation'
    }
    
    return stats


def find_key_players(nodes_df: pd.DataFrame, edges_df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """
    Identify key players (most central nodes) in the network.
    
    Args:
        nodes_df: DataFrame with nodes
        edges_df: DataFrame with edges
        top_n: Number of top players to return
        
    Returns:
        DataFrame with top players ranked by centrality
    """
    nodes_with_centrality = calculate_centrality_metrics(nodes_df, edges_df)
    
    # Rank by multiple metrics
    nodes_with_centrality['centrality_score'] = (
        nodes_with_centrality['degree_normalized'] * 0.4 +
        (nodes_with_centrality['n_trials'] / nodes_with_centrality['n_trials'].max()) * 0.3 +
        nodes_with_centrality['completion_rate'] * 0.3
    )
    
    top_players = nodes_with_centrality.nlargest(top_n, 'centrality_score')
    
    return top_players[['id', 'n_trials', 'completion_rate', 'degree', 'centrality_score']]
