"""
Market Regime Detection using Hidden Markov Models

Identifies bull/bear/sideways market regimes and adjusts strategy accordingly.
Uses HMM on market returns and volatility to detect regime shifts.
"""

import numpy as np
import pandas as pd
from hmmlearn import hmm
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


def prepare_features(returns: pd.Series, vol_window: int = 21) -> pd.DataFrame:
    """
    Prepare features for HMM regime detection.
    
    Features:
        - Daily returns
        - Rolling volatility (21-day)
        - Rolling momentum (63-day)
        - Return squared (volatility proxy)
    """
    df = pd.DataFrame({'returns': returns})
    
    # Volatility
    df['volatility'] = df['returns'].rolling(vol_window).std() * np.sqrt(252)
    
    # Momentum
    df['momentum'] = df['returns'].rolling(63).mean() * 252
    
    # Squared returns (volatility clustering)
    df['returns_sq'] = df['returns'] ** 2
    
    return df.dropna()


def fit_hmm_model(features: pd.DataFrame, n_states: int = 3, random_state: int = 42) -> hmm.GaussianHMM:
    """
    Fit Gaussian HMM to market features.
    
    Args:
        features: DataFrame with market features
        n_states: Number of hidden states (regimes)
        random_state: Random seed for reproducibility
        
    Returns:
        Fitted HMM model
    """
    # Standardize features
    scaler = StandardScaler()
    X = scaler.fit_transform(features.values)
    
    # Fit HMM
    model = hmm.GaussianHMM(
        n_components=n_states,
        covariance_type='full',
        n_iter=200,
        random_state=random_state,
        tol=1e-4
    )
    model.fit(X)
    
    # Store scaler for later use
    model._scaler = scaler
    
    return model


def predict_regimes(model: hmm.GaussianHMM, features: pd.DataFrame) -> pd.Series:
    """
    Predict market regimes using fitted HMM.
    
    Returns:
        Series of regime labels (0, 1, 2, ...)
    """
    scaler = model._scaler
    X = scaler.transform(features.values)
    
    # Predict most likely state sequence (Viterbi algorithm)
    states = model.predict(X)
    
    return pd.Series(states, index=features.index, name='regime')


def label_regimes(regimes: pd.Series, returns: pd.Series) -> pd.Series:
    """
    Assign human-readable labels to regimes based on characteristics.
    
    Labels:
        - 'bull': High positive returns, low volatility
        - 'bear': Negative returns, high volatility
        - 'sideways': Low returns, low volatility
        - 'crisis': Extreme volatility
    """
    # Calculate regime statistics
    regime_stats = {}
    for regime in regimes.unique():
        mask = regimes == regime
        regime_returns = returns[mask]
        
        regime_stats[regime] = {
            'mean_return': regime_returns.mean() * 252,
            'volatility': regime_returns.std() * np.sqrt(252)
        }
    
    # Assign labels based on characteristics
    labels = {}
    for regime, stats in regime_stats.items():
        ret = stats['mean_return']
        vol = stats['volatility']
        
        if vol > 0.35:
            labels[regime] = 'crisis'
        elif ret > 0.10 and vol < 0.25:
            labels[regime] = 'bull'
        elif ret < 0:
            labels[regime] = 'bear'
        else:
            labels[regime] = 'sideways'
    
    # Map numeric regimes to labels
    labeled_regimes = regimes.map(labels)
    
    return labeled_regimes


def calculate_regime_stats(regimes: pd.Series, returns: pd.Series) -> pd.DataFrame:
    """
    Calculate performance statistics for each regime.
    
    Returns:
        DataFrame with regime statistics
    """
    stats = []
    
    for regime in regimes.unique():
        mask = regimes == regime
        regime_returns = returns[mask]
        
        if len(regime_returns) == 0:
            continue
        
        ann_return = regime_returns.mean() * 252
        ann_vol = regime_returns.std() * np.sqrt(252)
        sharpe = ann_return / ann_vol if ann_vol > 0 else 0
        
        stats.append({
            'regime': regime,
            'count': len(regime_returns),
            'pct_time': len(regime_returns) / len(returns) * 100,
            'ann_return': round(ann_return * 100, 2),
            'ann_vol': round(ann_vol * 100, 2),
            'sharpe': round(sharpe, 2)
        })
    
    return pd.DataFrame(stats).sort_values('ann_return', ascending=False)


def calculate_transition_matrix(regimes: pd.Series) -> pd.DataFrame:
    """
    Calculate regime transition probability matrix.
    
    Returns:
        DataFrame where element [i,j] = P(regime j | regime i)
    """
    unique_regimes = sorted(regimes.unique())
    
    # Initialize transition matrix
    transitions = pd.DataFrame(0, index=unique_regimes, columns=unique_regimes)
    
    # Count transitions
    for i in range(len(regimes) - 1):
        from_regime = regimes.iloc[i]
        to_regime = regimes.iloc[i + 1]
        transitions.loc[from_regime, to_regime] += 1
    
    # Convert to probabilities
    row_sums = transitions.sum(axis=1)
    transitions = transitions.div(row_sums, axis=0).fillna(0)
    
    return transitions.round(3)


def regime_conditional_strategy(returns: pd.Series, regimes: pd.Series, 
                                 bull_weight: float = 1.5, 
                                 bear_weight: float = 0.0,
                                 sideways_weight: float = 0.5,
                                 crisis_weight: float = 0.0) -> pd.Series:
    """
    Adjust portfolio exposure based on detected regime.
    
    Args:
        returns: Asset returns
        regimes: Detected regimes
        bull_weight: Exposure multiplier in bull regime
        bear_weight: Exposure multiplier in bear regime
        sideways_weight: Exposure multiplier in sideways regime
        crisis_weight: Exposure multiplier in crisis regime
        
    Returns:
        Strategy returns with regime-adjusted exposure
    """
    weights = regimes.map({
        'bull': bull_weight,
        'bear': bear_weight,
        'sideways': sideways_weight,
        'crisis': crisis_weight
    }).fillna(1.0)
    
    strategy_returns = returns * weights.shift(1)  # Use previous day's regime
    
    return strategy_returns.dropna()


