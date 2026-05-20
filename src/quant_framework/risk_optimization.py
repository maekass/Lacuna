"""
Risk-Focused Portfolio Optimization Module
Focuses on minimizing drawdown and maximizing risk-adjusted returns
"""

import pandas as pd
import numpy as np
from scipy.optimize import minimize
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import warnings
warnings.filterwarnings('ignore')

class RiskOptimizedPortfolio:
    def __init__(self, stock_data=None):
        """
        Initialize with stock price data
        """
        self.stock_data = stock_data
        self.returns = None
        self.mean_returns = None
        self.cov_matrix = None
        
        if stock_data is not None:
            self.calculate_returns()
    
    def calculate_returns(self):
        """
        Calculate daily returns from price data
        """
        self.returns = self.stock_data.pct_change().dropna()
        self.mean_returns = self.returns.mean()
        self.cov_matrix = self.returns.cov()
        
        return self.returns
    
    def calculate_max_drawdown(self, returns=None):
        """
        Calculate maximum drawdown for a single asset or portfolio
        """
        if returns is None:
            returns = self.returns
        
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        return max_drawdown
    
    def calculate_portfolio_drawdown(self, weights):
        """
        Calculate maximum drawdown for a portfolio with given weights
        """
        portfolio_returns = self.returns.dot(weights)
        return self.calculate_max_drawdown(portfolio_returns)
    
    def calculate_sortino_ratio(self, weights, risk_free_rate=0.02, target_return=0):
        """
        Calculate Sortino ratio (focuses on downside risk)
        """
        portfolio_returns = self.returns.dot(weights)
        excess_returns = portfolio_returns - risk_free_rate / 252
        
        # Downside deviation (only negative returns)
        downside_returns = excess_returns[excess_returns < 0]
        if len(downside_returns) == 0:
            return np.inf
        
        downside_deviation = np.sqrt(np.mean(downside_returns**2))
        
        if downside_deviation == 0:
            return np.inf
        
        sortino_ratio = np.mean(excess_returns) / downside_deviation
        
        return sortino_ratio
    
    def calculate_calmar_ratio(self, weights, risk_free_rate=0.02):
        """
        Calculate Calmar ratio (annual return / max drawdown)
        """
        portfolio_returns = self.returns.dot(weights)
        annual_return = (1 + portfolio_returns.mean())**252 - 1
        max_dd = self.calculate_portfolio_drawdown(weights)
        
        if max_dd == 0:
            return np.inf
        
        calmar_ratio = annual_return / abs(max_dd)
        
        return calmar_ratio
    
    def minimize_max_drawdown(self):
        """
        Optimize portfolio weights to minimize maximum drawdown
        """
        n_assets = len(self.stock_data.columns)
        
        def objective(weights):
            max_dd = self.calculate_portfolio_drawdown(weights)
            return -max_dd  # Negative because we want to maximize (minimize negative)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        initial_weights = np.array([1/n_assets] * n_assets)
        
        result = minimize(objective, initial_weights, 
                         method='SLSQP', bounds=bounds, constraints=constraints)
        
        return result.x, -result.fun
    
    def optimize_sortino_ratio(self, risk_free_rate=0.02):
        """
        Optimize portfolio weights to maximize Sortino ratio
        """
        n_assets = len(self.stock_data.columns)
        
        def objective(weights):
            return -self.calculate_sortino_ratio(weights, risk_free_rate)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        initial_weights = np.array([1/n_assets] * n_assets)
        
        result = minimize(objective, initial_weights,
                         method='SLSQP', bounds=bounds, constraints=constraints)
        
        return result.x, -result.fun
    
    def optimize_calmar_ratio(self, risk_free_rate=0.02):
        """
        Optimize portfolio weights to maximize Calmar ratio
        """
        n_assets = len(self.stock_data.columns)
        
        def objective(weights):
            return -self.calculate_calmar_ratio(weights, risk_free_rate)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        initial_weights = np.array([1/n_assets] * n_assets)
        
        result = minimize(objective, initial_weights,
                         method='SLSQP', bounds=bounds, constraints=constraints)
        
        return result.x, -result.fun
    
    def minimum_variance_portfolio(self):
        """
        Calculate minimum variance portfolio weights
        """
        n_assets = len(self.stock_data.columns)
        
        def objective(weights):
            return np.sqrt(weights.T @ self.cov_matrix @ weights)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        initial_weights = np.array([1/n_assets] * n_assets)
        
        result = minimize(objective, initial_weights,
                         method='SLSQP', bounds=bounds, constraints=constraints)
        
        return result.x, result.fun
    
    def risk_parity_portfolio(self):
        """
        Calculate risk parity portfolio (equal risk contribution)
        """
        n_assets = len(self.stock_data.columns)
        
        def objective(weights):
            portfolio_vol = np.sqrt(weights.T @ self.cov_matrix @ weights)
            marginal_risk = self.cov_matrix @ weights / portfolio_vol
            risk_contribution = weights * marginal_risk
            target_risk = portfolio_vol / n_assets
            return np.sum((risk_contribution - target_risk)**2)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        initial_weights = np.array([1/n_assets] * n_assets)
        
        result = minimize(objective, initial_weights,
                         method='SLSQP', bounds=bounds, constraints=constraints,
                         options={'ftol': 1e-9})
        
        return result.x, result.fun
    
    def compare_portfolios(self):
        """
        Compare different portfolio optimization strategies
        """
        strategies = {}
        
        # Equal weight (baseline)
        n_assets = len(self.stock_data.columns)
        equal_weights = np.array([1/n_assets] * n_assets)
        strategies['Equal Weight'] = equal_weights
        
        # Minimum variance
        min_var_weights, min_var_vol = self.minimum_variance_portfolio()
        strategies['Minimum Variance'] = min_var_weights
        
        # Risk parity
        risk_parity_weights, risk_parity_obj = self.risk_parity_portfolio()
        strategies['Risk Parity'] = risk_parity_weights
        
        # Maximize Sortino ratio
        sortino_weights, sortino_ratio = self.optimize_sortino_ratio()
        strategies['Max Sortino'] = sortino_weights
        
        # Maximize Calmar ratio
        calmar_weights, calmar_ratio = self.optimize_calmar_ratio()
        strategies['Max Calmar'] = calmar_weights
        
        # Minimize max drawdown
        min_dd_weights, min_dd = self.minimize_max_drawdown()
        strategies['Min Drawdown'] = min_dd_weights
        
        # Calculate metrics for each strategy
        results = []
        for name, weights in strategies.items():
            portfolio_returns = self.returns.dot(weights)
            annual_return = (1 + portfolio_returns.mean())**252 - 1
            annual_vol = portfolio_returns.std() * np.sqrt(252)
            sharpe_ratio = (annual_return - 0.02) / annual_vol if annual_vol > 0 else 0
            max_dd = self.calculate_max_drawdown(portfolio_returns)
            sortino = self.calculate_sortino_ratio(weights)
            calmar = self.calculate_calmar_ratio(weights)
            
            results.append({
                'Strategy': name,
                'Annual Return': f"{annual_return:.2%}",
                'Annual Volatility': f"{annual_vol:.2%}",
                'Sharpe Ratio': f"{sharpe_ratio:.3f}",
                'Max Drawdown': f"{max_dd:.2%}",
                'Sortino Ratio': f"{sortino:.3f}",
                'Calmar Ratio': f"{calmar:.3f}"
            })
        
        comparison_df = pd.DataFrame(results)
        
        return comparison_df, strategies
    
    def plot_drawdown_comparison(self, strategies=None):
        """
        Plot drawdown comparison across strategies
        """
        if strategies is None:
            _, strategies = self.compare_portfolios()
        
        fig = make_subplots(rows=2, cols=1, 
                          subplot_titles=('Portfolio Cumulative Returns', 'Drawdown Comparison'),
                          vertical_spacing=0.1)
        
        colors = px.colors.qualitative.Set1
        
        for i, (name, weights) in enumerate(strategies.items()):
            portfolio_returns = self.returns.dot(weights)
            cumulative = (1 + portfolio_returns).cumprod()
            
            fig.add_trace(
                go.Scatter(x=cumulative.index, y=cumulative,
                          mode='lines', name=name,
                          line=dict(color=colors[i % len(colors)])),
                row=1, col=1
            )
            
            # Drawdown
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            
            fig.add_trace(
                go.Scatter(x=drawdown.index, y=drawdown,
                          mode='lines', name=f"{name} DD",
                          line=dict(color=colors[i % len(colors)], dash='dot'),
                          showlegend=False),
                row=2, col=1
            )
        
        fig.update_layout(height=800, title="Portfolio Performance & Drawdown Comparison")
        fig.update_xaxes(title_text="Date")
        fig.update_yaxes(title_text="Cumulative Return", row=1, col=1)
        fig.update_yaxes(title_text="Drawdown", row=2, col=1)
        
        return fig
    
    def plot_efficient_frontier_with_risk(self, num_portfolios=100):
        """
        Plot efficient frontier with risk metrics (Sharpe, Sortino, Calmar)
        """
        n_assets = len(self.stock_data.columns)
        
        portfolio_returns = []
        portfolio_volatilities = []
        portfolio_sortinos = []
        portfolio_calmars = []
        portfolio_maxdds = []
        
        for _ in range(num_portfolios):
            weights = np.random.random(n_assets)
            weights /= np.sum(weights)
            
            portfolio_return = self.returns.dot(weights).mean() * 252
            portfolio_vol = np.sqrt(weights.T @ self.cov_matrix @ weights) * np.sqrt(252)
            portfolio_sortino = self.calculate_sortino_ratio(weights)
            portfolio_calmar = self.calculate_calmar_ratio(weights)
            portfolio_maxdd = self.calculate_portfolio_drawdown(weights)
            
            portfolio_returns.append(portfolio_return)
            portfolio_volatilities.append(portfolio_vol)
            portfolio_sortinos.append(portfolio_sortino)
            portfolio_calmars.append(portfolio_calmar)
            portfolio_maxdds.append(portfolio_maxdd)
        
        fig = make_subplots(rows=2, cols=2,
                          subplot_titles=('Return vs Volatility', 'Return vs Max Drawdown',
                                        'Return vs Sortino Ratio', 'Return vs Calmar Ratio'))
        
        # Return vs Volatility (Sharpe) - no colorbar
        fig.add_trace(
            go.Scatter(x=portfolio_volatilities, y=portfolio_returns,
                      mode='markers', marker=dict(color=portfolio_sortinos,
                                                  colorscale='Viridis',
                                                  showscale=False,
                                                  size=8,
                                                  opacity=0.7),
                      name='Portfolios'),
            row=1, col=1
        )
        
        # Return vs Max Drawdown - colorbar on right
        fig.add_trace(
            go.Scatter(x=np.abs(portfolio_maxdds), y=portfolio_returns,
                      mode='markers', marker=dict(color=portfolio_calmars,
                                                  colorscale='RdYlGn',
                                                  showscale=True,
                                                  size=8,
                                                  opacity=0.7,
                                                  colorbar=dict(
                                                      title=dict(text="Calmar", side="right"),
                                                      x=0.98,
                                                      xanchor="left",
                                                      y=0.75,
                                                      yanchor="middle",
                                                      thickness=15,
                                                      len=0.4
                                                  )),
                      name='Portfolios', showlegend=False),
            row=1, col=2
        )
        
        # Return vs Sortino - no colorbar
        fig.add_trace(
            go.Scatter(x=portfolio_sortinos, y=portfolio_returns,
                      mode='markers', marker=dict(color=portfolio_volatilities,
                                                  colorscale='Plasma',
                                                  showscale=False,
                                                  size=8,
                                                  opacity=0.7),
                      name='Portfolios', showlegend=False),
            row=2, col=1
        )
        
        # Return vs Calmar - colorbar on right bottom
        fig.add_trace(
            go.Scatter(x=portfolio_calmars, y=portfolio_returns,
                      mode='markers', marker=dict(color=np.abs(portfolio_maxdds),
                                                  colorscale='RdYlGn_r',
                                                  showscale=True,
                                                  size=8,
                                                  opacity=0.7,
                                                  colorbar=dict(
                                                      title=dict(text="Max DD", side="right"),
                                                      x=0.98,
                                                      xanchor="left",
                                                      y=0.25,
                                                      yanchor="middle",
                                                      thickness=15,
                                                      len=0.4
                                                  )),
                      name='Portfolios', showlegend=False),
            row=2, col=2
        )
        
        fig.update_xaxes(title_text="Volatility", row=1, col=1)
        fig.update_yaxes(title_text="Annual Return", row=1, col=1)
        fig.update_xaxes(title_text="Max Drawdown", row=1, col=2)
        fig.update_yaxes(title_text="Annual Return", row=1, col=2)
        fig.update_xaxes(title_text="Sortino Ratio", row=2, col=1)
        fig.update_yaxes(title_text="Annual Return", row=2, col=1)
        fig.update_xaxes(title_text="Calmar Ratio", row=2, col=2)
        fig.update_yaxes(title_text="Annual Return", row=2, col=2)
        
        fig.update_layout(height=800, title="Risk-Return Efficient Frontier")
        
        return fig
    
    def generate_risk_report(self):
        """
        Generate comprehensive risk optimization report
        """
        print("="*60)
        print("RISK-OPTIMIZED PORTFOLIO ANALYSIS")
        print("="*60)
        
        comparison_df, strategies = self.compare_portfolios()
        
        print("\nPortfolio Strategy Comparison:")
        print(comparison_df.to_string(index=False))
        
        print("\n" + "="*60)
        print("KEY INSIGHTS")
        print("="*60)
        
        # Find best strategy for each metric
        comparison_df_copy = comparison_df.copy()
        for col in ['Annual Return', 'Annual Volatility', 'Max Drawdown']:
            comparison_df_copy[col] = comparison_df_copy[col].str.rstrip('%').astype(float) / 100
        for col in ['Sharpe Ratio', 'Sortino Ratio', 'Calmar Ratio']:
            comparison_df_copy[col] = comparison_df_copy[col].astype(float)
        
        best_sharpe = comparison_df_copy.loc[comparison_df_copy['Sharpe Ratio'].idxmax()]
        best_sortino = comparison_df_copy.loc[comparison_df_copy['Sortino Ratio'].idxmax()]
        best_calmar = comparison_df_copy.loc[comparison_df_copy['Calmar Ratio'].idxmax()]
        min_dd = comparison_df_copy.loc[comparison_df_copy['Max Drawdown'].idxmin()]
        
        print(f"\nBest Sharpe Ratio: {best_sharpe['Strategy']} ({best_sharpe['Sharpe Ratio']})")
        print(f"Best Sortino Ratio: {best_sortino['Strategy']} ({best_sortino['Sortino Ratio']})")
        print(f"Best Calmar Ratio: {best_calmar['Strategy']} ({best_calmar['Calmar Ratio']})")
        print(f"Lowest Max Drawdown: {min_dd['Strategy']} ({min_dd['Max Drawdown']})")
        
        # Strategy recommendations
        print("\nStrategy Recommendations:")
        print(f"- For maximum risk-adjusted returns: {best_sharpe['Strategy']}")
        print(f"- For downside protection: {min_dd['Strategy']}")
        print(f"- For balanced risk/return: {best_sortino['Strategy']}")
        
        return comparison_df, strategies

