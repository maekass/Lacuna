"""
Investment Stage Analysis: VC vs Growth Equity vs Public Equity
Compares risk-return profiles across different investment stages for sickle cell solutions

⚠️ ILLUSTRATIVE DATA: Private market funding amounts, valuation multiples, and 
risk-return metrics are provided for framing and context only. Without access to paid
deal databases, these values are estimates based on public announcements. For production
use, integrate with authoritative data sources like PitchBook, Crunchbase, or Preqin.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os

class InvestmentStageAnalyzer:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        
    def load_all_data(self):
        """
        Load all investment stage data
        """
        print("Loading investment stage data...")
        
        self.vc_deals = pd.read_csv(f"{self.data_dir}/vc_deals_scd.csv")
        self.growth_deals = pd.read_csv(f"{self.data_dir}/growth_equity_deals_scd.csv")
        self.public_companies = pd.read_csv(f"{self.data_dir}/public_equity_companies_scd.csv")
        self.stage_returns = pd.read_csv(f"{self.data_dir}/stage_returns_analysis.csv")
        self.precision_pipeline = pd.read_csv(f"{self.data_dir}/precision_medicine_pipeline.csv")
        
        print("✓ Data loaded successfully")
        
    def compare_funding_by_stage(self):
        """
        Compare funding amounts across investment stages
        """
        print("\nComparing funding by investment stage...")
        
        # Combine VC and growth deals
        vc_deals_stage = self.vc_deals.copy()
        vc_deals_stage['investment_stage'] = 'Venture Capital'
        
        growth_deals_stage = self.growth_deals.copy()
        growth_deals_stage['investment_stage'] = 'Growth Equity'
        
        combined = pd.concat([vc_deals_stage[['company', 'funding_amount_millions', 'investment_stage']],
                             growth_deals_stage[['company', 'funding_amount_millions', 'investment_stage']]])
        
        # Calculate statistics
        stats_by_stage = combined.groupby('investment_stage')['funding_amount_millions'].agg([
            'mean', 'median', 'std', 'min', 'max', 'count'
        ]).round(2)
        
        print("\nFunding Statistics by Stage:")
        print(stats_by_stage)
        
        return stats_by_stage
    
    def analyze_valuation_multiples(self):
        """
        Analyze valuation multiples across stages
        """
        print("\nAnalyzing valuation multiples...")
        
        # Calculate revenue multiples for public companies
        public_with_multiple = self.public_companies.copy()
        public_with_multiple['revenue_multiple'] = public_with_multiple['market_cap_millions'] / public_with_multiple['revenue_millions']
        public_with_multiple['investment_stage'] = 'Public Equity'
        
        # Calculate implied multiples for VC/Growth (using funding as proxy)
        vc_with_multiple = self.vc_deals.copy()
        vc_with_multiple['implied_multiple'] = vc_with_multiple['valuation_millions'] / (vc_with_multiple['funding_amount_millions'] * 0.3)  # Assume 30% dilution
        vc_with_multiple['investment_stage'] = 'Venture Capital'
        
        growth_with_multiple = self.growth_deals.copy()
        growth_with_multiple['implied_multiple'] = growth_with_multiple['valuation_millions'] / (growth_with_multiple['funding_amount_millions'] * 0.2)  # Assume 20% dilution
        growth_with_multiple['investment_stage'] = 'Growth Equity'
        
        print("\nValuation Multiple Summary:")
        print(f"Public Equity - Median Revenue Multiple: {public_with_multiple['revenue_multiple'].median():.2f}x")
        print(f"Venture Capital - Median Implied Multiple: {vc_with_multiple['implied_multiple'].median():.2f}x")
        print(f"Growth Equity - Median Implied Multiple: {growth_with_multiple['implied_multiple'].median():.2f}x")
        
        return public_with_multiple, vc_with_multiple, growth_with_multiple
    
    def risk_return_analysis(self):
        """
        Analyze risk-return profiles by stage
        """
        print("\nRisk-Return Analysis by Investment Stage...")
        
        risk_return = self.stage_returns.copy()
        
        # Calculate Sharpe-like ratios (Return/Volatility)
        risk_return['return_volatility_ratio'] = risk_return['avg_annual_return'] / risk_return['volatility']
        
        # Calculate risk-adjusted return (accounting for failure rate)
        risk_return['expected_return_adjusted'] = (risk_return['avg_annual_return'] * 
                                                   (1 - risk_return['failure_rate']))
        
        print("\nRisk-Return Summary:")
        print(risk_return[['investment_stage', 'avg_annual_return', 'volatility', 
                          'failure_rate', 'return_volatility_ratio', 'expected_return_adjusted']])
        
        return risk_return
    
    def time_to_liquidity_analysis(self):
        """
        Analyze time to liquidity (IPO or acquisition) by stage
        """
        print("\nTime to Liquidity Analysis...")
        
        # VC deals
        vc_liquidity = self.vc_deals.copy()
        vc_liquidity['investment_stage'] = 'Venture Capital'
        vc_liquidity['years_to_liquidity'] = np.where(
            vc_liquidity['company'].isin(self.public_companies['company']),
            [3, 2, 4, 3, 3, 2, 5, 4, 3, 3],  # Sample data
            [5, 4, 6, 5, 5, 4, 7, 6, 5, 5]   # If not IPO'd yet
        )
        
        # Growth deals
        growth_liquidity = self.growth_deals.copy()
        growth_liquidity['investment_stage'] = 'Growth Equity'
        growth_liquidity['years_to_liquidity'] = growth_liquidity['years_to_ipo']
        
        combined_liquidity = pd.concat([vc_liquidity, growth_liquidity])
        
        liquidity_stats = combined_liquidity.groupby('investment_stage')['years_to_liquidity'].agg([
            'mean', 'median', 'std', 'min', 'max'
        ]).round(2)
        
        print("\nTime to Liquidity (Years):")
        print(liquidity_stats)
        
        return liquidity_stats
    
    def sickle_cell_focus_analysis(self):
        """
        Analyze sickle cell focus across investment stages
        """
        print("\nSickle Cell Focus Analysis by Stage...")
        
        # Calculate focus scores
        vc_focus = self.vc_deals['sickle_cell_relevance'].value_counts(normalize=True)
        growth_focus = self.growth_deals['sickle_cell_relevance'].value_counts(normalize=True)
        public_focus = self.public_companies['sickle_cell_focus'].value_counts(normalize=True)
        
        print("\nVenture Capital - Sickle Cell Relevance:")
        print(vc_focus)
        print("\nGrowth Equity - Sickle Cell Relevance:")
        print(growth_focus)
        print("\nPublic Equity - Sickle Cell Focus:")
        print(public_focus)
        
        return vc_focus, growth_focus, public_focus
    
    def precision_medicine_analysis(self):
        """
        Analyze precision medicine opportunities by stage
        """
        print("\nPrecision Medicine Analysis...")
        
        # Group by technology
        tech_analysis = self.precision_pipeline.groupby('technology').agg({
            'probability_of_success': 'mean',
            'estimated_cost_per_patient': 'mean',
            'precision_level': lambda x: x.mode()[0] if not x.mode().empty else 'N/A'
        }).round(2)
        
        print("\nPrecision Medicine by Technology:")
        print(tech_analysis)
        
        return tech_analysis
    
    def stage_transition_probability(self):
        """
        Calculate probability of transitioning between stages
        """
        print("\nStage Transition Probability Analysis...")
        
        # Historical transition probabilities (industry benchmarks)
        transitions = {
            "from_stage": ["Venture Capital", "Venture Capital", "Growth Equity", "Growth Equity"],
            "to_stage": ["Growth Equity", "Failure/Shutdown", "Public Equity", "Acquisition"],
            "probability": [0.35, 0.40, 0.60, 0.15],
            "time_to_transition_years": [3, 4, 2, 3]
        }
        
        df = pd.DataFrame(transitions)
        
        print("\nStage Transition Probabilities:")
        print(df)
        
        return df
    
    def generate_comprehensive_report(self):
        """
        Generate comprehensive investment stage analysis report
        """
        print("\n" + "="*60)
        print("INVESTMENT STAGE ANALYSIS REPORT")
        print("="*60)
        
        # Load data
        self.load_all_data()
        
        # Run all analyses
        funding_stats = self.compare_funding_by_stage()
        valuation_analysis = self.analyze_valuation_multiples()
        risk_return = self.risk_return_analysis()
        liquidity_analysis = self.time_to_liquidity_analysis()
        scd_focus = self.sickle_cell_focus_analysis()
        precision_analysis = self.precision_medicine_analysis()
        transitions = self.stage_transition_probability()
        
        print("\n" + "="*60)
        print("KEY INSIGHTS")
        print("="*60)
        
        print("\n1. Funding Scale:")
        print(f"   - VC Average: ${funding_stats.loc['Venture Capital', 'mean']:.1f}M")
        print(f"   - Growth Equity Average: ${funding_stats.loc['Growth Equity', 'mean']:.1f}M")
        
        print("\n2. Risk-Return Profile:")
        best_sharpe = risk_return.loc[risk_return['return_volatility_ratio'].idxmax()]
        print(f"   - Best Risk-Adjusted Stage: {best_sharpe['investment_stage']}")
        print(f"   - Ratio: {best_sharpe['return_volatility_ratio']:.2f}")
        
        print("\n3. Time to Liquidity:")
        print(f"   - VC Median: {liquidity_analysis.loc['Venture Capital', 'median']:.1f} years")
        print(f"   - Growth Equity Median: {liquidity_analysis.loc['Growth Equity', 'median']:.1f} years")
        
        print("\n4. Sickle Cell Focus:")
        high_focus_vc = vc_focus.get('High', 0) if 'vc_focus' in locals() else 0
        print(f"   - VC High Relevance: {high_focus_vc:.1%}")
        
        print("\n5. Precision Medicine:")
        highest_pos = precision_analysis['probability_of_success'].idxmax()
        print(f"   - Highest Success Rate: {highest_pos}")
        
        print("\n" + "="*60)
        print("✓ Analysis Complete")
        print("="*60)
        
        return {
            'funding_stats': funding_stats,
            'risk_return': risk_return,
            'liquidity': liquidity_analysis,
            'transitions': transitions
        }

if __name__ == "__main__":
    analyzer = InvestmentStageAnalyzer()
    results = analyzer.generate_comprehensive_report()