def backtest_regime_strategy(returns: pd.Series, n_states: int = 3) -> dict:
    """
    Full regime detection and backtesting pipeline.
    
    Returns:
        dict with regime stats, transition matrix, and performance
    """
    # Prepare features
    features = prepare_features(returns)
    
    # Fit HMM
    model = fit_hmm_model(features, n_states=n_states)
    
    # Predict regimes
    numeric_regimes = predict_regimes(model, features)
    labeled_regimes = label_regimes(numeric_regimes, returns.loc[features.index])
    
    # Calculate statistics
    regime_stats = calculate_regime_stats(labeled_regimes, returns.loc[features.index])
    transition_matrix = calculate_transition_matrix(labeled_regimes)
    
    # Backtest strategy
    strategy_returns = regime_conditional_strategy(
        returns.loc[features.index], 
        labeled_regimes,
        bull_weight=1.5,
        bear_weight=0.0,
        sideways_weight=0.5,
        crisis_weight=0.0
    )
    
    # Performance metrics
    total_return = (1 + strategy_returns).prod() - 1
    n_obs = len(strategy_returns)
    ann_return = (1 + total_return) ** (252 / n_obs) - 1 if n_obs > 0 else 0.0
    ann_vol = strategy_returns.std() * np.sqrt(252)
    sharpe = ann_return / ann_vol if ann_vol > 0 else 0
    
    # Buy-and-hold benchmark
    bh_returns = returns.loc[strategy_returns.index]
    bh_total = (1 + bh_returns).prod() - 1
    n_bh = len(bh_returns)
    bh_ann = (1 + bh_total) ** (252 / n_bh) - 1 if n_bh > 0 else 0.0
    bh_vol = bh_returns.std() * np.sqrt(252)
    bh_sharpe = bh_ann / bh_vol if bh_vol > 0 else 0
    
    # Max drawdown
    cum_returns = (1 + strategy_returns).cumprod()
    running_max = cum_returns.expanding().max()
    drawdown = (cum_returns - running_max) / running_max
    max_drawdown = drawdown.min()
    
    return {
        'regime_stats': regime_stats,
        'transition_matrix': transition_matrix,
        'regimes': labeled_regimes,
        'current_regime': labeled_regimes.iloc[-1] if len(labeled_regimes) > 0 else None,
        'performance': {
            'strategy_return': round(ann_return * 100, 2),
            'strategy_vol': round(ann_vol * 100, 2),
            'strategy_sharpe': round(sharpe, 3),
            'max_drawdown': round(max_drawdown * 100, 2),
            'benchmark_return': round(bh_ann * 100, 2),
            'benchmark_sharpe': round(bh_sharpe, 3),
            'alpha': round((ann_return - bh_ann) * 100, 2)
        },
        'strategy_returns': strategy_returns
    }


# Example usage
if __name__ == "__main__":
    import yfinance as yf
    
    # Download biotech ETF data
    print("Downloading XBI (biotech ETF) data...")
    xbi = yf.download('XBI', start='2015-01-01', end='2024-01-01')['Adj Close']
    returns = xbi.pct_change().dropna()
    
    print("\nRunning regime detection...")
    results = backtest_regime_strategy(returns, n_states=3)
    
    print("\n=== Regime Statistics ===")
    print(results['regime_stats'].to_string(index=False))
    
    print("\n=== Transition Matrix ===")
    print(results['transition_matrix'])
    
    print(f"\n=== Current Regime: {results['current_regime']} ===")
    
    print("\n=== Performance ===")
    for k, v in results['performance'].items():
        print(f"  {k}: {v}")
    
    # Plot regimes
    try:
        import matplotlib.pyplot as plt
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
        
        # Price chart with regime colors
        cum_returns = (1 + returns.loc[results['regimes'].index]).cumprod()
        ax1.plot(cum_returns.index, cum_returns.values, color='black', linewidth=1)
        
        # Color background by regime
        regime_colors = {'bull': 'green', 'bear': 'red', 'sideways': 'gray', 'crisis': 'orange'}
        for regime in results['regimes'].unique():
            mask = results['regimes'] == regime
            ax1.fill_between(
                results['regimes'][mask].index,
                cum_returns.min(), cum_returns.max(),
                alpha=0.2, color=regime_colors.get(regime, 'blue'),
                label=regime
            )
        
        ax1.set_ylabel('Cumulative Returns')
        ax1.set_title('Market Regimes (HMM Detection)')
        ax1.legend(loc='upper left')
        ax1.grid(alpha=0.3)
        
        # Strategy vs benchmark
        strategy_cum = (1 + results['strategy_returns']).cumprod()
        benchmark_cum = (1 + returns.loc[results['strategy_returns'].index]).cumprod()
        
        ax2.plot(strategy_cum.index, strategy_cum.values, label='Regime Strategy', linewidth=2)
        ax2.plot(benchmark_cum.index, benchmark_cum.values, label='Buy & Hold', linewidth=2, alpha=0.7)
        ax2.set_ylabel('Cumulative Returns')
        ax2.set_xlabel('Date')
        ax2.legend()
        ax2.grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('regime_detection_results.png', dpi=150, bbox_inches='tight')
        print("\nPlot saved to regime_detection_results.png")
        
    except ImportError:
        print("\nMatplotlib not available for plotting")
