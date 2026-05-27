"""
Sophisticated Risk Analytics Module
Institutional-grade risk metrics for biotech portfolio management
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple, Optional
import warnings


class ValueAtRisk:
    """Calculate Value at Risk (VaR) and Conditional VaR (CVaR)"""
    
    def __init__(self, confidence_level: float = 0.95):
        self.confidence_level = confidence_level
    
    def historical_var(self, returns: pd.Series, holding_period: int = 1) -> float:
        """
        Calculate historical VaR
        
        Args:
            returns: Series of returns
            holding_period: Days to hold position
            
        Returns:
            VaR as percentage of portfolio value
        """
        return np.percentile(returns, (1 - self.confidence_level) * 100) * np.sqrt(holding_period)
    
    def parametric_var(self, returns: pd.Series, holding_period: int = 1) -> float:
        """
        Calculate parametric (variance-covariance) VaR assuming normal distribution
        
        Args:
            returns: Series of returns
            holding_period: Days to hold position
            
        Returns:
            VaR as percentage
        """
        mean = returns.mean()
        std = returns.std()
        z_score = stats.norm.ppf(1 - self.confidence_level)
        return (mean - z_score * std) * np.sqrt(holding_period)
    
    def monte_carlo_var(self, returns: pd.Series, 
                       n_simulations: int = 10000,
                       holding_period: int = 1) -> Tuple[float, float]:
        """
        Calculate VaR using Monte Carlo simulation
        
        Args:
            returns: Series of historical returns
            n_simulations: Number of Monte Carlo simulations
            holding_period: Days to hold position
            
        Returns:
            Tuple of (VaR, standard error of VaR)
        """
        mean = returns.mean()
        std = returns.std()
        
        # Generate random returns
        simulated_returns = np.random.normal(mean, std, n_simulations)
        
        # Calculate VaR
        var = np.percentile(simulated_returns, (1 - self.confidence_level) * 100)
        
        # Calculate standard error using bootstrap
        bootstrap_vars = []
        for _ in range(1000):
            sample = np.random.choice(simulated_returns, size=len(simulated_returns), replace=True)
            bootstrap_vars.append(np.percentile(sample, (1 - self.confidence_level) * 100))
        
        std_error = np.std(bootstrap_vars)
        
        return var * np.sqrt(holding_period), std_error * np.sqrt(holding_period)
    
    def cvar(self, returns: pd.Series, holding_period: int = 1) -> float:
        """
        Calculate Conditional Value at Risk (Expected Shortfall)
        
        Args:
            returns: Series of returns
            holding_period: Days to hold position
            
        Returns:
            CVaR as percentage
        """
        var = self.historical_var(returns, holding_period)
        return returns[returns <= var].mean()


class RiskMetrics:
    """Calculate comprehensive risk metrics"""
    
    @staticmethod
    def calculate_all_metrics(returns: pd.Series, 
                            benchmark_returns: Optional[pd.Series] = None,
                            risk_free_rate: float = 0.02) -> Dict:
        """
        Calculate comprehensive risk metrics
        
        Args:
            returns: Asset returns
            benchmark_returns: Benchmark returns (e.g., S&P 500)
            risk_free_rate: Annual risk-free rate
            
        Returns:
            Dictionary of risk metrics
        """
        # Basic statistics
        metrics = {
            'mean_return': returns.mean(),
            'volatility': returns.std(),
            'skewness': returns.skew(),
            'kurtosis': returns.kurtosis(),
            'min_return': returns.min(),
            'max_return': returns.max(),
        }
        
        # Risk-adjusted returns
        metrics['sharpe_ratio'] = (returns.mean() - risk_free_rate/252) / returns.std() if returns.std() != 0 else 0
        metrics['sortino_ratio'] = RiskMetrics._calculate_sortino(returns, risk_free_rate)
        
        # VaR calculations
        var_calculator = ValueAtRisk(confidence_level=0.95)
        metrics['var_95'] = var_calculator.historical_var(returns)
        metrics['var_99'] = ValueAtRisk(confidence_level=0.99).historical_var(returns)
        metrics['cvar_95'] = var_calculator.cvar(returns)
        
        # Monte Carlo VaR
        mc_var, mc_se = var_calculator.monte_carlo_var(returns, n_simulations=10000)
        metrics['mc_var_95'] = mc_var
        metrics['mc_var_se'] = mc_se
        
        # Drawdown metrics
        drawdown_metrics = RiskMetrics._calculate_drawdowns(returns)
        metrics.update(drawdown_metrics)
        
        # Tail risk
        metrics['tail_ratio'] = abs(np.percentile(returns, 95)) / abs(np.percentile(returns, 5))
        
        # Beta and correlation (if benchmark provided)
        if benchmark_returns is not None:
            aligned_returns = pd.concat([returns, benchmark_returns], axis=1).dropna()
            if len(aligned_returns) > 0:
                metrics['beta'] = RiskMetrics._calculate_beta(
                    aligned_returns.iloc[:, 0], 
                    aligned_returns.iloc[:, 1]
                )
                metrics['correlation'] = aligned_returns.corr().iloc[0, 1]
                metrics['treynor_ratio'] = (
                    (returns.mean() - risk_free_rate/252) / metrics['beta'] 
                    if metrics['beta'] != 0 else 0
                )
        
        return metrics
    
    @staticmethod
    def _calculate_sortino(returns: pd.Series, risk_free_rate: float) -> float:
        """Calculate Sortino ratio"""
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() if len(downside_returns) > 0 else 0
        return (returns.mean() - risk_free_rate/252) / downside_std if downside_std != 0 else 0
    
    @staticmethod
    def _calculate_drawdowns(returns: pd.Series) -> Dict:
        """Calculate drawdown metrics"""
        # Calculate cumulative returns
        cumulative = (1 + returns).cumprod()
        
        # Calculate running maximum
        running_max = cumulative.expanding().max()
        
        # Calculate drawdown
        drawdown = (cumulative - running_max) / running_max
        
        return {
            'max_drawdown': drawdown.min(),
            'avg_drawdown': drawdown[drawdown < 0].mean() if len(drawdown[drawdown < 0]) > 0 else 0,
            'max_drawdown_duration': RiskMetrics._max_drawdown_duration(drawdown),
        }
    
    @staticmethod
    def _max_drawdown_duration(drawdown: pd.Series) -> int:
        """Calculate maximum drawdown duration in days"""
        is_drawdown = drawdown < 0
        
        if not is_drawdown.any():
            return 0
        
        # Find consecutive drawdown periods
        duration = 0
        max_duration = 0
        
        for in_drawdown in is_drawdown:
            if in_drawdown:
                duration += 1
                max_duration = max(max_duration, duration)
            else:
                duration = 0
        
        return max_duration
    
    @staticmethod
    def _calculate_beta(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """Calculate beta"""
        covariance = asset_returns.cov(benchmark_returns)
        benchmark_variance = benchmark_returns.var()
        return covariance / benchmark_variance if benchmark_variance != 0 else 0


class MonteCarloSimulator:
    """Monte Carlo simulation for portfolio scenarios"""
    
    def __init__(self, n_simulations: int = 10000, time_horizon: int = 252):
        self.n_simulations = n_simulations
        self.time_horizon = time_horizon
    
    def simulate_returns(self, 
                        mean_return: float, 
                        volatility: float,
                        distribution: str = 'normal') -> np.ndarray:
        """
        Simulate returns using specified distribution
        
        Args:
            mean_return: Expected return
            volatility: Standard deviation
            distribution: 'normal', 'student_t', or 'laplace'
            
        Returns:
            Array of simulated returns (n_simulations x time_horizon)
        """
        if distribution == 'normal':
            return np.random.normal(mean_return, volatility, 
                                   (self.n_simulations, self.time_horizon))
        elif distribution == 'student_t':
            # Student's t with df=5 for fatter tails
            return stats.t.rvs(5, mean_return, volatility, 
                             (self.n_simulations, self.time_horizon))
        elif distribution == 'laplace':
            return np.random.laplace(mean_return, volatility/np.sqrt(2), 
                                   (self.n_simulations, self.time_horizon))
        else:
            raise ValueError(f"Unknown distribution: {distribution}")
    
    def calculate_probability_metrics(self, 
                                     simulated_returns: np.ndarray,
                                     target_return: float) -> Dict:
        """
        Calculate probability metrics from simulations
        
        Args:
            simulated_returns: Simulated returns array
            target_return: Target return threshold
            
        Returns:
            Dictionary of probability metrics
        """
        # Calculate cumulative returns for each simulation
        cumulative_returns = np.prod(1 + simulated_returns, axis=1) - 1
        
        return {
            'prob_positive_return': np.mean(cumulative_returns > 0),
            'prob_exceed_target': np.mean(cumulative_returns > target_return),
            'median_return': np.median(cumulative_returns),
            'mean_return': np.mean(cumulative_returns),
            'percentile_5': np.percentile(cumulative_returns, 5),
            'percentile_95': np.percentile(cumulative_returns, 95),
            'percentile_1': np.percentile(cumulative_returns, 1),
            'percentile_99': np.percentile(cumulative_returns, 99),
        }


class StressTesting:
    """Stress testing framework"""
    
    @staticmethod
    def apply_stress_scenarios(returns: pd.Series, 
                               scenarios: Dict[str, callable]) -> Dict[str, float]:
        """
        Apply stress scenarios to returns
        
        Args:
            returns: Historical returns
            scenarios: Dictionary of scenario name -> transformation function
            
        Returns:
            Dictionary of scenario results
        """
        results = {}
        for scenario_name, transform in scenarios.items():
            stressed_returns = transform(returns.copy())
            
            # Calculate metrics for stressed returns
            var_calc = ValueAtRisk(confidence_level=0.95)
            results[scenario_name] = {
                'var_95': var_calc.historical_var(stressed_returns),
                'mean_return': stressed_returns.mean(),
                'volatility': stressed_returns.std(),
                'max_drawdown': RiskMetrics._calculate_drawdowns(stressed_returns)['max_drawdown'],
            }
        
        return results
    
    @staticmethod
    def get_default_scenarios() -> Dict[str, callable]:
        """Get default stress scenarios"""
        return {
            'market_crash_2008': lambda x: x * 2,  # Double volatility
            'covid_crash': lambda x: x * 1.5 - 0.02,  # Increased volatility + negative drift
            'biotech_bear_market': lambda x: np.where(x > 0, x * 0.3, x * 1.7),  # Asymmetric impact
            'liquidity_crisis': lambda x: x * 1.8,  # Extreme volatility
            'regulatory_shock': lambda x: x - 0.05,  # Negative shock
        }


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)
    sample_returns = pd.Series(np.random.normal(0.001, 0.02, 252))
    
    # Calculate risk metrics
    metrics = RiskMetrics.calculate_all_metrics(sample_returns)
    print("Risk Metrics:")
    for key, value in metrics.items():
        print(f"  {key}: {value:.4f}")
    
    # Monte Carlo simulation
    simulator = MonteCarloSimulator(n_simulations=10000, time_horizon=252)
    simulated = simulator.simulate_returns(0.001, 0.02, 'normal')
    prob_metrics = simulator.calculate_probability_metrics(simulated, 0.1)
    print("\nMonte Carlo Probabilities:")
    for key, value in prob_metrics.items():
        print(f"  {key}: {value:.4f}")
    
    # Stress testing
    stress = StressTesting()
    scenarios = stress.apply_stress_scenarios(sample_returns, 
                                               StressTesting.get_default_scenarios())
    print("\nStress Test Results:")
    for scenario, results in scenarios.items():
        print(f"\n{scenario}:")
        for metric, value in results.items():
            print(f"  {metric}: {value:.4f}")
