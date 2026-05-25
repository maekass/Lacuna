"""
Causal Inference for Clinical Trials
Propensity score matching, difference-in-differences, and treatment effect estimation
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional, List
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors
from scipy import stats


def prepare_treatment_data(
    trials_df: pd.DataFrame,
    treatment_col: str,
    outcome_col: str = 'outcome'
) -> pd.DataFrame:
    """
    Prepare trial data for causal inference analysis.
    
    Args:
        trials_df: DataFrame with clinical trials
        treatment_col: Column indicating treatment (e.g., 'is_industry_sponsored')
        outcome_col: Column indicating outcome (e.g., 'outcome')
        
    Returns:
        Prepared DataFrame with treatment and outcome variables
    """
    df = trials_df.copy()
    
    # Encode outcome as binary (1 = success, 0 = failure)
    if outcome_col in df.columns:
        df['outcome_binary'] = df[outcome_col].isin(['SUCCESS', 'COMPLETED', 'APPROVED']).astype(int)
    else:
        # Use status as fallback
        df['outcome_binary'] = df['status'].isin(['COMPLETED']).astype(int)
    
    # Create covariates
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
    
    df['log_enrollment'] = np.log1p(df['enrollment'].fillna(0))
    
    # Parse dates for duration
    df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
    df['completion_date'] = pd.to_datetime(df['completion_date'], errors='coerce')
    df['duration_days'] = (df['completion_date'] - df['start_date']).dt.days
    df['log_duration'] = np.log1p(df['duration_days'].fillna(0))
    
    return df


def propensity_score_matching(
    trials_df: pd.DataFrame,
    treatment_col: str,
    covariates: List[str],
    outcome_col: str = 'outcome_binary',
    caliper: float = 0.1
) -> Tuple[pd.DataFrame, dict]:
    """
    Perform propensity score matching to estimate treatment effect.
    
    Args:
        trials_df: DataFrame with trial data
        treatment_col: Column indicating treatment assignment
        covariates: List of covariate column names
        outcome_col: Column with binary outcome
        caliper: Maximum allowed difference in propensity scores for matching
        
    Returns:
        Tuple of (matched_df, results_dict)
    """
    df = prepare_treatment_data(trials_df, treatment_col, outcome_col)
    
    # Remove rows with missing values in key columns
    analysis_cols = [treatment_col, outcome_col] + covariates
    df_clean = df[analysis_cols].dropna()
    
    if len(df_clean) < 20:
        raise ValueError("Insufficient data for propensity score matching (need at least 20 complete cases)")
    
    # Estimate propensity scores
    X = df_clean[covariates]
    treatment = df_clean[treatment_col]
    
    ps_model = LogisticRegression(max_iter=1000, random_state=42)
    ps_model.fit(X, treatment)
    
    df_clean['propensity_score'] = ps_model.predict_proba(X)[:, 1]
    
    # Separate treated and control groups
    treated = df_clean[df_clean[treatment_col] == 1].copy()
    control = df_clean[df_clean[treatment_col] == 0].copy()
    
    if len(treated) == 0 or len(control) == 0:
        raise ValueError("Need both treated and control units for matching")
    
    # Match treated to controls using nearest neighbor on propensity score
    nn = NearestNeighbors(n_neighbors=1, metric='euclidean')
    nn.fit(control[['propensity_score']].values)
    
    distances, indices = nn.kneighbors(treated[['propensity_score']].values)
    
    # Apply caliper (exclude matches with distance > caliper)
    valid_matches = distances.flatten() < caliper
    
    matched_treated = treated[valid_matches].copy()
    matched_control_indices = indices[valid_matches].flatten()
    matched_control = control.iloc[matched_control_indices].copy()
    
    # Calculate treatment effect
    ate = matched_treated[outcome_col].mean() - matched_control[outcome_col].mean()
    
    # Standard error (simple approximation)
    se = np.sqrt(
        matched_treated[outcome_col].var() / len(matched_treated) +
        matched_control[outcome_col].var() / len(matched_control)
    )
    
    # Confidence interval
    ci_lower = ate - 1.96 * se
    ci_upper = ate + 1.96 * se
    
    # T-test
    t_stat, p_value = stats.ttest_ind(
        matched_treated[outcome_col],
        matched_control[outcome_col]
    )
    
    # Combine matched data
    matched_treated['match_id'] = range(len(matched_treated))
    matched_control['match_id'] = range(len(matched_control))
    matched_treated['group'] = 'Treated'
    matched_control['group'] = 'Control'
    
    matched_df = pd.concat([matched_treated, matched_control], ignore_index=True)
    
    results = {
        'average_treatment_effect': ate,
        'standard_error': se,
        'ci_lower': ci_lower,
        'ci_upper': ci_upper,
        't_statistic': t_stat,
        'p_value': p_value,
        'n_treated': len(matched_treated),
        'n_control': len(matched_control),
        'n_unmatched': len(treated) - len(matched_treated),
        'covariate_balance': calculate_covariate_balance(matched_treated, matched_control, covariates)
    }
    
    return matched_df, results


def calculate_covariate_balance(
    treated_df: pd.DataFrame,
    control_df: pd.DataFrame,
    covariates: List[str]
) -> pd.DataFrame:
    """
    Calculate standardized mean differences for covariate balance.
    
    Args:
        treated_df: Treated group DataFrame
        control_df: Control group DataFrame
        covariates: List of covariate names
        
    Returns:
        DataFrame with balance statistics
    """
    balance = []
    
    for cov in covariates:
        if cov in treated_df.columns and cov in control_df.columns:
            treated_mean = treated_df[cov].mean()
            control_mean = control_df[cov].mean()
            pooled_std = np.sqrt(
                (treated_df[cov].var() + control_df[cov].var()) / 2
            )
            
            smd = (treated_mean - control_mean) / pooled_std if pooled_std > 0 else 0
            
            balance.append({
                'covariate': cov,
                'treated_mean': treated_mean,
                'control_mean': control_mean,
                'std_mean_diff': smd,
                'balanced': abs(smd) < 0.1  # Rule of thumb: SMD < 0.1 is balanced
            })
    
    return pd.DataFrame(balance)


def difference_in_differences(
    trials_df: pd.DataFrame,
    treatment_col: str,
    time_col: str,
    outcome_col: str,
    pre_period: any,
    post_period: any
) -> dict:
    """
    Estimate treatment effect using difference-in-differences.
    
    Args:
        trials_df: DataFrame with trial data
        treatment_col: Column indicating treatment group
        time_col: Column with time period
        outcome_col: Column with outcome
        pre_period: Value indicating pre-treatment period
        post_period: Value indicating post-treatment period
        
    Returns:
        Dictionary with DiD estimates
    """
    df = trials_df.copy()
    
    # Create period indicator
    df['post'] = (df[time_col] == post_period).astype(int)
    
    # Calculate means for each group and period
    treated_pre = df[(df[treatment_col] == 1) & (df['post'] == 0)][outcome_col].mean()
    treated_post = df[(df[treatment_col] == 1) & (df['post'] == 1)][outcome_col].mean()
    control_pre = df[(df[treatment_col] == 0) & (df['post'] == 0)][outcome_col].mean()
    control_post = df[(df[treatment_col] == 0) & (df['post'] == 1)][outcome_col].mean()
    
    # DiD estimate
    did_estimate = (treated_post - treated_pre) - (control_post - control_pre)
    
    # Simple regression for standard errors
    from sklearn.linear_model import LinearRegression
    
    X = df[[treatment_col, 'post']].copy()
    X['interaction'] = X[treatment_col] * X['post']
    y = df[outcome_col]
    
    model = LinearRegression()
    model.fit(X, y)
    
    # The interaction coefficient is the DiD estimate
    did_coef = model.coef_[2]  # interaction term
    
    results = {
        'did_estimate': did_estimate,
        'treated_pre': treated_pre,
        'treated_post': treated_post,
        'control_pre': control_pre,
        'control_post': control_post,
        'treated_change': treated_post - treated_pre,
        'control_change': control_post - control_pre,
        'parallel_trends_assumption': 'Cannot be tested without pre-treatment data'
    }
    
    return results


def instrumental_variables(
    trials_df: pd.DataFrame,
    treatment_col: str,
    instrument_col: str,
    outcome_col: str,
    covariates: List[str]
) -> dict:
    """
    Estimate treatment effect using instrumental variables (2SLS).
    
    Args:
        trials_df: DataFrame with trial data
        treatment_col: Endogenous treatment variable
        instrument_col: Instrumental variable
        outcome_col: Outcome variable
        covariates: Control variables
        
    Returns:
        Dictionary with IV estimates
    """
    df = prepare_treatment_data(trials_df, treatment_col, outcome_col)
    df_clean = df[[treatment_col, instrument_col, outcome_col] + covariates].dropna()
    
    if len(df_clean) < 30:
        raise ValueError("Insufficient data for IV estimation (need at least 30 complete cases)")
    
    # First stage: regress treatment on instrument and covariates
    X_first = df_clean[[instrument_col] + covariates]
    y_first = df_clean[treatment_col]
    
    first_stage = LinearRegression()
    first_stage.fit(X_first, y_first)
    
    # Predicted treatment
    treatment_hat = first_stage.predict(X_first)
    
    # Second stage: regress outcome on predicted treatment and covariates
    X_second = pd.DataFrame({
        'treatment_hat': treatment_hat
    })
    for cov in covariates:
        X_second[cov] = df_clean[cov]
    
    y_second = df_clean[outcome_col]
    
    second_stage = LinearRegression()
    second_stage.fit(X_second, y_second)
    
    # IV estimate is the coefficient on predicted treatment
    iv_estimate = second_stage.coef_[0]
    
    # First stage F-statistic (instrument strength)
    from sklearn.metrics import r2_score
    r2_first = r2_score(y_first, treatment_hat)
    n = len(df_clean)
    k = len(covariates) + 1
    f_stat = (r2_first / (1 - r2_first)) * ((n - k - 1) / k)
    
    results = {
        'iv_estimate': iv_estimate,
        'first_stage_f_stat': f_stat,
        'instrument_strength': 'Strong' if f_stat > 10 else 'Weak',
        'n_observations': n,
        'note': 'IV estimates require valid instruments (relevance, exogeneity, exclusion)'
    }
    
    return results


def treatment_heterogeneity(
    trials_df: pd.DataFrame,
    treatment_col: str,
    outcome_col: str,
    subgroup_col: str
) -> pd.DataFrame:
    """
    Analyze treatment effect heterogeneity across subgroups.
    
    Args:
        trials_df: DataFrame with trial data
        treatment_col: Treatment indicator
        outcome_col: Outcome variable
        subgroup_col: Column defining subgroups
        
    Returns:
        DataFrame with subgroup-specific treatment effects
    """
    df = prepare_treatment_data(trials_df, treatment_col, outcome_col)
    
    results = []
    
    for subgroup in df[subgroup_col].dropna().unique():
        subgroup_df = df[df[subgroup_col] == subgroup]
        
        treated = subgroup_df[subgroup_df[treatment_col] == 1][outcome_col]
        control = subgroup_df[subgroup_df[treatment_col] == 0][outcome_col]
        
        if len(treated) > 0 and len(control) > 0:
            ate = treated.mean() - control.mean()
            t_stat, p_value = stats.ttest_ind(treated, control)
            
            results.append({
                'subgroup': str(subgroup),
                'treatment_effect': ate,
                'p_value': p_value,
                'n_treated': len(treated),
                'n_control': len(control),
                'significant': p_value < 0.05
            })
    
    return pd.DataFrame(results)
