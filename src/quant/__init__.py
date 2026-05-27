"""
Quantitative Finance Module

This module provides institutional-grade quantitative finance tools including:
- Risk analytics (VaR, CVaR, stress testing)
- Portfolio optimization (Markowitz, Black-Litterman, Smart Beta, Risk Parity)
- Options pricing (Black-Scholes, Binomial, Monte Carlo)
- Alternative data (NLP sentiment, patent intelligence, regulatory analysis)
- Backtesting (event-driven engine, walk-forward optimization)
"""

__version__ = "1.0.0"

# Make key classes available at module level
from .risk_analytics import ValueAtRisk, RiskMetrics, MonteCarloSimulator, StressTesting
from .portfolio_optimization import ModernPortfolioTheory, SmartBetaFactors, RiskParity, HierarchicalRiskParity
from .options_pricing import BlackScholesModel, BinomialModel, MonteCarloOptionPricing, VolatilitySurface
from .alternative_data import (
    SentimentAnalyzer,
    PatentIntelligence,
    RegulatoryIntelligence,
    ClinicalTrialPredictor,
    MarketImpactAnalyzer
)
from .backtesting import Portfolio, BacktestEngine, WalkForwardOptimizer, MonteCarloBacktest

__all__ = [
    # Risk Analytics
    'ValueAtRisk',
    'RiskMetrics',
    'MonteCarloSimulator',
    'StressTesting',
    # Portfolio Optimization
    'ModernPortfolioTheory',
    'SmartBetaFactors',
    'RiskParity',
    'HierarchicalRiskParity',
    # Options Pricing
    'BlackScholesModel',
    'BinomialModel',
    'MonteCarloOptionPricing',
    'VolatilitySurface',
    # Alternative Data
    'SentimentAnalyzer',
    'PatentIntelligence',
    'RegulatoryIntelligence',
    'ClinicalTrialPredictor',
    'MarketImpactAnalyzer',
    # Backtesting
    'Portfolio',
    'BacktestEngine',
    'WalkForwardOptimizer',
    'MonteCarloBacktest',
]
