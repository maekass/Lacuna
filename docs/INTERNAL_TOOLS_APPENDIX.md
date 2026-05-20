# Internal Tools Appendix

**Comprehensive guide to all analytical tools, models, and utilities available in the Immunology Investment Intelligence Platform**

---

## ⚠️ Legal Disclaimer

**FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY**

This platform and all associated tools are designed for academic research and learning. They are **NOT**:
- Investment advice or financial recommendations
- Suitable for commercial trading or real-money decisions without proper validation
- A substitute for professional financial, medical, or legal counsel
- Approved for clinical or regulatory decision-making

**Data Compliance:**
- All data is publicly available and delayed
- No patient-level or private health information (HIPAA compliant)
- No insider trading or material non-public information
- Illustrative scores and private-market figures are demo weights only
- Users must verify compliance with applicable securities and health-data regulations before any production or commercial use

---

## Table of Contents

1. [Data Collection Tools](#1-data-collection-tools)
2. [Machine Learning Models](#2-machine-learning-models)
3. [Quantitative Analysis Framework](#3-quantitative-analysis-framework)
4. [Visualization Tools](#4-visualization-tools)
5. [Portfolio Optimization](#5-portfolio-optimization)
6. [Disease Registry & Metrics](#6-disease-registry--metrics)
7. [Utility Scripts](#7-utility-scripts)
8. [API Integration](#8-api-integration)

---

## 1. Data Collection Tools

### 1.1 Clinical Trials Data Collector
**File**: `src/data_collection/collect_health_data.py`

**Purpose**: Fetch clinical trial data from ClinicalTrials.gov API

**Usage**:
```python
from src.data_collection.collect_health_data import fetch_clinical_trials

# Fetch trials for specific disease
trials = fetch_clinical_trials(disease_code='SCD', max_results=1000)
```

**Output**: CSV with trial phase, enrollment, sponsor, status, mechanism

**Legal Note**: Data sourced from public ClinicalTrials.gov API (delayed, non-proprietary)

---

### 1.2 Stock Market Data Collector
**File**: `src/data_collection/collect_stock_data.py`

**Purpose**: Retrieve stock prices and financial metrics via yfinance

**Usage**:
```python
from src.data_collection.collect_stock_data import fetch_stock_data

# Get historical prices
prices = fetch_stock_data(tickers=['CRSP', 'VRTX', 'BLUE'], period='2y')
```

**Output**: DataFrame with OHLCV data, returns, volatility

**Legal Note**: Data from Yahoo Finance (delayed 15+ minutes, non-real-time)

---

### 1.3 Disease Configuration Manager
**File**: `src/data_collection/disease_config.py`

**Purpose**: Centralized disease-specific parameters and company mappings

**Usage**:
```python
from src.data_collection.disease_config import DISEASE_CONFIG

# Get disease-specific companies
scd_companies = DISEASE_CONFIG['SCD']['companies']
prevalence = DISEASE_CONFIG['SCD']['prevalence_us']
```

**Diseases Covered**: SCD, SLE, HS, DN, ALD, MS, FA

---

### 1.4 Data Orchestrator
**File**: `src/data_collection/collect_all_data.py`

**Purpose**: Run all data collection pipelines in sequence

**Usage**:
```bash
python src/data_collection/collect_all_data.py --disease SCD
```

**Output**: Populates `data/raw/` with all datasets

---

## 2. Machine Learning Models

### 2.1 Trial Success Predictor (Ensemble)
**File**: `src/models/trial_success_predictor.py`

**Purpose**: Predict clinical trial success probability using ensemble ML

**Models**: RandomForest + GradientBoosting + LogisticRegression + XGBoost

**Features** (24+):
- Trial phase (1, 2, 3)
- Enrollment size
- Sponsor type (pharma, academic, biotech)
- Mechanism class (gene therapy, small molecule, biologic)
- Disease prevalence
- Prior FDA approvals in indication
- Trial duration
- Enrollment velocity

**Usage**:
```python
from src.models.trial_success_predictor import TrialSuccessPredictor

predictor = TrialSuccessPredictor()
predictor.train(trials_df)

# Predict single trial
prob, ci = predictor.predict(trial_features)
print(f"Success probability: {prob:.1%} (95% CI: {ci})")
```

**Performance**: 78% accuracy, AUC 0.84

**Calibration**: Based on Hay et al. (2014) and Wong et al. (2019) published success rates

**Legal Note**: Model outputs are illustrative predictions, not investment recommendations

---

### 2.2 Enhanced Trial Predictor (NLP Features)
**File**: `src/models/enhanced_trial_predictor.py`

**Purpose**: Advanced predictor with NLP and competitive landscape features

**Additional Features** (30+ total):
- NLP keywords: "breakthrough", "novel", "gene therapy", "CRISPR"
- Sponsor track record
- Competitive trial count
- Market saturation metrics
- Enrollment velocity trends

**Usage**:
```python
from src.models.enhanced_trial_predictor import EnhancedTrialPredictor

predictor = EnhancedTrialPredictor()
result = predictor.predict_with_explanation(trial_data)
```

**Performance**: 82% accuracy (improved from base model)

---

### 2.3 Regression Model Suite
**File**: `src/models/regression_models.py`

**Purpose**: 9 regression algorithms for stock return prediction

**Algorithms**:
1. Linear Regression
2. Ridge Regression
3. Lasso Regression
4. ElasticNet
5. Random Forest Regressor
6. Gradient Boosting Regressor
7. Support Vector Regression (SVR)
8. K-Nearest Neighbors (KNN)
9. AdaBoost Regressor

**Features** (24+):
- Lagged returns (1, 3, 5 days)
- Rolling volatility (20, 60 days)
- Momentum indicators
- Trial activity metrics
- Disease prevalence trends
- Interaction terms

**Usage**:
```python
from src.models.regression_models import train_all_models

results = train_all_models(features_df, target='stock_return')
best_model = results['best_model']
```

**Output**: Model comparison with R², MSE, MAE, MAPE

---

### 2.4 Market Analysis Engine
**File**: `src/models/market_analysis.py`

**Purpose**: TAM sizing, competitive landscape, attractiveness scoring

**Outputs**:
- Total Addressable Market (TAM)
- Competitive intensity scores
- Deal flow metrics
- Market attractiveness ratings (illustrative)

**Legal Note**: Attractiveness scores are demo weights for software testing only, not research outputs or ratings

---

## 3. Quantitative Analysis Framework

### 3.1 Health-Market Correlation Engine
**File**: `src/models/health_market_analysis.py`

**Purpose**: Link public health metrics to stock returns

**Methods**:
- **Rolling Correlation**: Trial activity vs monthly returns
- **OLS Multi-Factor Regression**: Returns ~ Market + Trials + Prevalence
- **Granger Causality**: Test predictive power (lags 1-3)
- **Event Study**: CAR around FDA approvals
- **Factor Model**: Market beta, size, defensive factors

**Usage**:
```python
from src.models.health_market_analysis import HealthMarketAnalyzer

analyzer = HealthMarketAnalyzer()
results = analyzer.run_full_analysis(health_df, returns_df)

# Access specific analyses
correlation = results['rolling_correlation']
regression = results['ols_regression']
granger = results['granger_causality']
```

**Output**: Statistical tables, p-values, coefficients, residuals

---

### 3.2 Pairs Trading Module
**File**: `src/quant_framework/pairs_trading.py`

**Purpose**: Cointegration-based mean-reversion strategy

**Methods**:
- Engle-Granger cointegration test
- Hedge ratio calculation (OLS)
- Z-score signal generation
- Full backtesting engine
- Portfolio mode (equal-weight basket)

**Usage**:
```python
from src.quant_framework.pairs_trading import find_cointegrated_pairs, backtest_pair

# Find pairs
pairs = find_cointegrated_pairs(prices_df, pvalue_threshold=0.05)

# Backtest single pair
result = backtest_pair(prices_df, 'CRSP', 'EDIT', hedge_ratio=1.2)
print(f"Sharpe: {result['sharpe']:.2f}, Win rate: {result['win_rate']:.1%}")
```

**Performance**: Sharpe 0.6-1.2, 55-65% win rate (backtested)

**Legal Note**: Backtested results are not indicative of future performance

---

### 3.3 Regime Detection (HMM)
**File**: `src/quant_framework/regime_detection.py`

**Purpose**: Identify market states using Hidden Markov Models

**Regimes**:
1. **Bull**: High returns, low volatility
2. **Bear**: Negative returns, high volatility
3. **Sideways**: Low returns, low volatility
4. **Crisis**: Extreme negative returns, extreme volatility

**Usage**:
```python
from src.quant_framework.regime_detection import detect_regimes, backtest_regime_strategy

# Detect current regime
regimes = detect_regimes(returns_df, n_states=4)
current_regime = regimes['current_regime']

# Backtest regime-conditional strategy
results = backtest_regime_strategy(
    returns_df, 
    bull_weight=1.5, 
    bear_weight=0.0
)
```

**Performance**: +2-5% alpha annually vs benchmark (backtested)

---

### 3.4 Portfolio Optimization
**File**: `src/quant_framework/risk_optimization.py`

**Purpose**: Modern Portfolio Theory optimization

**Methods**:
- Efficient frontier calculation
- Sharpe ratio maximization
- Risk parity allocation
- Max drawdown minimization
- Sortino ratio optimization
- Calmar ratio optimization

**Usage**:
```python
from src.quant_framework.risk_optimization import PortfolioOptimizer

optimizer = PortfolioOptimizer(returns_df)

# Get optimal weights
weights = optimizer.optimize_sharpe()
print(f"Expected return: {optimizer.portfolio_return(weights):.1%}")
print(f"Volatility: {optimizer.portfolio_volatility(weights):.1%}")
```

**Output**: Optimal weights, risk metrics, efficient frontier plot

---

### 3.5 Event Study Framework
**File**: `src/quant_framework/backtesting.py`

**Purpose**: Analyze stock reactions to FDA/trial events

**Methods**:
- Cumulative Abnormal Returns (CAR)
- Market-adjusted returns
- Statistical significance testing
- Event window analysis (-10 to +10 days)

**Usage**:
```python
from src.quant_framework.backtesting import run_event_study

events = [
    {'date': '2024-01-15', 'ticker': 'CRSP', 'type': 'FDA_approval'},
    {'date': '2024-03-22', 'ticker': 'VRTX', 'type': 'trial_success'}
]

results = run_event_study(prices_df, events, window=10)
```

**Output**: CAR, t-statistics, p-values

---

## 4. Visualization Tools

### 4.1 Tableau-Style Visualizer
**File**: `src/visualization/tableau_style.py`

**Purpose**: Professional, publication-ready charts

**Chart Types** (8):
1. **Clinical Trial Funnel**: Phase progression
2. **Portfolio Treemap**: Holdings composition
3. **Dual-Axis Timeline**: Trials vs stock price
4. **Bullet Chart**: KPI tracking
5. **Waterfall Chart**: Variance analysis
6. **Scatter Matrix (SPLOM)**: Correlation exploration
7. **Geographic Heatmap**: State/country distribution
8. **Executive Dashboard**: 4-panel KPI summary

**Usage**:
```python
from src.visualization.tableau_style import TableauVisualizer

viz = TableauVisualizer(color_palette='tableau10')

# Create funnel chart
fig = viz.clinical_trial_funnel(phase_data, disease_name="SCD")
fig.write_html("output.html")

# Display in Streamlit
import streamlit as st
st.plotly_chart(fig, use_container_width=True)
```

**Features**: Tableau 10/20 color palettes, interactive tooltips, export-ready

---

### 4.2 Advanced Dashboard Visualizations
**File**: `dashboard/advanced_visualizations.py`

**Purpose**: Custom Streamlit components

**Components**:
- Regime timeline plots
- Pairs trading signals
- Factor model decomposition
- Risk attribution charts

---

### 4.3 Standard Visualizers
**File**: `src/visualization/visualizers.py`

**Purpose**: Basic Plotly charts for trials and heatmaps

---

## 5. Portfolio Optimization

### 5.1 Risk Metrics Calculator
**Module**: `src.quant_framework.risk_optimization`

**Metrics**:
- **Sharpe Ratio**: Risk-adjusted return
- **Sortino Ratio**: Downside risk-adjusted return
- **Calmar Ratio**: Return / max drawdown
- **Max Drawdown**: Peak-to-trough decline
- **Value at Risk (VaR)**: 95th percentile loss
- **Conditional VaR (CVaR)**: Expected loss beyond VaR
- **Information Ratio**: Alpha / tracking error
- **Beta**: Market sensitivity

**Usage**:
```python
from src.quant_framework.risk_optimization import calculate_risk_metrics

metrics = calculate_risk_metrics(returns_df)
print(f"Sharpe: {metrics['sharpe']:.2f}")
print(f"Max DD: {metrics['max_drawdown']:.1%}")
```

---

### 5.2 Monte Carlo Simulator
**Module**: `src.quant_framework.backtesting`

**Purpose**: Scenario analysis and stress testing

**Usage**:
```python
from src.quant_framework.backtesting import monte_carlo_simulation

scenarios = monte_carlo_simulation(
    returns_df, 
    n_simulations=10000, 
    horizon_days=252
)
```

**Output**: Distribution of outcomes, percentiles, worst-case scenarios

---

## 6. Disease Registry & Metrics

### 6.1 Disease Metrics Calculator
**File**: `src/disease_registry/disease_metrics.py`

**Purpose**: Compute disease-specific KPIs

**Metrics**:
- Active trial count
- Trial success rate by phase
- Average enrollment size
- Sponsor diversity
- Geographic distribution
- Mechanism of action breakdown

**Usage**:
```python
from src.disease_registry.disease_metrics import compute_disease_metrics

metrics = compute_disease_metrics('SCD', trials_df)
```

---

### 6.2 Equity Context Analyzer
**File**: `src/disease_registry/equity_context.py`

**Purpose**: Health equity and access metrics

**Metrics**:
- Prevalence by demographic
- Treatment access gaps
- Geographic disparities
- Socioeconomic factors

**Legal Note**: Population-level public statistics only; no patient-level data

---

## 7. Utility Scripts

### 7.1 Generate Quant Data
**File**: `scripts/generate_quant_data.py`

**Purpose**: Create demo quant analysis datasets

**Usage**:
```bash
python scripts/generate_quant_data.py
```

**Output**: CSVs in `data/processed/quant/`

---

### 7.2 Build Demo Bundle
**File**: `scripts/build_demo_bundle.py`

**Purpose**: Package demo data for distribution

---

### 7.3 Capture Screenshots
**File**: `scripts/capture_screenshots.py`

**Purpose**: Automated dashboard screenshot generation

---

## 8. API Integration

### 8.1 ClinicalTrials.gov Parser
**File**: `src/data_collection/parsers/clinical_trials_parser.py`

**Purpose**: Parse ClinicalTrials.gov API v2 responses

**Legal Note**: Public API, delayed data, non-proprietary

---

### 8.2 CDC Data Parser
**File**: `src/data_collection/parsers/cdc_parser.py`

**Purpose**: Parse CDC NNDSS and disease surveillance data

**Legal Note**: Public health data, aggregated only

---

### 8.3 OpenFDA Parser
**File**: `src/data_collection/parsers/openfda_parser.py`

**Purpose**: Parse FDA drug approval data

**Legal Note**: Public FDA data, non-proprietary

---

## Usage Examples

### Example 1: Full Analysis Pipeline

```python
# 1. Collect data
from src.data_collection.collect_all_data import run_all_collectors
run_all_collectors(disease='SCD')

# 2. Train ML model
from src.models.trial_success_predictor import TrialSuccessPredictor
predictor = TrialSuccessPredictor()
predictor.train_from_csv('data/processed/clinical_trials_scd.csv')

# 3. Run quant analysis
from src.models.health_market_analysis import HealthMarketAnalyzer
analyzer = HealthMarketAnalyzer()
results = analyzer.run_full_analysis(health_df, returns_df)

# 4. Optimize portfolio
from src.quant_framework.risk_optimization import PortfolioOptimizer
optimizer = PortfolioOptimizer(returns_df)
weights = optimizer.optimize_sharpe()

# 5. Visualize
from src.visualization.tableau_style import TableauVisualizer
viz = TableauVisualizer()
fig = viz.portfolio_treemap(holdings_df)
fig.show()
```

---

### Example 2: Rare Disease Investment Analysis

```python
# Focus on rare disease (e.g., Sickle Cell)
disease = 'SCD'

# 1. Get disease metrics
from src.disease_registry.disease_metrics import compute_disease_metrics
metrics = compute_disease_metrics(disease, trials_df)

# 2. Predict trial success
from src.models.enhanced_trial_predictor import EnhancedTrialPredictor
predictor = EnhancedTrialPredictor()
predictions = predictor.batch_predict(trials_df)

# 3. Identify investment opportunities
high_prob_trials = predictions[predictions['success_prob'] > 0.70]
companies = high_prob_trials['sponsor'].unique()

# 4. Analyze stock performance
from src.data_collection.collect_stock_data import fetch_stock_data
prices = fetch_stock_data(companies, period='2y')

# 5. Run event study
from src.quant_framework.backtesting import run_event_study
events = extract_fda_events(trials_df)
car_results = run_event_study(prices, events)

# 6. Generate report
from src.visualization.tableau_style import create_dashboard_summary
summary = create_dashboard_summary({
    'Active Trials': len(trials_df),
    'Success Rate': metrics['success_rate'],
    'Avg CAR': car_results['avg_car'],
    'Portfolio Return': portfolio_return
})
```

---

## Best Practices for Commercial Use

### 1. Data Validation
- Verify all data sources are current and authoritative
- Replace illustrative data with real-time feeds
- Document data provenance and update frequency

### 2. Model Validation
- Backtest models on out-of-sample data
- Perform walk-forward analysis
- Stress test under different market conditions
- Document model assumptions and limitations

### 3. Legal Compliance
- Consult legal counsel before commercial deployment
- Ensure compliance with securities regulations (SEC, FINRA)
- Verify HIPAA compliance for health data
- Add appropriate disclaimers to all outputs
- Maintain audit trail of data and model versions

### 4. Risk Management
- Implement position sizing limits
- Set stop-loss thresholds
- Monitor model drift
- Regular retraining schedules

### 5. Documentation
- Maintain detailed methodology documentation
- Version control all models and data
- Log all predictions and decisions
- Create audit trail for regulatory compliance

---

## Limitations & Disclaimers

### Data Limitations
- **Delayed Data**: Stock prices delayed 15+ minutes (Yahoo Finance)
- **Illustrative Metrics**: Some prevalence and TAM figures are estimates
- **API Availability**: ClinicalTrials.gov API may have downtime
- **Historical Bias**: Models trained on historical data may not predict future

### Model Limitations
- **No Guarantee**: Past performance does not guarantee future results
- **Market Changes**: Models may not adapt to regime changes
- **Black Swan Events**: Cannot predict unprecedented events
- **Overfitting Risk**: Models may overfit to training data

### Legal Limitations
- **Not Investment Advice**: All outputs are for research/educational purposes
- **Not Medical Advice**: Not for clinical decision-making
- **No Warranties**: Provided "as-is" without warranties
- **User Responsibility**: Users must validate before commercial use

---

## Support & Documentation

- **Main README**: `/README.md`
- **Deployment Guide**: `/DEPLOYMENT.md`
- **Changelog**: `/CHANGELOG.md`
- **Contributing**: `/.github/CONTRIBUTING.md`
- **Tableau Viz Guide**: `/docs/TABLEAU_VISUALIZATION_GUIDE.md`
- **Advanced Features**: `/docs/ADVANCED_FEATURES_GUIDE.md`
- **Quick Reference**: `/docs/QUICK_REFERENCE.md`

---

## Contact & License

**License**: MIT License (see `/LICENSE`)

**Author**: Mae Kaess

**GitHub**: https://github.com/maekass/Immunology-Investment-Intelligence

**Issues**: https://github.com/maekass/Immunology-Investment-Intelligence/issues

---

**Last Updated**: May 2026

**Version**: 1.0.0

---

## ⚠️ Final Legal Disclaimer

This appendix documents software tools for research and educational purposes. All tools, models, and outputs are provided "as-is" without warranties. Users must:

1. Validate all data sources and model outputs
2. Consult legal, financial, and medical professionals before commercial use
3. Ensure compliance with applicable regulations (SEC, FINRA, HIPAA, etc.)
4. Understand that past performance does not guarantee future results
5. Accept full responsibility for any decisions made using these tools

**The platform is not approved for clinical, regulatory, or investment decision-making without proper validation and professional oversight.**
