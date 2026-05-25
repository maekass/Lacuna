"""
Survival Analysis for Clinical Trials
Kaplan-Meier curves, Cox proportional hazards, and competing risks analysis
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Tuple, Optional
import warnings

try:
    from lifelines import KaplanMeierFitter, CoxPHFitter
    from lifelines.statistics import logrank_test, multivariate_logrank_test
    LIFELINES_AVAILABLE = True
except ImportError:
    LIFELINES_AVAILABLE = False
    KaplanMeierFitter = None
    CoxPHFitter = None


def prepare_survival_data(trials_df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare trial data for survival analysis.
    
    Args:
        trials_df: DataFrame with clinical trials data
        
    Returns:
        DataFrame with duration, event, and covariates for survival analysis
    """
    df = trials_df.copy()
    
    # Parse dates
    df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
    df['completion_date'] = pd.to_datetime(df['completion_date'], errors='coerce')
    
    # Calculate duration in days
    df['duration_days'] = (df['completion_date'] - df['start_date']).dt.days
    
    # Define event (1 = completed/terminated, 0 = censored/ongoing)
    df['event'] = df['status'].isin(['COMPLETED', 'TERMINATED']).astype(int)
    
    # For ongoing trials, use current date as censoring time
    current_date = pd.Timestamp.now()
    mask_ongoing = df['duration_days'].isna()
    df.loc[mask_ongoing, 'duration_days'] = (current_date - df.loc[mask_ongoing, 'start_date']).dt.days
    
    # Remove invalid durations
    df = df[df['duration_days'] > 0].copy()
    
    # Add covariates
    df['phase_numeric'] = df['phase'].map({
        'EARLY_PHASE1': 0,
        'PHASE1': 1,
        'PHASE1_PHASE2': 1.5,
        'PHASE2': 2,
        'PHASE2_PHASE3': 2.5,
        'PHASE3': 3,
        'PHASE4': 4,
        'NA': np.nan
    })
    
    df['is_industry_sponsored'] = (df['sponsor_type'] == 'INDUSTRY').astype(int)
    df['log_enrollment'] = np.log1p(df['enrollment'].fillna(0))
    
    return df


def kaplan_meier_analysis(
    trials_df: pd.DataFrame,
    stratify_by: Optional[str] = None,
    label: str = "All Trials"
) -> Tuple[pd.DataFrame, dict]:
    """
    Perform Kaplan-Meier survival analysis.
    
    Args:
        trials_df: DataFrame with trial data
        stratify_by: Column name to stratify by (e.g., 'phase', 'sponsor_type')
        label: Label for the analysis
        
    Returns:
        Tuple of (survival_table, metadata)
    """
    if not LIFELINES_AVAILABLE:
        raise ImportError("lifelines package required for survival analysis. Install with: pip install lifelines")
    
    df = prepare_survival_data(trials_df)
    
    if stratify_by and stratify_by in df.columns:
        # Stratified analysis
        groups = df[stratify_by].dropna().unique()
        results = {}
        survival_curves = []
        
        for group in groups:
            group_df = df[df[stratify_by] == group]
            if len(group_df) < 2:
                continue
                
            kmf = KaplanMeierFitter()
            kmf.fit(
                durations=group_df['duration_days'],
                event_observed=group_df['event'],
                label=str(group)
            )
            
            curve = kmf.survival_function_.reset_index()
            curve.columns = ['timeline', f'{group}']
            survival_curves.append(curve)
            
            results[str(group)] = {
                'median_survival': kmf.median_survival_time_,
                'n_trials': len(group_df),
                'n_events': group_df['event'].sum()
            }
        
        # Merge all curves
        survival_table = survival_curves[0]
        for curve in survival_curves[1:]:
            survival_table = survival_table.merge(curve, on='timeline', how='outer')
        survival_table = survival_table.sort_values('timeline').fillna(method='ffill')
        
        # Log-rank test
        if len(groups) == 2:
            g1 = df[df[stratify_by] == groups[0]]
            g2 = df[df[stratify_by] == groups[1]]
            lr_result = logrank_test(
                g1['duration_days'], g2['duration_days'],
                g1['event'], g2['event']
            )
            results['logrank_p_value'] = lr_result.p_value
        
        metadata = {
            'type': 'stratified',
            'stratify_by': stratify_by,
            'groups': results
        }
        
    else:
        # Overall analysis
        kmf = KaplanMeierFitter()
        kmf.fit(
            durations=df['duration_days'],
            event_observed=df['event'],
            label=label
        )
        
        survival_table = kmf.survival_function_.reset_index()
        survival_table.columns = ['timeline', 'survival_probability']
        
        metadata = {
            'type': 'overall',
            'median_survival': kmf.median_survival_time_,
            'n_trials': len(df),
            'n_events': df['event'].sum()
        }
    
    return survival_table, metadata


