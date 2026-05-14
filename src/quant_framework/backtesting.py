"""
Quantitative Framework for Sickle Cell Investment Strategy
Includes backtesting, portfolio optimization, and risk management
"""

import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os

class SickleCellQuantFramework:
    def __init__(self, initial_capital=100000):
        self.initial_capital = initial_capital
        self.companies = {
            "Global Blood Therapeutics": "GBT",
            "Bluebird Bio": "BLUE",
            "CRISPR Therapeutics": "CRSP",
            "Vertex Pharmaceuticals": "VRTX",
            "Novartis": "NVS",
            "Editas Medicine": "EDIT",
            "Pfizer": "PFE",
            "Bristol Myers Squibb": "BMY"
        }
        
    def load_stock_data(self, period="3y"):
        """
        Load historical stock data
        """
        print("Loading stock data for backtesting...")
        
        prices = {}
        for name, ticker in self.companies.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period=period)
                if not hist.empty:
                    prices[ticker] = hist['Close']
                    print(f"  ✓ {ticker}")
            except Exception as e:
                print(f"  ✗ {ticker}: {e}")
        
        return pd.DataFrame(prices)
    
    def calculate_returns(self, prices):
        """
        Calculate daily and cumulative returns
        """
        print("Calculating returns...")
        
        # Daily returns
        daily_returns = prices.pct_change().dropna()
        
        # Cumulative returns
        cumulative_returns = (1 + daily_returns).cumprod()
        
        return daily_returns, cumulative_returns
    
    def calculate_metrics(self, returns, benchmark_returns=None):
        """
        Calculate performance metrics
        """
        print("Calculating performance metrics...")
        
        metrics = {}
        
        # Annualized return
        metrics['annual_return'] = returns.mean() * 252
        
        # Volatility
        metrics['volatility'] = returns.std() * np.sqrt(252)
        
        # Sharpe ratio (assuming risk-free rate of 2%)
        risk_free_rate = 0.02
        metrics['sharpe_ratio'] = (metrics['annual_return'] - risk_free_rate) / metrics['volatility']
        
        # Sortino ratio
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() * np.sqrt(252)
        metrics['sortino_ratio'] = (metrics['annual_return'] - risk_free_rate) / downside_std
        
        # Maximum drawdown
        cumulative = (1 + returns).cumprod()
        rolling_max = cumulative.expanding().max()
        drawdown = (cumulative - rolling_max) / rolling_max
        metrics['max_drawdown'] = drawdown.min()
        
        # Skewness and Kurtosis
        metrics['skewness'] = stats.skew(returns)
        metrics['kurtosis'] = stats.kurtosis(returns)
        
        # Alpha and Beta (if benchmark provided)
        if benchmark_returns is not None:
            covariance = np.cov(returns, benchmark_returns)[0][1]
            benchmark_variance = np.var(benchmark_returns)
            metrics['beta'] = covariance / benchmark_variance
            metrics['alpha'] = metrics['annual_return'] - (risk_free_rate + metrics['beta'] * (benchmark_returns.mean() * 252 - risk_free_rate))
        
        return metrics
    
    def equal_weight_portfolio(self, prices):
        """
        Backtest equal-weight portfolio
        """
        print("\nBacktesting Equal-Weight Portfolio...")
        
        daily_returns, cumulative_returns = self.calculate_returns(prices)
        
        # Equal weight returns
        equal_weight_returns = daily_returns.mean(axis=1)
        equal_weight_cumulative = (1 + equal_weight_returns).cumprod()
        
        # Calculate metrics
        metrics = self.calculate_metrics(equal_weight_returns)
        
        print(f"  Annual Return: {metrics['annual_return']:.2%}")
        print(f"  Volatility: {metrics['volatility']:.2%}")
        print(f"  Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
        print(f"  Max Drawdown: {metrics['max_drawdown']:.2%}")
        
        return equal_weight_returns, equal_weight_cumulative, metrics
    
    def health_signal_strategy(self, prices, health_data):
        """
        Strategy based on health signals (e.g., treatment approvals, clinical trial progress)
        """
        print("\nBacktesting Health-Signal Strategy...")
        
        # This is a simplified version - in production, use actual health signal data
        daily_returns, _ = self.calculate_returns(prices)
        
        # Simulate health signals (placeholder)
        # In reality, this would use actual treatment approval dates, clinical trial results, etc.
        signals = pd.DataFrame(index=prices.index, columns=prices.columns, data=1)
        
        # Apply signals
        strategy_returns = (daily_returns * signals).mean(axis=1)
        strategy_cumulative = (1 + strategy_returns).cumprod()
        
        metrics = self.calculate_metrics(strategy_returns)
        
        print(f"  Annual Return: {metrics['annual_return']:.2%}")
        print(f"  Volatility: {metrics['volatility']:.2%}")
        print(f"  Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
        print(f"  Max Drawdown: {metrics['max_drawdown']:.2%}")
        
        return strategy_returns, strategy_cumulative, metrics
    
    def monte_carlo_simulation(self, returns, n_simulations=1000, n_days=252):
        """
        Monte Carlo simulation for future returns
        """
        print(f"\nRunning Monte Carlo Simulation ({n_simulations} simulations)...")
        
        mean_return = returns.mean()
        std_return = returns.std()
        
        simulations = []
        for _ in range(n_simulations):
            simulated_returns = np.random.normal(mean_return, std_return, n_days)
            simulated_cumulative = (1 + simulated_returns).cumprod()
            simulations.append(simulated_cumulative)
        
        simulations = pd.DataFrame(simulations).T
        
        # Calculate percentiles
        p5 = simulations.quantile(0.05, axis=1)
        p50 = simulations.quantile(0.50, axis=1)
        p95 = simulations.quantile(0.95, axis=1)
        
        print(f"  5th percentile final return: {p5.iloc[-1]:.2%}")
        print(f"  50th percentile final return: {p50.iloc[-1]:.2%}")
        print(f"  95th percentile final return: {p95.iloc[-1]:.2%}")
        
        return simulations, p5, p50, p95
    
    def optimize_portfolio(self, returns):
        """
        Mean-Variance Portfolio Optimization
        """
        print("\nOptimizing Portfolio (Mean-Variance)...")
        
        # Calculate expected returns and covariance
        expected_returns = returns.mean() * 252
        cov_matrix = returns.cov() * 252
        
        # Number of assets
        n_assets = len(returns.columns)
        
        # Equal weights as baseline
        weights = np.array([1/n_assets] * n_assets)
        
        # Portfolio return and volatility
        portfolio_return = np.dot(weights, expected_returns)
        portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        
        print(f"  Equal Weight Portfolio:")
        print(f"    Expected Return: {portfolio_return:.2%}")
        print(f"    Volatility: {portfolio_volatility:.2%}")
        print(f"    Sharpe Ratio: {portfolio_return / portfolio_volatility:.2f}")
        
        # Weight summary
        weight_summary = pd.DataFrame({
            'Ticker': returns.columns,
            'Weight': weights
        })
        
        print("\n  Weights:")
        print(weight_summary)
        
        return weights, portfolio_return, portfolio_volatility
    
    def generate_report(self, equal_weight_metrics, strategy_metrics):
        """
        Generate performance report
        """
        print("\n" + "="*60)
        print("PERFORMANCE REPORT")
        print("="*60)
        
        print("\nEqual-Weight Portfolio:")
        print(f"  Annual Return: {equal_weight_metrics['annual_return']:.2%}")
        print(f"  Volatility: {equal_weight_metrics['volatility']:.2%}")
        print(f"  Sharpe Ratio: {equal_weight_metrics['sharpe_ratio']:.2f}")
        print(f"  Max Drawdown: {equal_weight_metrics['max_drawdown']:.2%}")
        
        print("\nHealth-Signal Strategy:")
        print(f"  Annual Return: {strategy_metrics['annual_return']:.2%}")
        print(f"  Volatility: {strategy_metrics['volatility']:.2%}")
        print(f"  Sharpe Ratio: {strategy_metrics['sharpe_ratio']:.2f}")
        print(f"  Max Drawdown: {strategy_metrics['max_drawdown']:.2%}")
        
        print("\n" + "="*60)
    
    def run_backtest(self):
        """
        Run complete backtesting framework
        """
        print("="*60)
        print("SICKLE CELL INVESTMENT STRATEGY BACKTEST")
        print("="*60)
        print("\n⚠️  EDUCATIONAL PURPOSES ONLY - NOT INVESTMENT ADVICE\n")
        
        # Load data
        prices = self.load_stock_data(period="3y")
        
        if prices.empty:
            print("✗ No data available for backtesting")
            return
        
        # Equal weight portfolio
        eq_returns, eq_cumulative, eq_metrics = self.equal_weight_portfolio(prices)
        
        # Health signal strategy
        strategy_returns, strategy_cumulative, strategy_metrics = self.health_signal_strategy(prices, None)
        
        # Monte Carlo simulation
        simulations, p5, p50, p95 = self.monte_carlo_simulation(eq_returns)
        
        # Portfolio optimization
        daily_returns, _ = self.calculate_returns(prices)
        weights, port_return, port_vol = self.optimize_portfolio(daily_returns)
        
        # Generate report
        self.generate_report(eq_metrics, strategy_metrics)
        
        print("\n✓ Backtesting complete!")

if __name__ == "__main__":
    quant = SickleCellQuantFramework(initial_capital=100000)
    quant.run_backtest()
