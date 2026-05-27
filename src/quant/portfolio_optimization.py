"""
Sophisticated Portfolio Optimization Module
Modern Portfolio Theory with Black-Litterman and Machine Learning Enhancements
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize, Bounds
from typing import Dict, List, Tuple, Optional, Callable
import warnings
from sklearn.covariance import LedoitWolf


class ModernPortfolioTheory:
    """Markowitz Modern Portfolio Theory implementation"""
    
    def __init__(self, returns_data: pd.DataFrame):
        """
        Initialize MPT with historical returns
        
        Args:
            returns_data: DataFrame of asset returns (assets as columns, time as rows)
        """
        self.returns = returns_data
        self.assets = returns_data.columns.tolist()
        self.n_assets = len(self.assets)
        
        # Calculate expected returns and covariance
        self.expected_returns = returns_data.mean() * 252  # Annualized
        self.cov_matrix = returns_data.cov() * 252  # Annualized
        
        # Use Ledoit-Wolf shrinkage for better covariance estimation
        if self.n_assets > 1:
            lw = LedoitWolf()
            lw.fit(returns_data)
            self.shrunk_cov = pd.DataFrame(
                lw.covariance_ * 252,
                index=self.assets,
                columns=self.assets
            )
        else:
            self.shrunk_cov = self.cov_matrix
    
    def efficient_frontier(self, 
                          n_portfolios: int = 100,
                          target_returns: Optional[np.ndarray] = None) -> pd.DataFrame:
        """
        Calculate efficient frontier
        
        Args:
            n_portfolios: Number of portfolios to generate
            target_returns: Specific target returns (optional)
            
        Returns:
            DataFrame with portfolio weights, returns, and risks
        """
        if target_returns is None:
            min_ret = self.expected_returns.min()
            max_ret = self.expected_returns.max()
            target_returns = np.linspace(min_ret, max_ret, n_portfolios)
        
        portfolios = []
        for target in target_returns:
            try:
                weights = self._optimize_for_return(target)
                portfolio_return = self._portfolio_return(weights)
                portfolio_risk = self._portfolio_risk(weights)
                sharpe = portfolio_return / portfolio_risk if portfolio_risk > 0 else 0
                
                portfolio = {
                    'target_return': target,
                    'expected_return': portfolio_return,
                    'risk': portfolio_risk,
                    'sharpe_ratio': sharpe,
                }
                
                for i, asset in enumerate(self.assets):
                    portfolio[f'weight_{asset}'] = weights[i]
                
                portfolios.append(portfolio)
            except:
                continue
        
        return pd.DataFrame(portfolios)
    
    def _optimize_for_return(self, target_return: float) -> np.ndarray:
        """Optimize portfolio weights for target return with minimum risk"""
        
        def objective(weights):
            return self._portfolio_risk(weights)
        
        def constraint_return(weights):
            return self._portfolio_return(weights) - target_return
        
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},  # Sum to 1
            {'type': 'eq', 'fun': constraint_return},  # Target return
        ]
        
        bounds = Bounds(0, 1)  # Long-only
        
        # Initial guess: equal weights
        x0 = np.ones(self.n_assets) / self.n_assets
        
        result = minimize(
            objective, x0, method='SLSQP',
            bounds=bounds, constraints=constraints,
            options={'maxiter': 1000, 'ftol': 1e-9}
        )
        
        if result.success:
            return result.x
        else:
            return x0
    
    def maximum_sharpe_ratio(self, risk_free_rate: float = 0.02) -> Dict:
        """
        Find maximum Sharpe ratio portfolio
        
        Args:
            risk_free_rate: Annual risk-free rate
            
        Returns:
            Dictionary with optimal weights and metrics
        """
        def negative_sharpe(weights):
            port_return = self._portfolio_return(weights)
            port_risk = self._portfolio_risk(weights)
            return -(port_return - risk_free_rate) / port_risk if port_risk > 0 else 0
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = Bounds(0, 1)
        x0 = np.ones(self.n_assets) / self.n_assets
        
        result = minimize(
            negative_sharpe, x0, method='SLSQP',
            bounds=bounds, constraints=constraints
        )
        
        weights = result.x if result.success else x0
        
        return {
            'weights': dict(zip(self.assets, weights)),
            'expected_return': self._portfolio_return(weights),
            'risk': self._portfolio_risk(weights),
            'sharpe_ratio': -result.fun if result.success else 0,
        }
    
    def minimum_variance_portfolio(self) -> Dict:
        """Find minimum variance portfolio"""
        
        def portfolio_variance(weights):
            return self._portfolio_risk(weights) ** 2
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = Bounds(0, 1)
        x0 = np.ones(self.n_assets) / self.n_assets
        
        result = minimize(
            portfolio_variance, x0, method='SLSQP',
            bounds=bounds, constraints=constraints
        )
        
        weights = result.x if result.success else x0
        
        return {
            'weights': dict(zip(self.assets, weights)),
            'expected_return': self._portfolio_return(weights),
            'risk': self._portfolio_risk(weights),
        }
    
    def _portfolio_return(self, weights: np.ndarray) -> float:
        """Calculate portfolio expected return"""
        return np.dot(weights, self.expected_returns)
    
    def _portfolio_risk(self, weights: np.ndarray) -> float:
        """Calculate portfolio volatility (standard deviation)"""
        return np.sqrt(np.dot(weights.T, np.dot(self.shrunk_cov, weights)))


class BlackLittermanModel:
    """Black-Litterman model for incorporating investor views"""
    
    def __init__(self, 
                 market_caps: pd.Series,
                 cov_matrix: pd.DataFrame,
                 risk_aversion: float = 2.5,
                 tau: float = 0.05):
        """
        Initialize Black-Litterman model
        
        Args:
            market_caps: Market capitalizations
            cov_matrix: Covariance matrix
            risk_aversion: Risk aversion parameter
            tau: Uncertainty scaling parameter
        """
        self.market_caps = market_caps
        self.cov_matrix = cov_matrix
        self.risk_aversion = risk_aversion
        self.tau = tau
        
        # Calculate market-implied equilibrium returns
        self.market_weights = market_caps / market_caps.sum()
        self.pi = self._implied_equilibrium_returns()
    
    def _implied_equilibrium_returns(self) -> pd.Series:
        """Calculate implied equilibrium returns (Pi)"""
        return self.risk_aversion * np.dot(self.cov_matrix, self.market_weights)
    
    def blend_views(self, 
                   views: pd.Series,
                   view_confidences: pd.Series) -> pd.Series:
        """
        Blend investor views with market equilibrium
        
        Args:
            views: Investor views on asset returns
            view_confidences: Confidence in each view (0-1)
            
        Returns:
            Posterior expected returns
        """
        # Create view matrix P (simplified: diagonal for now)
        P = np.diag(view_confidences)
        
        # Create uncertainty matrix Omega
        Omega = np.diag(view_confidences * (1 - view_confidences))
        
        # Calculate posterior returns
        tau_sigma = self.tau * self.cov_matrix.values
        
        try:
            M = np.linalg.inv(
                np.linalg.inv(tau_sigma) + 
                P.T @ np.linalg.inv(Omega) @ P
            )
            
            posterior = M @ (
                np.linalg.inv(tau_sigma) @ self.pi.values + 
                P.T @ np.linalg.inv(Omega) @ views.values
            )
            
            return pd.Series(posterior, index=self.market_caps.index)
        except np.linalg.LinAlgError:
            # If matrix is singular, return prior
            return self.pi


class SmartBetaFactors:
    """Smart beta factor model for biotech stocks"""
    
    def __init__(self, returns_data: pd.DataFrame):
        self.returns = returns_data
        self.assets = returns_data.columns.tolist()
    
    def calculate_factors(self) -> pd.DataFrame:
        """
        Calculate smart beta factors
        
        Returns:
            DataFrame with factor exposures for each asset
        """
        factors = pd.DataFrame(index=self.assets)
        
        # Momentum (12-month return excluding last month)
        for asset in self.assets:
            returns_series = self.returns[asset]
            
            # Momentum factor
            factors.loc[asset, 'momentum'] = self._calculate_momentum(returns_series)
            
            # Volatility factor (inverse)
            factors.loc[asset, 'low_volatility'] = -returns_series.std() * np.sqrt(252)
            
            # Quality factor (based on return consistency)
            factors.loc[asset, 'quality'] = self._calculate_quality(returns_series)
            
            # Size factor (simulated based on return magnitude)
            factors.loc[asset, 'size'] = returns_series.mean() * 252
            
            # Value factor (mean reversion indicator)
            factors.loc[asset, 'value'] = self._calculate_value(returns_series)
        
        # Normalize factors
        for col in factors.columns:
            factors[col] = (factors[col] - factors[col].mean()) / factors[col].std()
        
        return factors
    
    def _calculate_momentum(self, returns: pd.Series, lookback: int = 252) -> float:
        """Calculate momentum factor"""
        if len(returns) < lookback:
            return returns.mean() * len(returns)
        return returns.iloc[-lookback:].mean() * lookback
    
    def _calculate_quality(self, returns: pd.Series) -> float:
        """Calculate quality factor (return consistency)"""
        # Sharpe ratio as quality proxy
        if returns.std() == 0:
            return 0
        return returns.mean() / returns.std()
    
    def _calculate_value(self, returns: pd.Series) -> float:
        """Calculate value factor (mean reversion potential)"""
        # Recent underperformance might indicate value
        recent = returns.iloc[-63:].mean()  # Last quarter
        longer = returns.mean()
        return longer - recent  # Negative recent performance = value
    
    def construct_factor_portfolio(self, 
                                  factor_weights: Dict[str, float],
                                  long_only: bool = True) -> pd.Series:
        """
        Construct factor-weighted portfolio
        
        Args:
            factor_weights: Weights for each factor (sum to 1)
            long_only: If True, only long positions
            
        Returns:
            Portfolio weights for each asset
        """
        factors = self.calculate_factors()
        
        # Calculate composite factor score
        composite_score = pd.Series(0, index=self.assets)
        for factor, weight in factor_weights.items():
            if factor in factors.columns:
                composite_score += factors[factor] * weight
        
        # Convert scores to weights
        if long_only:
            # Only positive scores
            positive_scores = composite_score[composite_score > 0]
            if len(positive_scores) > 0:
                weights = positive_scores / positive_scores.sum()
            else:
                weights = pd.Series(1/len(self.assets), index=self.assets)
        else:
            # Long-short based on scores
            abs_sum = composite_score.abs().sum()
            weights = composite_score / abs_sum if abs_sum > 0 else pd.Series(0, index=self.assets)
        
        return weights


class RiskParity:
    """Risk parity portfolio construction"""
    
    def __init__(self, cov_matrix: pd.DataFrame):
        self.cov_matrix = cov_matrix
        self.assets = cov_matrix.columns.tolist()
    
    def construct_portfolio(self, risk_budget: Optional[Dict[str, float]] = None) -> pd.Series:
        """
        Construct risk parity portfolio
        
        Args:
            risk_budget: Target risk contribution for each asset (default: equal)
            
        Returns:
            Portfolio weights
        """
        if risk_budget is None:
            risk_budget = {asset: 1/len(self.assets) for asset in self.assets}
        
        # Initial guess: equal risk contribution
        x0 = np.ones(len(self.assets)) / len(self.assets)
        
        def objective(weights):
            """Minimize deviation from target risk budget"""
            risk_contrib = self._risk_contribution(weights)
            target = np.array([risk_budget[asset] for asset in self.assets])
            return np.sum((risk_contrib - target) ** 2)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = [(0, 1) for _ in self.assets]
        
        result = minimize(
            objective, x0, method='SLSQP',
            bounds=bounds, constraints=constraints
        )
        
        weights = result.x if result.success else x0
        return pd.Series(weights, index=self.assets)
    
    def _risk_contribution(self, weights: np.ndarray) -> np.ndarray:
        """Calculate risk contribution of each asset"""
        port_var = np.dot(weights.T, np.dot(self.cov_matrix, weights))
        if port_var == 0:
            return np.zeros(len(weights))
        
        marginal_risk = np.dot(self.cov_matrix, weights)
        risk_contrib = weights * marginal_risk / np.sqrt(port_var)
        return risk_contrib / risk_contrib.sum()


class HierarchicalRiskParity:
    """Hierarchical Risk Parity (HRP) portfolio optimization"""
    
    def __init__(self, returns_data: pd.DataFrame):
        self.returns = returns_data
        self.assets = returns_data.columns.tolist()
        self.corr_matrix = returns_data.corr()
        self.cov_matrix = returns_data.cov()
    
    def construct_portfolio(self) -> pd.Series:
        """
        Construct HRP portfolio using hierarchical clustering
        
        Returns:
            Portfolio weights
        """
        # Calculate distance matrix from correlation
        dist_matrix = np.sqrt(0.5 * (1 - self.corr_matrix))
        
        # Hierarchical clustering (simplified)
        # In production, use scipy.cluster.hierarchy
        # For now, use quasi-diagonalization approximation
        
        # Sort assets by correlation (simplified)
        sorted_assets = self._quasi_diagonalization()
        
        # Recursive bisection for weight allocation
        weights = self._recursive_bisection(sorted_assets)
        
        return pd.Series(weights, index=sorted_assets)
    
    def _quasi_diagonalization(self) -> List[str]:
        """Simplified quasi-diagonalization"""
        # Sort by average correlation
        avg_corr = self.corr_matrix.mean().sort_values()
        return avg_corr.index.tolist()
    
    def _recursive_bisection(self, sorted_assets: List[str]) -> Dict[str, float]:
        """Recursive bisection for HRP weights"""
        n = len(sorted_assets)
        weights = {}
        
        if n == 1:
            weights[sorted_assets[0]] = 1.0
            return weights
        
        # Split into two clusters
        mid = n // 2
        cluster1 = sorted_assets[:mid]
        cluster2 = sorted_assets[mid:]
        
        # Calculate cluster variance
        var1 = self._cluster_variance(cluster1)
        var2 = self._cluster_variance(cluster2)
        
        # Allocate capital inversely proportional to variance
        alloc1 = 1 / var1 if var1 > 0 else 1
        alloc2 = 1 / var2 if var2 > 0 else 1
        total_alloc = alloc1 + alloc2
        
        w1 = alloc1 / total_alloc
        w2 = alloc2 / total_alloc
        
        # Recursively allocate within clusters
        weights1 = self._recursive_bisection(cluster1)
        weights2 = self._recursive_bisection(cluster2)
        
        # Scale by cluster allocation
        for asset in cluster1:
            weights[asset] = weights1.get(asset, 0) * w1
        for asset in cluster2:
            weights[asset] = weights2.get(asset, 0) * w2
        
        return weights
    
    def _cluster_variance(self, cluster_assets: List[str]) -> float:
        """Calculate variance of a cluster"""
        if len(cluster_assets) == 0:
            return 0
        if len(cluster_assets) == 1:
            return self.cov_matrix.loc[cluster_assets[0], cluster_assets[0]]
        
        # Average variance
        cluster_cov = self.cov_matrix.loc[cluster_assets, cluster_assets]
        return cluster_cov.mean().mean()


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)
    
    # Generate sample returns
    assets = ['CRSP', 'VRTX', 'BEAM', 'NTLA', 'EDIT']
    dates = pd.date_range('2023-01-01', '2023-12-31', freq='D')
    returns = pd.DataFrame(
        np.random.normal(0.001, 0.02, (len(dates), len(assets))),
        index=dates,
        columns=assets
    )
    
    # Modern Portfolio Theory
    mpt = ModernPortfolioTheory(returns)
    
    # Efficient frontier
    frontier = mpt.efficient_frontier(n_portfolios=20)
    print("Efficient Frontier:")
    print(frontier[['expected_return', 'risk', 'sharpe_ratio']].head())
    
    # Maximum Sharpe ratio
    max_sharpe = mpt.maximum_sharpe_ratio()
    print(f"\nMaximum Sharpe Portfolio:")
    print(f"  Return: {max_sharpe['expected_return']:.2%}")
    print(f"  Risk: {max_sharpe['risk']:.2%}")
    print(f"  Sharpe: {max_sharpe['sharpe_ratio']:.2f}")
    
    # Minimum variance
    min_var = mpt.minimum_variance_portfolio()
    print(f"\nMinimum Variance Portfolio:")
    print(f"  Return: {min_var['expected_return']:.2%}")
    print(f"  Risk: {min_var['risk']:.2%}")
    
    # Smart Beta
    smart_beta = SmartBetaFactors(returns)
    factors = smart_beta.calculate_factors()
    print(f"\nSmart Beta Factors:")
    print(factors.head())
    
    # Risk Parity
    rp = RiskParity(returns.cov() * 252)
    rp_weights = rp.construct_portfolio()
    print(f"\nRisk Parity Weights:")
    print(rp_weights)
