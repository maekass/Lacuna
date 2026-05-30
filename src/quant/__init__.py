# Copyright (c) 2026 MAYA KASS, MPH - UN GOODWILL AMBASSADOR
# Licensed under the Business Source License 1.1
# See LICENSE file for full terms
# Change Date: 2028-05-27 (becomes Apache 2.0)

"""
Quantitative Finance Module

This module provides institutional-grade quantitative finance tools including:
- Risk analytics (VaR, CVaR, stress testing)
- Portfolio optimization (Markowitz, Black-Litterman, Smart Beta, Risk Parity)
- Options pricing (Black-Scholes, Binomial, Monte Carlo)
- Alternative data (NLP sentiment, patent intelligence, regulatory analysis)
- Backtesting (event-driven engine, walk-forward optimization)

LEGAL DISCLAIMER: This software is for educational and research purposes only.
Not investment advice. See LICENSE for full terms.
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
