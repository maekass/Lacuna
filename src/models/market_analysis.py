"""
Market Analysis for Sickle Cell Investment Opportunities
Analyzes market size, TAM, competitive landscape, and large pharma investments (illustrative inputs).
"""

import os

import numpy as np
import pandas as pd


class SickleCellMarketAnalyzer:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

    def collect_market_size_data(self):
        print("Collecting Market Size Data...")

        market_data = {
            "segment": [
                "Global SCD Market",
                "US SCD Market",
                "Gene Therapy TAM",
                "Small Molecule Market",
                "Pain Management",
                "Preventive Treatments",
            ],
            "market_size_2023_billions": [3.2, 1.8, 2.5, 0.8, 0.4, 0.5],
            "market_size_2028_billions": [5.8, 3.2, 4.5, 1.2, 0.6, 0.8],
            "cagr_percent": [12.6, 12.2, 12.5, 8.4, 8.4, 9.9],
            "patient_population_millions": [7.5, 0.1, 0.1, 7.5, 7.5, 7.5],
            "treatment_cost_per_patient_annual": [50000, 150000, 1850000, 30000, 25000, 35000],
        }

        df = pd.DataFrame(market_data)
        df.to_csv(f"{self.data_dir}/market_size_scd.csv", index=False)
        print("✓ Market size data saved")
        return df

    def collect_large_pharma_investments(self):
        print("Collecting Large Pharma Investments...")

        pharma_investments = {
            "company": [
                "Novartis",
                "Pfizer",
                "Bristol Myers Squibb",
                "Gilead Sciences",
                "Sanofi",
                "Roche",
                "Johnson & Johnson",
                "Merck (MSD)",
                "AstraZeneca",
                "Eli Lilly",
            ],
            "ticker": ["NVS", "PFE", "BMY", "GILD", "SNY", "RHHBY", "JNJ", "MRK", "AZN", "LLY"],
            "market_cap_billions": [185, 250, 110, 85, 135, 210, 380, 275, 195, 420],
            "sickle_cell_investment_type": [
                "Direct Drug Development",
                "Partnership/Licensing",
                "Acquisition",
                "Partnership",
                "Clinical Trials",
                "Diagnostic Partnership",
                "R&D Investment",
                "Clinical Trials",
                "Research Collaboration",
                "R&D Investment",
            ],
            "key_asset": [
                "Adakveo (crizanlizumab)",
                "Multiple partnerships",
                "Various acquired drugs",
                "Partnered gene therapy",
                "Multiple candidates",
                "Diagnostics platform",
                "J&J Innovation investments",
                "Clinical pipeline",
                "Research programs",
                "Discovery programs",
            ],
            "investment_stage": [
                "Commercial",
                "Clinical",
                "Commercial",
                "Clinical",
                "Clinical",
                "Preclinical",
                "R&D",
                "Clinical",
                "Preclinical",
                "R&D",
            ],
            "annual_rd_spending_billions": [10.2, 12.5, 9.8, 5.2, 6.8, 14.5, 15.2, 28.5, 9.5, 8.2],
            "sickle_cell_rd_allocation_percent": [2.5, 1.8, 3.2, 1.5, 2.0, 0.8, 1.2, 1.0, 0.5, 0.3],
            "partnerships_count": [5, 8, 12, 4, 6, 3, 7, 2, 3, 1],
            "estimated_scd_revenue_millions": [250, 180, 320, 95, 45, 20, 80, 35, 15, 10],
        }

        df = pd.DataFrame(pharma_investments)
        df.to_csv(f"{self.data_dir}/large_pharma_investments_scd.csv", index=False)
        print(f"✓ Large pharma investments data saved ({len(df)} companies)")
        return df

    def analyze_competitive_landscape(self):
        print("Analyzing Competitive Landscape...")

        competitive_data = {
            "company": [
                "Global Blood Therapeutics",
                "Novartis",
                "Pfizer",
                "Bluebird Bio",
                "CRISPR Therapeutics",
                "Vertex",
                "Editas Medicine",
                "Bristol Myers Squibb",
            ],
            "ticker": ["GBT", "NVS", "PFE", "BLUE", "CRSP", "VRTX", "EDIT", "BMY"],
            "modality": [
                "Small Molecule",
                "Biologic",
                "Small Molecule",
                "Gene Therapy",
                "Gene Therapy",
                "Gene Therapy",
                "Gene Therapy",
                "Multiple",
            ],
            "lead_asset": [
                "Voxelotor",
                "Crizanlizumab",
                "Multiple candidates",
                "LentiGlobin",
                "CTX001",
                "CTX001",
                "EDIT-301",
                "Various acquired drugs",
            ],
            "phase": [
                "Commercial",
                "Commercial",
                "Clinical",
                "Phase 3",
                "Phase 3",
                "Phase 3",
                "Phase 1/2",
                "Commercial",
            ],
            "mechanism": [
                "HbS polymerization inhibitor",
                "P-selectin inhibitor",
                "Multiple mechanisms",
                "Lentiviral gene addition",
                "CRISPR-Cas9 editing",
                "CRISPR-Cas9 editing",
                "CRISPR-Cas9 editing",
                "Multiple mechanisms",
            ],
            "differentiation": [
                "First-in-class oral",
                "First-in-class biologic",
                "Established portfolio",
                "First approved gene therapy",
                "Leading CRISPR platform",
                "Manufacturing scale",
                "Novel target",
                "Broad portfolio",
            ],
            "market_share_estimate_percent": [15, 20, 12, 10, 8, 8, 5, 22],
            "pricing_power": ["High", "High", "Medium", "Very High", "Very High", "Very High", "High", "High"],
            "regulatory_advantage": [
                "Approved",
                "Approved",
                "Strong",
                "Approved",
                "Fast Track",
                "Fast Track",
                "Orphan Drug",
                "Strong",
            ],
        }

        df = pd.DataFrame(competitive_data)
        df.to_csv(f"{self.data_dir}/competitive_landscape_scd.csv", index=False)
        print("✓ Competitive landscape data saved")
        return df

    def analyze_deal_flow(self):
        print("Analyzing Deal Flow...")

        deal_data = {
            "date": [
                "2018-09-01",
                "2019-06-15",
                "2020-03-20",
                "2021-01-10",
                "2021-08-25",
                "2022-04-12",
                "2022-11-30",
                "2023-06-20",
                "2023-12-15",
                "2024-03-01",
            ],
            "type": [
                "Partnership",
                "Acquisition",
                "Licensing",
                "Partnership",
                "Investment",
                "Partnership",
                "Acquisition",
                "Licensing",
                "Partnership",
                "Investment",
            ],
            "buyer": [
                "Pfizer",
                "Bristol Myers Squibb",
                "Novartis",
                "Vertex",
                "Roche",
                "Gilead",
                "Pfizer",
                "Sanofi",
                "Novartis",
                "Johnson & Johnson",
            ],
            "target": [
                "Sickle cell biotech",
                "Global Blood Therapeutics (partial)",
                "Gene therapy company",
                "CRISPR Therapeutics",
                "Gene editing startup",
                "Gene therapy platform",
                "Rare disease company",
                "Biotech startup",
                "Diagnostic company",
                "Gene therapy startup",
            ],
            "deal_value_millions": [450, 2800, 900, 900, 150, 300, 1200, 85, 200, 75],
            "focus": [
                "Drug development",
                "Commercial expansion",
                "Platform acquisition",
                "Co-development",
                "Platform investment",
                "Platform acquisition",
                "Portfolio expansion",
                "Early-stage assets",
                "Diagnostic expansion",
                "Early-stage investment",
            ],
            "strategic_rationale": [
                "Expand rare disease portfolio",
                "Gain commercial presence",
                "Gene therapy capabilities",
                "CRISPR leadership",
                "Early access to platform",
                "Expand gene therapy",
                "Rare disease focus",
                "Pipeline building",
                "Diagnostic integration",
                "Early-stage access",
            ],
        }

        df = pd.DataFrame(deal_data)
        df["date"] = pd.to_datetime(df["date"])
        df.to_csv(f"{self.data_dir}/deal_flow_scd.csv", index=False)
        print(f"✓ Deal flow data saved ({len(df)} deals)")
        return df

    def analyze_regulatory_landscape(self):
        print("Analyzing Regulatory Landscape...")

        regulatory_data = {
            "regulatory_body": ["FDA", "EMA", "PMDA (Japan)", "NMPA (China)", "TGA (Australia)"],
            "sickle_cell_drugs_approved": [4, 2, 1, 1, 1],
            "orphan_drug_designations_granted": [15, 8, 5, 6, 4],
            "fast_track_designations": [12, 5, 3, 4, 2],
            "breakthrough_therapy_designations": [8, 3, 2, 3, 1],
            "priority_review_vouchers_issued": [3, 1, 0, 1, 0],
            "average_approval_time_months": [12, 18, 24, 20, 22],
            "market_exclusivity_years": [7, 10, 8, 6, 5],
            "pricing_reimbursement": ["Mixed", "Generally favorable", "Limited", "Limited", "Limited"],
        }

        df = pd.DataFrame(regulatory_data)
        df.to_csv(f"{self.data_dir}/regulatory_landscape_scd.csv", index=False)
        print("✓ Regulatory landscape data saved")
        return df

    def calculate_investment_attractiveness(self):
        print("Calculating Investment Attractiveness Scores...")

        attractiveness_data = {
            "company": [
                "CRISPR Therapeutics",
                "Vertex Pharmaceuticals",
                "Bluebird Bio",
                "Global Blood Therapeutics",
                "Editas Medicine",
                "Novartis",
                "Pfizer",
                "Bristol Myers Squibb",
            ],
            "ticker": ["CRSP", "VRTX", "BLUE", "GBT", "EDIT", "NVS", "PFE", "BMY"],
            "technology_score": [9, 9, 7, 6, 8, 5, 4, 5],
            "clinical_stage_score": [9, 9, 8, 7, 5, 9, 6, 9],
            "market_position_score": [7, 8, 6, 7, 5, 9, 8, 9],
            "financial_strength_score": [7, 9, 4, 5, 6, 9, 9, 9],
            "partnership_score": [8, 9, 6, 5, 5, 8, 9, 9],
            "regulatory_advantage_score": [8, 8, 7, 7, 6, 8, 7, 8],
            "overall_score": [0.0] * 8,
            "investment_recommendation": [""] * 8,
        }

        df = pd.DataFrame(attractiveness_data)

        weights = {
            "technology_score": 0.25,
            "clinical_stage_score": 0.25,
            "market_position_score": 0.15,
            "financial_strength_score": 0.15,
            "partnership_score": 0.10,
            "regulatory_advantage_score": 0.10,
        }

        for idx, row in df.iterrows():
            overall = (
                row["technology_score"] * weights["technology_score"]
                + row["clinical_stage_score"] * weights["clinical_stage_score"]
                + row["market_position_score"] * weights["market_position_score"]
                + row["financial_strength_score"] * weights["financial_strength_score"]
                + row["partnership_score"] * weights["partnership_score"]
                + row["regulatory_advantage_score"] * weights["regulatory_advantage_score"]
            )
            df.at[idx, "overall_score"] = round(overall, 2)

            if overall >= 8.0:
                df.at[idx, "investment_recommendation"] = "Strong Buy"
            elif overall >= 7.0:
                df.at[idx, "investment_recommendation"] = "Buy"
            elif overall >= 6.0:
                df.at[idx, "investment_recommendation"] = "Hold"
            else:
                df.at[idx, "investment_recommendation"] = "Sell/Underweight"

        df = df.sort_values("overall_score", ascending=False)
        df.to_csv(f"{self.data_dir}/investment_attractiveness_scd.csv", index=False)
        print("✓ Investment attractiveness scores saved")
        return df

    def generate_market_report(self):
        print("\n" + "=" * 60)
        print("SICKLE CELL MARKET ANALYSIS REPORT")
        print("=" * 60)

        market_size = self.collect_market_size_data()
        pharma_investments = self.collect_large_pharma_investments()
        competitive = self.analyze_competitive_landscape()
        deal_flow = self.analyze_deal_flow()
        regulatory = self.analyze_regulatory_landscape()
        attractiveness = self.calculate_investment_attractiveness()

        print("\n" + "=" * 60)
        print("KEY MARKET INSIGHTS")
        print("=" * 60)

        print("\n1. Market Size:")
        print(f"   Global SCD Market (2023): ${market_size.loc[0, 'market_size_2023_billions']:.1f}B")
        print(f"   Projected 2028: ${market_size.loc[0, 'market_size_2028_billions']:.1f}B")
        print(f"   CAGR: {market_size.loc[0, 'cagr_percent']:.1f}%")

        print("\n2. Gene Therapy Opportunity:")
        print(f"   TAM (2028): ${market_size.loc[2, 'market_size_2028_billions']:.1f}B")
        print(f"   Treatment cost: ${market_size.loc[2, 'treatment_cost_per_patient_annual']:,.0f}/patient")

        print("\n3. Large Pharma Leaders:")
        top_investors = pharma_investments.nlargest(3, "estimated_scd_revenue_millions")
        for _, row in top_investors.iterrows():
            print(
                f"   {row['company']}: ${row['estimated_scd_revenue_millions']}M revenue, "
                f"{row['sickle_cell_rd_allocation_percent']}% R&D allocation"
            )

        print("\n4. Deal Activity:")
        total_deal_value = deal_flow["deal_value_millions"].sum()
        print(f"   Total deal value (2018-2024): ${total_deal_value:.0f}M")
        print(f"   Average deal size: ${deal_flow['deal_value_millions'].mean():.0f}M")

        print("\n5. Top Investment Opportunities:")
        top_3 = attractiveness.head(3)
        for _, row in top_3.iterrows():
            print(
                f"   {row['company']} ({row['ticker']}): Score {row['overall_score']}/10 - "
                f"{row['investment_recommendation']}"
            )

        print("\n" + "=" * 60)
        print("✓ Market Analysis Complete")
        print("=" * 60)

        return {
            "market_size": market_size,
            "pharma_investments": pharma_investments,
            "competitive": competitive,
            "deal_flow": deal_flow,
            "regulatory": regulatory,
            "attractiveness": attractiveness,
        }


if __name__ == "__main__":
    analyzer = SickleCellMarketAnalyzer()
    analyzer.generate_market_report()