if __name__ == "__main__":
    # Load sample stock data
    import yfinance as yf
    
    print("Loading stock data...")
    companies = ["CRSP", "VRTX", "EDIT", "PFE", "BMY"]
    prices = {}
    for ticker in companies:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period="2y")
            if not hist.empty:
                prices[ticker] = hist['Close']
                print(f"  ✓ {ticker}")
        except Exception as e:
            print(f"  ✗ {ticker}: {e}")
    
    if prices:
        stock_data = pd.DataFrame(prices)
        
        # Run risk optimization
        optimizer = RiskOptimizedPortfolio(stock_data)
        comparison_df, strategies = optimizer.generate_risk_report()
        
        # Save comparison
        comparison_df.to_csv("data/processed/risk_optimization_comparison.csv", index=False)
        print("\n✓ Comparison saved to data/processed/risk_optimization_comparison.csv")
        
        # Generate visualizations
        fig = optimizer.plot_drawdown_comparison(strategies)
        fig.write_html("data/visualizations/drawdown_comparison.html")
        print("✓ Drawdown comparison saved to data/visualizations/drawdown_comparison.html")
        
        fig2 = optimizer.plot_efficient_frontier_with_risk()
        fig2.write_html("data/visualizations/efficient_frontier_risk.html")
        print("✓ Efficient frontier saved to data/visualizations/efficient_frontier_risk.html")
    else:
        print("No stock data loaded")
