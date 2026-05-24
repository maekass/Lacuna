"""
Pairs Trading Module for Biotech Stocks

Implements statistical arbitrage strategy for cointegrated biotech pairs.
Uses Engle-Granger cointegration test and mean-reversion signals.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import coint
from statsmodels.regression.linear_model import OLS
import warnings
warnings.filterwarnings('ignore')


def find_cointegrated_pairs(prices: pd.DataFrame, pvalue_threshold: float = 0.05) -> list:
    """
    Find cointegrated pairs using Engle-Granger test.
    
    Args:
        prices: DataFrame of stock prices (dates x tickers)
        pvalue_threshold: Maximum p-value for cointegration
        
    Returns:
        List of tuples: (ticker1, ticker2, pvalue, hedge_ratio)
    """
    n = prices.shape[1]
    pairs = []
    
    for i in range(n):
        for j in range(i+1, n):
            ticker1 = prices.columns[i]
            ticker2 = prices.columns[j]
            
            s1 = prices[ticker1].dropna()
            s2 = prices[ticker2].dropna()
            
            # Align series
            common_idx = s1.index.intersection(s2.index)
            if len(common_idx) < 60:  # Need minimum history
                continue
                
            s1 = s1.loc[common_idx]
            s2 = s2.loc[common_idx]
            
            # Test cointegration
            score, pvalue, _ = coint(s1, s2)
            
            if pvalue < pvalue_threshold:
                # Calculate hedge ratio
                model = OLS(s1, s2).fit()
                hedge_ratio = model.params[0]
                
                pairs.append({
                    'ticker_x': ticker1,
                    'ticker_y': ticker2,
                    'pvalue': round(pvalue, 4),
                    'hedge_ratio': round(hedge_ratio, 4),
                    'score': round(score, 4)
                })
    
    return sorted(pairs, key=lambda x: x['pvalue'])


def calculate_spread(prices: pd.DataFrame, ticker1: str, ticker2: str, hedge_ratio: float) -> pd.Series:
    """
    Calculate spread between two stocks.
    
    Spread = Stock1 - hedge_ratio * Stock2
    """
    s1 = prices[ticker1]
    s2 = prices[ticker2]
    spread = s1 - hedge_ratio * s2
    return spread


def calculate_zscore(spread: pd.Series, window: int = 20) -> pd.Series:
    """
    Calculate rolling z-score of spread.
    
    Z-score = (spread - rolling_mean) / rolling_std
    """
    rolling_mean = spread.rolling(window=window).mean()
    rolling_std = spread.rolling(window=window).std()
    zscore = (spread - rolling_mean) / rolling_std
    return zscore


def generate_signals(zscore: pd.Series, entry_threshold: float = 2.0, exit_threshold: float = 0.5) -> pd.Series:
    """
    Generate trading signals based on z-score.
    
    Signals:
        +1: Long spread (buy stock1, short stock2)
        -1: Short spread (short stock1, buy stock2)
         0: Flat (no position)
    
    Logic:
        - Enter long when z-score < -entry_threshold
        - Enter short when z-score > +entry_threshold
        - Exit when |z-score| < exit_threshold
    """
    signals = pd.Series(0, index=zscore.index)
    position = 0
    
    for i in range(len(zscore)):
        z = zscore.iloc[i]
        
        if pd.isna(z):
            signals.iloc[i] = position
            continue
        
        # Entry signals
        if z < -entry_threshold and position == 0:
            position = 1  # Long spread
        elif z > entry_threshold and position == 0:
            position = -1  # Short spread
        
        # Exit signals
        elif abs(z) < exit_threshold and position != 0:
            position = 0  # Close position
        
        signals.iloc[i] = position
    
    return signals


def backtest_pair(prices: pd.DataFrame, ticker1: str, ticker2: str, 
                  hedge_ratio: float, entry_threshold: float = 2.0, 
                  exit_threshold: float = 0.5, window: int = 20) -> dict:
    """
    Backtest pairs trading strategy.
    
    Returns:
        dict with performance metrics and trade history
    """
    # Calculate spread and z-score
    spread = calculate_spread(prices, ticker1, ticker2, hedge_ratio)
    zscore = calculate_zscore(spread, window=window)
    signals = generate_signals(zscore, entry_threshold, exit_threshold)
    
    # Calculate returns
    ret1 = prices[ticker1].pct_change()
    ret2 = prices[ticker2].pct_change()
    
    # Strategy returns = signal * (ret1 - hedge_ratio * ret2)
    # Simplified: assume equal dollar investment
    strategy_returns = signals.shift(1) * (ret1 - hedge_ratio * ret2)
    strategy_returns = strategy_returns.dropna()
    
    # Performance metrics
    total_return = (1 + strategy_returns).prod() - 1
    n_obs = len(strategy_returns)
    ann_return = (1 + total_return) ** (252 / n_obs) - 1 if n_obs > 0 else 0.0
    ann_vol = strategy_returns.std() * np.sqrt(252)
    sharpe = ann_return / ann_vol if ann_vol > 0 else 0
    
    # Max drawdown
    cum_returns = (1 + strategy_returns).cumprod()
    running_max = cum_returns.expanding().max()
    drawdown = (cum_returns - running_max) / running_max
    max_drawdown = drawdown.min()
    
    # Trade statistics
    trades = signals.diff().abs().sum() / 2  # Each trade = entry + exit
    
    return {
        'ticker_x': ticker1,
        'ticker_y': ticker2,
        'total_return': round(total_return * 100, 2),
        'ann_return': round(ann_return * 100, 2),
        'ann_vol': round(ann_vol * 100, 2),
        'sharpe': round(sharpe, 3),
        'max_drawdown': round(max_drawdown * 100, 2),
        'num_trades': int(trades),
        'returns': strategy_returns,
        'signals': signals,
        'zscore': zscore
    }


def run_pairs_portfolio(prices: pd.DataFrame, pairs: list, 
                        entry_threshold: float = 2.0, 
                        exit_threshold: float = 0.5) -> dict:
    """
    Run portfolio of pairs trading strategies.
    
    Args:
        prices: Stock prices DataFrame
        pairs: List of cointegrated pairs from find_cointegrated_pairs()
        
    Returns:
        dict with portfolio metrics and individual pair results
    """
    pair_results = []
    all_returns = []
    
    for pair in pairs:
        result = backtest_pair(
            prices, 
            pair['ticker_x'], 
            pair['ticker_y'],
            pair['hedge_ratio'],
            entry_threshold,
            exit_threshold
        )
        pair_results.append(result)
        all_returns.append(result['returns'])
    
    # Equal-weight portfolio
    if all_returns:
        # Align all return series
        portfolio_returns = pd.concat(all_returns, axis=1).mean(axis=1)
        
        # Portfolio metrics
        total_return = (1 + portfolio_returns).prod() - 1
        n_obs = len(portfolio_returns)
        ann_return = (1 + total_return) ** (252 / n_obs) - 1 if n_obs > 0 else 0.0
        ann_vol = portfolio_returns.std() * np.sqrt(252)
        sharpe = ann_return / ann_vol if ann_vol > 0 else 0
        
        cum_returns = (1 + portfolio_returns).cumprod()
        running_max = cum_returns.expanding().max()
        drawdown = (cum_returns - running_max) / running_max
        max_drawdown = drawdown.min()
        
        portfolio_metrics = {
            'total_return': round(total_return * 100, 2),
            'ann_return': round(ann_return * 100, 2),
            'ann_vol': round(ann_vol * 100, 2),
            'sharpe': round(sharpe, 3),
            'max_drawdown': round(max_drawdown * 100, 2),
            'num_pairs': len(pairs)
        }
    else:
        portfolio_metrics = {}
        portfolio_returns = pd.Series()
    
    return {
        'portfolio_metrics': portfolio_metrics,
        'pair_results': pair_results,
        'portfolio_returns': portfolio_returns
    }


# Example usage
if __name__ == "__main__":
    # Demo with sample biotech stocks
    import yfinance as yf
    
    tickers = ['CRSP', 'EDIT', 'NTLA', 'BEAM', 'BLUE', 'VRTX', 'REGN']
    prices = yf.download(tickers, start='2020-01-01', end='2024-01-01')['Adj Close']
    
    print("Finding cointegrated pairs...")
    pairs = find_cointegrated_pairs(prices, pvalue_threshold=0.05)
    
    print(f"\nFound {len(pairs)} cointegrated pairs:")
    for pair in pairs[:5]:  # Show top 5
        print(f"  {pair['ticker_x']} / {pair['ticker_y']}: p={pair['pvalue']}, hedge={pair['hedge_ratio']}")
    
    if pairs:
        print("\nBacktesting pairs portfolio...")
        results = run_pairs_portfolio(prices, pairs[:3])  # Top 3 pairs
        
        print("\nPortfolio Metrics:")
        for k, v in results['portfolio_metrics'].items():
            print(f"  {k}: {v}")
