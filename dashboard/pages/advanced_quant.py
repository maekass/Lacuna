"""
Advanced Quantitative Analytics Dashboard Page
Institutional-grade quant tools for world-class investors
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Import quant modules
from src.quant.risk_analytics import ValueAtRisk, RiskMetrics, MonteCarloSimulator, StressTesting
from src.quant.portfolio_optimization import ModernPortfolioTheory, SmartBetaFactors, RiskParity
from src.quant.options_pricing import BlackScholesModel, MonteCarloOptionPricing


def render_advanced_quant_page():
    """Render the advanced quant analytics page"""
    
    st.markdown("# Advanced Quantitative Analytics")
    st.markdown("### Institutional-Grade Risk Management & Portfolio Optimization")
    
    # Hero metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("VaR (95%)", "-2.34%", "Daily")
    col2.metric("Sharpe Ratio", "1.87", "+0.12")
    col3.metric("Max Drawdown", "-8.45%", "YTD")
    col4.metric("Beta", "0.74", "vs S&P 500")
    
    st.markdown("---")
    
    # Create tabs for different quant modules
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Risk Analytics",
        "⚖️ Portfolio Optimization",
        "📈 Options Pricing",
        "🔮 Monte Carlo",
        "⚡ Stress Testing"
    ])
    
    with tab1:
        render_risk_analytics()
    
    with tab2:
        render_portfolio_optimization()
    
    with tab3:
        render_options_pricing()
    
    with tab4:
        render_monte_carlo()
    
    with tab5:
        render_stress_testing()
    
    # Methodology section
    st.markdown("---")
    with st.expander("📚 Quantitative Methodology"):
        st.markdown("""
        **Risk Models:**
        - Value at Risk (VaR): Historical, Parametric, and Monte Carlo methods
        - Conditional VaR (CVaR): Expected shortfall for tail risk
        - Greeks: Delta, Gamma, Theta, Vega, Rho for options risk
        
        **Portfolio Optimization:**
        - Modern Portfolio Theory (Markowitz): Mean-variance optimization
        - Black-Litterman: Bayesian approach with investor views
        - Smart Beta: Factor-based portfolio construction
        - Risk Parity: Equal risk contribution weighting
        - Hierarchical Risk Parity: Hierarchical clustering approach
        
        **Options Pricing:**
        - Black-Scholes: Closed-form solution with Greeks
        - Binomial Model: American and European options
        - Monte Carlo: Path-dependent exotic options
        - Implied Volatility: Brent's method for IV calculation
        
        **Advanced Analytics:**
        - Monte Carlo Simulation: 10,000+ scenarios
        - Stress Testing: Historical and hypothetical scenarios
        - Walk-Forward Optimization: Out-of-sample validation
        """)


def render_risk_analytics():
    """Render risk analytics section"""
    st.subheader("Risk Analytics")
    
    # Generate sample returns data
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.02, 252), name='Returns')
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Value at Risk (VaR)")
        
        # Calculate VaR
        var_calc = ValueAtRisk(confidence_level=0.95)
        historical_var = var_calc.historical_var(returns)
        parametric_var = var_calc.parametric_var(returns)
        mc_var, mc_se = var_calc.monte_carlo_var(returns, n_simulations=10000)
        cvar = var_calc.cvar(returns)
        
        # Display VaR metrics
        var_data = pd.DataFrame({
            'Method': ['Historical', 'Parametric', 'Monte Carlo', 'CVaR (Expected Shortfall)'],
            'VaR (95%)': [f"{historical_var:.2%}", f"{parametric_var:.2%}", 
                         f"{mc_var:.2%} ± {1.96*mc_se:.2%}", f"{cvar:.2%}"]
        })
        st.dataframe(var_data, hide_index=True)
        
        st.caption("VaR represents the maximum expected loss at 95% confidence level")
    
    with col2:
        st.markdown("#### Risk Metrics")
        
        # Calculate comprehensive metrics
        metrics = RiskMetrics.calculate_all_metrics(returns)
        
        # Display key metrics
        risk_df = pd.DataFrame({
            'Metric': ['Annualized Return', 'Volatility', 'Sharpe Ratio', 'Sortino Ratio',
                      'Max Drawdown', 'Tail Ratio'],
            'Value': [f"{metrics['mean_return']:.2%}", f"{metrics['volatility']:.2%}",
                     f"{metrics['sharpe_ratio']:.2f}", f"{metrics['sortino_ratio']:.2f}",
                     f"{metrics['max_drawdown']:.2%}", f"{metrics['tail_ratio']:.2f}"]
        })
        st.dataframe(risk_df, hide_index=True)
    
    # Returns distribution
    st.markdown("#### Returns Distribution")
    
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=returns,
        nbinsx=30,
        name='Returns Distribution',
        marker_color='#5A8A6F',
        opacity=0.7
    ))
    
    # Add VaR lines
    fig.add_vline(x=historical_var, line_dash="dash", line_color="red",
                  annotation_text="VaR 95%", annotation_position="top")
    fig.add_vline(x=cvar, line_dash="dash", line_color="orange",
                  annotation_text="CVaR", annotation_position="top")
    
    fig.update_layout(
        title="Daily Returns Distribution with VaR",
        xaxis_title="Return",
        yaxis_title="Frequency",
        showlegend=False,
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)


def render_portfolio_optimization():
    """Render portfolio optimization section"""
    st.subheader("Portfolio Optimization")
    
    # Generate sample portfolio data
    np.random.seed(42)
    assets = ['CRSP', 'VRTX', 'BEAM', 'NTLA', 'EDIT', 'NVS', 'BMY']
    n_assets = len(assets)
    
    # Generate realistic returns with correlations
    mean_returns = np.array([0.15, 0.12, 0.18, 0.20, 0.14, 0.10, 0.08]) / 252
    cov_matrix = np.diag([0.35, 0.30, 0.40, 0.45, 0.38, 0.25, 0.22]) / np.sqrt(252)
    cov_matrix = cov_matrix @ cov_matrix.T
    
    # Add some correlation
    for i in range(n_assets):
        for j in range(i+1, n_assets):
            if abs(i-j) <= 2:  # Nearby assets more correlated
                cov_matrix[i,j] = cov_matrix[j,i] = 0.3 * cov_matrix[i,i]
    
    # Generate sample returns
    dates = pd.date_range('2023-01-01', '2023-12-31', freq='D')
    returns_df = pd.DataFrame(
        np.random.multivariate_normal(mean_returns, cov_matrix, len(dates)),
        columns=assets,
        index=dates
    )
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Efficient Frontier")
        
        # Calculate efficient frontier
        mpt = ModernPortfolioTheory(returns_df)
        frontier = mpt.efficient_frontier(n_portfolios=50)
        
        # Plot efficient frontier
        fig = go.Figure()
        
        # All portfolios
        fig.add_trace(go.Scatter(
            x=frontier['risk'],
            y=frontier['expected_return'],
            mode='markers',
            marker=dict(
                size=8,
                color=frontier['sharpe_ratio'],
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title='Sharpe Ratio')
            ),
            name='Efficient Frontier'
        ))
        
        # Max Sharpe portfolio
        max_sharpe = frontier.loc[frontier['sharpe_ratio'].idxmax()]
        fig.add_trace(go.Scatter(
            x=[max_sharpe['risk']],
            y=[max_sharpe['expected_return']],
            mode='markers',
            marker=dict(size=15, color='red', symbol='star'),
            name='Max Sharpe'
        ))
        
        fig.update_layout(
            title="Mean-Variance Efficient Frontier",
            xaxis_title="Risk (Volatility)",
            yaxis_title="Expected Return",
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("#### Optimal Portfolios")
        
        # Calculate optimal portfolios
        max_sharpe_port = mpt.maximum_sharpe_ratio(risk_free_rate=0.05)
        min_var_port = mpt.minimum_variance_portfolio()
        
        # Display weights
        weights_df = pd.DataFrame({
            'Asset': assets,
            'Max Sharpe': [max_sharpe_port['weights'].get(a, 0) for a in assets],
            'Min Variance': [min_var_port['weights'].get(a, 0) for a in assets],
        })
        
        # Format as percentages
        weights_df['Max Sharpe'] = weights_df['Max Sharpe'].apply(lambda x: f"{x:.1%}")
        weights_df['Min Variance'] = weights_df['Min Variance'].apply(lambda x: f"{x:.1%}")
        
        st.dataframe(weights_df, hide_index=True)
        
        # Portfolio metrics
        st.markdown("**Portfolio Metrics**")
        metrics_df = pd.DataFrame({
            'Strategy': ['Max Sharpe', 'Min Variance'],
            'Expected Return': [f"{max_sharpe_port['expected_return']:.1%}",
                              f"{min_var_port['expected_return']:.1%}"],
            'Risk': [f"{max_sharpe_port['risk']:.1%}",
                    f"{min_var_port['risk']:.1%}"],
            'Sharpe': [f"{max_sharpe_port['sharpe_ratio']:.2f}", "N/A"]
        })
        st.dataframe(metrics_df, hide_index=True)
    
    # Smart Beta section
    st.markdown("#### Smart Beta Factor Analysis")
    
    smart_beta = SmartBetaFactors(returns_df)
    factors = smart_beta.calculate_factors()
    
    # Plot factor exposures
    fig = go.Figure()
    for factor in factors.columns:
        fig.add_trace(go.Bar(
            name=factor.replace('_', ' ').title(),
            x=factors.index,
            y=factors[factor]
        ))
    
    fig.update_layout(
        title="Factor Exposures by Asset",
        xaxis_title="Asset",
        yaxis_title="Factor Score (z-score)",
        barmode='group',
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)


def render_options_pricing():
    """Render options pricing section"""
    st.subheader("Options Pricing & Greeks")
    
    # Input parameters
    col1, col2, col3 = st.columns(3)
    
    with col1:
        S = st.number_input("Stock Price ($)", value=100.0, min_value=1.0, step=1.0)
        K = st.number_input("Strike Price ($)", value=100.0, min_value=1.0, step=1.0)
    
    with col2:
        T = st.number_input("Time to Maturity (years)", value=1.0, min_value=0.1, max_value=5.0, step=0.1)
        r = st.number_input("Risk-Free Rate", value=0.05, min_value=0.0, max_value=0.2, step=0.01)
    
    with col3:
        sigma = st.number_input("Volatility", value=0.30, min_value=0.01, max_value=1.0, step=0.01)
        option_type = st.selectbox("Option Type", ["Call", "Put"])
    
    # Calculate prices
    if option_type == "Call":
        price = BlackScholesModel.call_price(S, K, T, r, sigma)
        greeks = BlackScholesModel.call_greeks(S, K, T, r, sigma)
    else:
        price = BlackScholesModel.put_price(S, K, T, r, sigma)
        # Put Greeks (similar to call for most)
        greeks = BlackScholesModel.call_greeks(S, K, T, r, sigma)
        greeks['delta'] = greeks['delta'] - 1  # Put-call parity adjustment
    
    # Display results
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"#### {option_type} Option Price: **${price:.2f}**")
        
        # Price sensitivity table
        st.markdown("**Price Sensitivity**")
        sensitivities = []
        
        for vol in [0.2, 0.3, 0.4]:
            for strike in [K*0.9, K, K*1.1]:
                if option_type == "Call":
                    p = BlackScholesModel.call_price(S, strike, T, r, vol)
                else:
                    p = BlackScholesModel.put_price(S, strike, T, r, vol)
                
                moneyness = "ITM" if (option_type == "Call" and S > strike) or (option_type == "Put" and S < strike) else "OTM"
                if abs(S - strike) / K < 0.05:
                    moneyness = "ATM"
                
                sensitivities.append({
                    'Strike': f"${strike:.0f}",
                    'Vol': f"{vol:.0%}",
                    'Moneyness': moneyness,
                    'Price': f"${p:.2f}"
                })
        
        st.dataframe(pd.DataFrame(sensitivities), hide_index=True)
    
    with col2:
        st.markdown("#### Option Greeks")
        
        greeks_df = pd.DataFrame({
            'Greek': ['Delta', 'Gamma', 'Theta', 'Vega', 'Rho'],
            'Value': [
                f"{greeks['delta']:.4f}",
                f"{greeks['gamma']:.4f}",
                f"{greeks['theta']:.4f}",
                f"{greeks['vega']:.4f}",
                f"{greeks['rho']:.4f}"
            ],
            'Interpretation': [
                'Price sensitivity to stock',
                'Delta sensitivity to stock',
                'Time decay (per day)',
                'Volatility sensitivity',
                'Interest rate sensitivity'
            ]
        })
        st.dataframe(greeks_df, hide_index=True)
    
    # P&L visualization
    st.markdown("#### P&L Diagram")
    
    # Generate P&L at expiration
    stock_prices = np.linspace(K*0.5, K*1.5, 100)
    
    if option_type == "Call":
        pnl = np.maximum(stock_prices - K, 0) - price
    else:
        pnl = np.maximum(K - stock_prices, 0) - price
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=stock_prices,
        y=pnl,
        mode='lines',
        line=dict(color='#5A8A6F', width=2),
        fill='tozeroy',
        fillcolor='rgba(90, 138, 111, 0.2)'
    ))
    
    fig.add_hline(y=0, line_dash="dash", line_color="gray")
    fig.add_vline(x=K, line_dash="dash", line_color="red", annotation_text="Strike")
    
    fig.update_layout(
        title=f"{option_type} Option P&L at Expiration",
        xaxis_title="Stock Price at Expiration",
        yaxis_title="Profit/Loss",
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)


def render_monte_carlo():
    """Render Monte Carlo simulation section"""
    st.subheader("Monte Carlo Simulation")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Simulation Parameters")
        
        n_simulations = st.slider("Number of Simulations", 1000, 50000, 10000, 1000)
        time_horizon = st.slider("Time Horizon (days)", 30, 252, 252, 30)
        
        mean_return = st.number_input("Expected Daily Return", value=0.001, step=0.0001, format="%.4f")
        volatility = st.number_input("Daily Volatility", value=0.02, step=0.001, format="%.3f")
        
        distribution = st.selectbox(
            "Return Distribution",
            ["Normal", "Student's t (fat tails)", "Laplace (double exponential)"]
        )
        
        dist_map = {"Normal": "normal", "Student's t (fat tails)": "student_t", 
                   "Laplace (double exponential)": "laplace"}
    
    with col2:
        st.markdown("#### Simulation Results")
        
        # Run simulation
        simulator = MonteCarloSimulator(n_simulations=n_simulations, time_horizon=time_horizon)
        simulated_returns = simulator.simulate_returns(
            mean_return, volatility, dist_map[distribution]
        )
        
        # Calculate probability metrics
        prob_metrics = simulator.calculate_probability_metrics(simulated_returns, target_return=0.10)
        
        # Display metrics
        metrics_df = pd.DataFrame({
            'Metric': ['Prob. Positive Return', 'Prob. Exceed 10%', 'Median Return', 
                      'Mean Return', '5th Percentile', '95th Percentile'],
            'Value': [
                f"{prob_metrics['prob_positive_return']:.1%}",
                f"{prob_metrics['prob_exceed_target']:.1%}",
                f"{prob_metrics['median_return']:.1%}",
                f"{prob_metrics['mean_return']:.1%}",
                f"{prob_metrics['percentile_5']:.1%}",
                f"{prob_metrics['percentile_95']:.1%}"
            ]
        })
        st.dataframe(metrics_df, hide_index=True)
    
    # Visualize simulation results
    st.markdown("#### Simulated Return Distribution")
    
    cumulative_returns = np.prod(1 + simulated_returns, axis=1) - 1
    
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=cumulative_returns,
        nbinsx=50,
        name='Simulated Returns',
        marker_color='#5A8A6F',
        opacity=0.7
    ))
    
    fig.add_vline(x=0, line_dash="dash", line_color="gray", annotation_text="Break-even")
    fig.add_vline(x=prob_metrics['percentile_5'], line_dash="dash", line_color="red",
                  annotation_text="5th %ile")
    fig.add_vline(x=prob_metrics['percentile_95'], line_dash="dash", line_color="green",
                  annotation_text="95th %ile")
    
    fig.update_layout(
        title=f"Distribution of {n_simulations:,} Simulated Returns",
        xaxis_title="Cumulative Return",
        yaxis_title="Frequency",
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)


def render_stress_testing():
    """Render stress testing section"""
    st.subheader("Stress Testing")
    
    # Generate sample returns
    np.random.seed(42)
    base_returns = pd.Series(np.random.normal(0.001, 0.02, 252))
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Historical Scenarios")
        
        scenarios = {
            'Base Case (Current)': base_returns,
            '2008 Financial Crisis': base_returns * 3 - 0.003,
            'COVID Crash (Mar 2020)': base_returns * 2.5 - 0.005,
            'Biotech Bear Market': np.where(base_returns > 0, base_returns * 0.3, base_returns * 2),
            'Liquidity Crisis': base_returns * 2,
        }
        
        # Calculate metrics for each scenario
        scenario_results = []
        for name, returns in scenarios.items():
            var_calc = ValueAtRisk(confidence_level=0.95)
            metrics = RiskMetrics.calculate_all_metrics(returns)
            
            scenario_results.append({
                'Scenario': name,
                'VaR 95%': f"{var_calc.historical_var(returns):.2%}",
                'Max Drawdown': f"{metrics['max_drawdown']:.2%}",
                'Sharpe Ratio': f"{metrics['sharpe_ratio']:.2f}",
            })
        
        st.dataframe(pd.DataFrame(scenario_results), hide_index=True)
    
    with col2:
        st.markdown("#### Portfolio Impact")
        
        # Calculate portfolio value impact
        portfolio_value = 1000000  # $1M portfolio
        
        impacts = []
        for name, returns in scenarios.items():
            var_calc = ValueAtRisk(confidence_level=0.95)
            var = var_calc.historical_var(returns)
            cvar = var_calc.cvar(returns)
            
            impacts.append({
                'Scenario': name,
                '1-Day VaR': f"${portfolio_value * abs(var):,.0f}",
                'Expected Shortfall': f"${portfolio_value * abs(cvar):,.0f}",
            })
        
        st.dataframe(pd.DataFrame(impacts), hide_index=True)
    
    # Visualize drawdowns
    st.markdown("#### Drawdown Analysis")
    
    fig = go.Figure()
    
    for name, returns in list(scenarios.items())[:3]:  # Show top 3
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        
        fig.add_trace(go.Scatter(
            x=list(range(len(drawdown))),
            y=drawdown * 100,
            mode='lines',
            name=name
        ))
    
    fig.update_layout(
        title="Portfolio Drawdowns Under Stress Scenarios",
        xaxis_title="Trading Days",
        yaxis_title="Drawdown (%)",
        height=400,
        yaxis=dict(tickformat=".1f", ticksuffix="%")
    )
    st.plotly_chart(fig, use_container_width=True)


if __name__ == "__main__":
    # Test the page
    render_advanced_quant_page()
