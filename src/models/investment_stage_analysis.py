"""
Investment Stage Analysis for Sickle Cell Solutions
Compares VC, Growth Equity, and Public Equity investment opportunities (illustrative data).
"""

import numpy as np
import pandas as pd


class InvestmentStageAnalyzer:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir

    def load_stage_data(self):
        print("Loading investment stage data...")

        vc_deals = pd.read_csv(f"{self.data_dir}/vc_deals_scd.csv")
        growth_deals = pd.read_csv(f"{self.data_dir}/growth_equity_deals_scd.csv")
        public_companies = pd.read_csv(f"{self.data_dir}/public_equity_companies_scd.csv")
        stage_returns = pd.read_csv(f"{self.data_dir}/stage_returns_analysis.csv")
        precision_medicine = pd.read_csv(f"{self.data_dir}/precision_medicine_pipeline.csv")

        print("✓ Data loaded successfully")
        return {
            "vc_deals": vc_deals,
            "growth_deals": growth_deals,
            "public_companies": public_companies,
            "stage_returns": stage_returns,
            "precision_medicine": precision_medicine,
        }

    def compare_funding_by_stage(self, vc_deals, growth_deals):
        print("\nComparing funding by investment stage...")

        vc_avg = vc_deals["funding_amount_millions"].mean()
        growth_avg = growth_deals["funding_amount_millions"].mean()

        funding_stats = pd.DataFrame(
            {
                "investment_stage": ["Venture Capital", "Growth Equity"],
                "mean": [vc_avg, growth_avg],
                "median": [
                    vc_deals["funding_amount_millions"].median(),
                    growth_deals["funding_amount_millions"].median(),
                ],
                "std": [
                    vc_deals["funding_amount_millions"].std(),
                    growth_deals["funding_amount_millions"].std(),
                ],
                "min": [
                    vc_deals["funding_amount_millions"].min(),
                    growth_deals["funding_amount_millions"].min(),
                ],
                "max": [
                    vc_deals["funding_amount_millions"].max(),
                    growth_deals["funding_amount_millions"].max(),
                ],
                "count": [len(vc_deals), len(growth_deals)],
            }
        )

        funding_stats = funding_stats.set_index("investment_stage")
        print("\nFunding Statistics by Stage:")
        print(funding_stats.round(2))

        return funding_stats

    def analyze_valuation_multiples(self, vc_deals, growth_deals, public_companies):
        print("\nAnalyzing valuation multiples...")

        growth_multiples = growth_deals["valuation_millions"] / growth_deals["funding_amount_millions"]
        vc_multiples = vc_deals["valuation_millions"] / vc_deals["funding_amount_millions"]

        public_revenue = public_companies["market_cap_millions"] / np.array(
            [100, 200, 150, 50, 80, 120, 90, 60, 40, 70, 55, 45]
        )

        print("\nValuation Multiple Summary:")
        print(f"Public Equity - Median Revenue Multiple: {public_revenue.median():.2f}x")
        print(f"Venture Capital - Median Implied Multiple: {vc_multiples.median():.2f}x")
        print(f"Growth Equity - Median Implied Multiple: {growth_multiples.median():.2f}x")

        return {
            "public_multiple": public_revenue.median(),
            "vc_multiple": vc_multiples.median(),
            "growth_multiple": growth_multiples.median(),
        }

    def analyze_risk_return(self, stage_returns):
        print("\nRisk-Return Analysis by Investment Stage...")

        stage_returns = stage_returns.copy()
        stage_returns["return_volatility_ratio"] = stage_returns["avg_annual_return"] / stage_returns["volatility"]
        stage_returns["expected_return_adjusted"] = stage_returns["avg_annual_return"] * (
            1 - stage_returns["failure_rate"]
        )

        print("\nRisk-Return Summary:")
        print(
            stage_returns[
                [
                    "investment_stage",
                    "avg_annual_return",
                    "volatility",
                    "failure_rate",
                    "return_volatility_ratio",
                    "expected_return_adjusted",
                ]
            ].round(4)
        )

        return stage_returns

    def analyze_time_to_liquidity(self, vc_deals, growth_deals):
        print("\nTime to Liquidity Analysis...")

        vc_time = vc_deals["years_to_ipo"].mean()
        growth_time = growth_deals["years_to_ipo"].mean()

        time_stats = pd.DataFrame(
            {
                "investment_stage": ["Venture Capital", "Growth Equity"],
                "mean": [vc_time, growth_time],
                "median": [
                    vc_deals["years_to_ipo"].median(),
                    growth_deals["years_to_ipo"].median(),
                ],
                "std": [
                    vc_deals["years_to_ipo"].std(),
                    growth_deals["years_to_ipo"].std(),
                ],
                "min": [
                    vc_deals["years_to_ipo"].min(),
                    growth_deals["years_to_ipo"].min(),
                ],
                "max": [
                    vc_deals["years_to_ipo"].max(),
                    growth_deals["years_to_ipo"].max(),
                ],
            }
        )

        time_stats = time_stats.set_index("investment_stage")
        print("\nTime to Liquidity (Years):")
        print(time_stats.round(2))

        return time_stats

    def analyze_sickle_cell_focus(self, vc_deals, growth_deals, public_companies):
        print("\nSickle Cell Focus Analysis by Stage...")

        vc_scd = vc_deals["sickle_cell_relevance"].value_counts(normalize=True)
        print("\nVenture Capital - Sickle Cell Relevance:")
        print(vc_scd)

        growth_scd = growth_deals["sickle_cell_relevance"].value_counts(normalize=True)
        print("\nGrowth Equity - Sickle Cell Relevance:")
        print(growth_scd)

        public_scd = public_companies["sickle_cell_focus"].value_counts(normalize=True)
        print("\nPublic Equity - Sickle Cell Focus:")
        print(public_scd)

        return {"vc_scd": vc_scd, "growth_scd": growth_scd, "public_scd": public_scd}

    def analyze_precision_medicine(self, precision_medicine):
        print("\nPrecision Medicine Analysis...")

        precision_summary = precision_medicine.groupby("technology").agg(
            {
                "probability_of_success": "mean",
                "estimated_cost_per_patient": "mean",
                "precision_level": lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[0],
            }
        ).round(2)

        print("\nPrecision Medicine by Technology:")
        print(precision_summary)

        return precision_summary

    def analyze_stage_transitions(self):
        print("\nStage Transition Probability Analysis...")

        transition_data = {
            "from_stage": ["Venture Capital", "Venture Capital", "Growth Equity", "Growth Equity"],
            "to_stage": ["Growth Equity", "Failure/Shutdown", "Public Equity", "Acquisition"],
            "probability": [0.35, 0.40, 0.60, 0.15],
            "time_to_transition_years": [3, 4, 2, 3],
        }

        transition_df = pd.DataFrame(transition_data)

        print("\nStage Transition Probabilities:")
        print(transition_df)

        return transition_df

    def generate_report(self):
        print("\n" + "=" * 60)
        print("INVESTMENT STAGE ANALYSIS REPORT")
        print("=" * 60)

        data = self.load_stage_data()

        funding_stats = self.compare_funding_by_stage(data["vc_deals"], data["growth_deals"])
        self.analyze_valuation_multiples(data["vc_deals"], data["growth_deals"], data["public_companies"])
        risk_return = self.analyze_risk_return(data["stage_returns"])
        time_liquidity = self.analyze_time_to_liquidity(data["vc_deals"], data["growth_deals"])
        scd_focus = self.analyze_sickle_cell_focus(data["vc_deals"], data["growth_deals"], data["public_companies"])
        precision = self.analyze_precision_medicine(data["precision_medicine"])
        self.analyze_stage_transitions()

        print("\n" + "=" * 60)
        print("KEY INSIGHTS")
        print("=" * 60)

        print("\n1. Funding Scale:")
        print(f"   - VC Average: ${funding_stats.loc['Venture Capital', 'mean']:.1f}M")
        print(f"   - Growth Equity Average: ${funding_stats.loc['Growth Equity', 'mean']:.1f}M")

        print("\n2. Risk-Return Profile:")
        best_stage = risk_return.loc[risk_return["return_volatility_ratio"].idxmax(), "investment_stage"]
        best_ratio = risk_return["return_volatility_ratio"].max()
        print(f"   - Best Risk-Adjusted Stage: {best_stage}")
        print(f"   - Ratio: {best_ratio:.2f}")

        print("\n3. Time to Liquidity:")
        print(f"   - VC Median: {time_liquidity.loc['Venture Capital', 'median']:.1f} years")
        print(f"   - Growth Equity Median: {time_liquidity.loc['Growth Equity', 'median']:.1f} years")

        print("\n4. Sickle Cell Focus:")
        vc_high = scd_focus["vc_scd"].get("High", 0) * 100
        print(f"   - VC High Relevance: {vc_high:.0f}%")

        print("\n5. Precision Medicine:")
        best_tech = precision["probability_of_success"].idxmax()
        print(f"   - Highest Success Rate: {best_tech}")

        print("\n" + "=" * 60)
        print("✓ Analysis Complete")
        print("=" * 60)


if __name__ == "__main__":
    InvestmentStageAnalyzer().generate_report()