def cox_proportional_hazards(trials_df: pd.DataFrame) -> Tuple[pd.DataFrame, dict]:
    """
    Fit Cox proportional hazards model to identify trial success factors.
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        Tuple of (coefficients_df, model_summary)
    """
    if not LIFELINES_AVAILABLE:
        raise ImportError("lifelines package required. Install with: pip install lifelines")
    
    df = prepare_survival_data(trials_df)
    
    # Select covariates
    covariates = ['phase_numeric', 'is_industry_sponsored', 'log_enrollment']
    df_cox = df[['duration_days', 'event'] + covariates].dropna()
    
    if len(df_cox) < 10:
        raise ValueError("Insufficient data for Cox regression (need at least 10 complete cases)")
    
    # Fit model
    cph = CoxPHFitter()
    cph.fit(df_cox, duration_col='duration_days', event_col='event')
    
    # Extract results
    coefficients = cph.summary.copy()
    coefficients['hazard_ratio'] = np.exp(coefficients['coef'])
    coefficients['feature'] = coefficients.index
    
    # Interpret hazard ratios
    def interpret_hr(row):
        hr = row['hazard_ratio']
        p = row['p']
        if p > 0.05:
            return "Not significant"
        elif hr > 1:
            return f"{(hr-1)*100:.1f}% increased risk"
        else:
            return f"{(1-hr)*100:.1f}% decreased risk"
    
    coefficients['interpretation'] = coefficients.apply(interpret_hr, axis=1)
    
    metadata = {
        'concordance_index': cph.concordance_index_,
        'log_likelihood': cph.log_likelihood_,
        'aic': cph.AIC_,
        'n_observations': len(df_cox),
        'n_events': df_cox['event'].sum()
    }
    
    return coefficients[['feature', 'coef', 'hazard_ratio', 'p', 'interpretation']], metadata


def competing_risks_analysis(trials_df: pd.DataFrame) -> pd.DataFrame:
    """
    Analyze competing risks: trial completion vs termination.
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        DataFrame with cumulative incidence functions
    """
    df = prepare_survival_data(trials_df)
    
    # Define competing events
    # 1 = Completed successfully
    # 2 = Terminated/failed
    # 0 = Censored (ongoing)
    
    df['competing_event'] = 0
    df.loc[df['status'] == 'COMPLETED', 'competing_event'] = 1
    df.loc[df['status'] == 'TERMINATED', 'competing_event'] = 2
    
    # Calculate cumulative incidence
    time_points = np.linspace(0, df['duration_days'].max(), 100)
    results = []
    
    for t in time_points:
        at_risk = (df['duration_days'] >= t).sum()
        completed = ((df['duration_days'] <= t) & (df['competing_event'] == 1)).sum()
        terminated = ((df['duration_days'] <= t) & (df['competing_event'] == 2)).sum()
        
        results.append({
            'days': t,
            'at_risk': at_risk,
            'cumulative_completed': completed / len(df) if len(df) > 0 else 0,
            'cumulative_terminated': terminated / len(df) if len(df) > 0 else 0
        })
    
    return pd.DataFrame(results)


def trial_duration_statistics(trials_df: pd.DataFrame) -> dict:
    """
    Calculate summary statistics for trial durations.
    
    Args:
        trials_df: DataFrame with trial data
        
    Returns:
        Dictionary of statistics
    """
    df = prepare_survival_data(trials_df)
    
    completed = df[df['status'] == 'COMPLETED']
    terminated = df[df['status'] == 'TERMINATED']
    
    stats = {
        'overall': {
            'median_days': df['duration_days'].median(),
            'mean_days': df['duration_days'].mean(),
            'std_days': df['duration_days'].std(),
            'min_days': df['duration_days'].min(),
            'max_days': df['duration_days'].max(),
            'n_trials': len(df)
        },
        'completed': {
            'median_days': completed['duration_days'].median(),
            'mean_days': completed['duration_days'].mean(),
            'n_trials': len(completed)
        },
        'terminated': {
            'median_days': terminated['duration_days'].median(),
            'mean_days': terminated['duration_days'].mean(),
            'n_trials': len(terminated)
        },
        'by_phase': df.groupby('phase')['duration_days'].agg(['median', 'mean', 'count']).to_dict('index')
    }
    
    return stats
