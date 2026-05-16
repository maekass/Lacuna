"""
VC and Growth Equity Data Collector for Sickle Cell Investments
Collects data on private market investments in sickle cell solutions (illustrative tables).
"""

import os

import pandas as pd


class VCGrowthEquityCollector:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

    def collect_vc_deals(self):
        print("Collecting Venture Capital Deals...")

        vc_deals = {
            "company": [
                "Editas Medicine",
                "Beam Therapeutics",
                "Mammoth Biosciences",
                "Intellia Therapeutics",
                "Caribou Biosciences",
                "Graphite Bio",
                "Metagenomi",
                "Synthego",
                "Epic Bio",
                "LocanaBio",
            ],
            "stage": [
                "Series B",
                "Series C",
                "Series B",
                "Series A",
                "Series B",
                "Series B",
                "Series A",
                "Series B",
                "Series A",
                "Series A",
            ],
            "focus": [
                "CRISPR gene editing",
                "Base editing",
                "CRISPR diagnostics",
                "CRISPR therapeutics",
                "CRISPR gene editing",
                "Gene correction",
                "CRISPR discovery",
                "CRISPR tools",
                "Gene regulation",
                "RNA editing",
            ],
            "sickle_cell_relevance": [
                "High",
                "Medium",
                "Low",
                "High",
                "Medium",
                "High",
                "Low",
                "Medium",
                "Low",
                "Low",
            ],
            "funding_amount_millions": [120, 180, 95, 55, 85, 70, 40, 65, 30, 25],
            "valuation_millions": [1200, 3500, 800, 450, 650, 500, 300, 400, 200, 150],
            "clinical_stage": [
                "Phase 1/2",
                "Phase 1",
                "Preclinical",
                "Phase 1",
                "Preclinical",
                "Phase 1",
                "Preclinical",
                "Preclinical",
                "Preclinical",
                "Preclinical",
            ],
            "years_to_ipo": [3, 2, 4, 5, 4, 3, 6, 4, 5, 6],
        }

        df = pd.DataFrame(vc_deals)
        df.to_csv(f"{self.data_dir}/vc_deals_scd.csv", index=False)
        print(f"✓ VC deals data saved ({len(df)} deals)")
        return df

    def collect_growth_equity_deals(self):
        print("Collecting Growth Equity Deals...")

        growth_deals = {
            "company": [
                "Bluebird Bio",
                "CRISPR Therapeutics",
                "Global Blood Therapeutics",
                "Editas Medicine",
                "Intellia Therapeutics",
                "Sangamo Therapeutics",
                "Vertex Pharmaceuticals",
                "Beam Therapeutics",
                "Graphite Bio",
                "Mammoth Biosciences",
            ],
            "stage": [
                "Series C",
                "Series D",
                "Series C",
                "Series C",
                "Series C",
                "Series D",
                "Series D",
                "Series C",
                "Series C",
                "Series B",
            ],
            "focus": [
                "Lentiviral gene therapy",
                "CRISPR gene editing",
                "Small molecule SCD treatment",
                "CRISPR gene editing",
                "CRISPR therapeutics",
                "Zinc finger nucleases",
                "CRISPR gene editing",
                "Base editing",
                "Gene correction",
                "CRISPR diagnostics",
            ],
            "sickle_cell_relevance": [
                "High",
                "High",
                "High",
                "High",
                "High",
                "Medium",
                "High",
                "Medium",
                "High",
                "Low",
            ],
            "funding_amount_millions": [250, 300, 200, 150, 175, 120, 400, 180, 160, 95],
            "valuation_millions": [2800, 4500, 1500, 1200, 1800, 800, 8500, 2000, 800, 900],
            "clinical_stage": [
                "Phase 3",
                "Phase 3",
                "Phase 3",
                "Phase 1/2",
                "Phase 1",
                "Phase 2",
                "Phase 3",
                "Phase 1",
                "Phase 1",
                "Preclinical",
            ],
            "years_to_ipo": [2, 1, 1, 3, 2, 4, 0, 3, 3, 4],
        }

        df = pd.DataFrame(growth_deals)
        df.to_csv(f"{self.data_dir}/growth_equity_deals_scd.csv", index=False)
        print(f"✓ Growth equity deals data saved ({len(df)} deals)")
        return df

    def collect_public_equity_companies(self):
        print("Collecting Public Equity Companies Data...")

        public_companies = {
            "ticker": ["CRSP", "VRTX", "EMMS", "EDIT", "SGMO", "NTLA", "BEAM", "GILD", "PFE", "BMY", "JNJ", "MRK"],
            "company": [
                "CRISPR Therapeutics",
                "Vertex Pharmaceuticals",
                "Emmaus Life Sciences",
                "Editas Medicine",
                "Sangamo Therapeutics",
                "Intellia Therapeutics",
                "Beam Therapeutics",
                "Gilead Sciences",
                "Pfizer",
                "Bristol Myers Squibb",
                "Johnson & Johnson",
                "Merck (MSD)",
            ],
            "market_cap_millions": [5500, 85000, 120, 600, 350, 2500, 1800, 85000, 250000, 110000, 380000, 275000],
            "sickle_cell_focus": [
                "High",
                "High",
                "High",
                "Medium",
                "Medium",
                "Medium",
                "Medium",
                "Low",
                "Medium",
                "Medium",
                "Low",
                "Low",
            ],
            "primary_product": [
                "CTX001 (gene therapy)",
                "CTX001 (partnered)",
                "LentiGlobin",
                "EDIT-301",
                "ZFN therapies",
                "NTLA-2001",
                "BEAM-101",
                "Partnered gene therapy",
                "Multiple partnerships",
                "Various acquired drugs",
                "J&J Innovation",
                "Clinical pipeline",
            ],
            "clinical_stage_scd": [
                "Phase 3",
                "Phase 3",
                "Phase 3",
                "Phase 1/2",
                "Phase 2",
                "Phase 1",
                "Phase 1",
                "Clinical",
                "Clinical",
                "Commercial",
                "R&D",
                "Clinical",
            ],
            "volatility_1y": [0.65, 0.28, 0.85, 0.72, 0.58, 0.68, 0.75, 0.32, 0.25, 0.30, 0.20, 0.28],
        }

        df = pd.DataFrame(public_companies)
        df.to_csv(f"{self.data_dir}/public_equity_companies_scd.csv", index=False)
        print(f"✓ Public equity companies data saved ({len(df)} companies)")
        return df

    def calculate_stage_returns(self):
        print("Calculating Stage-Based Return Analysis...")

        stage_returns = {
            "investment_stage": [
                "Venture Capital (Early)",
                "Venture Capital (Late)",
                "Growth Equity (Series B/C)",
                "Growth Equity (Pre-IPO)",
                "Public Equity (IPO)",
                "Public Equity (Mature)",
            ],
            "avg_annual_return": [0.35, 0.28, 0.22, 0.18, 0.15, 0.12],
            "volatility": [0.85, 0.65, 0.45, 0.35, 0.50, 0.25],
            "failure_rate": [0.60, 0.40, 0.25, 0.15, 0.10, 0.02],
            "time_horizon_years": [7, 5, 4, 2, 3, 1],
            "liquidity": ["Low", "Low", "Medium", "Medium", "High", "High"],
            "min_investment_millions": [1, 5, 10, 25, 0.1, 0.1],
        }

        df = pd.DataFrame(stage_returns)
        df.to_csv(f"{self.data_dir}/stage_returns_analysis.csv", index=False)
        print("✓ Stage returns analysis saved")
        return df

    def collect_precision_medicine_pipeline(self):
        print("Collecting Precision Medicine Pipeline Data...")

        precision_data = {
            "company": [
                "CRISPR Therapeutics",
                "Vertex",
                "Bluebird Bio",
                "Editas Medicine",
                "Graphite Bio",
                "Intellia",
                "Beam Therapeutics",
                "Mammoth Biosciences",
            ],
            "technology": [
                "CRISPR-Cas9",
                "CRISPR-Cas9",
                "Lentiviral",
                "CRISPR-Cas9",
                "Gene correction",
                "CRISPR-Cas9",
                "Base Editing",
                "CRISPR-Cas12",
            ],
            "target_mechanism": [
                "BCL11A disruption",
                "BCL11A disruption",
                "Beta-globin addition",
                "BCL11A disruption",
                "Gene correction",
                "BCL11A disruption",
                "Base editing",
                "CRISPR diagnostics",
            ],
            "precision_level": ["High", "High", "Medium", "High", "Very High", "High", "High", "High"],
            "phase": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Phase 1", "Phase 1", "Preclinical"],
            "estimated_cost_per_patient": [1850000, 1850000, 2100000, 1950000, 2500000, 1750000, 1200000, 500],
            "probability_of_success": [0.80, 0.80, 0.75, 0.45, 0.35, 0.40, 0.50, 0.60],
        }

        df = pd.DataFrame(precision_data)
        df.to_csv(f"{self.data_dir}/precision_medicine_pipeline.csv", index=False)
        print(f"✓ Precision medicine pipeline data saved ({len(df)} companies)")
        return df

    def collect_all_vc_growth_data(self):
        print("\n=== Collecting VC & Growth Equity Investment Data ===\n")
        self.collect_vc_deals()
        self.collect_growth_equity_deals()
        self.collect_public_equity_companies()
        self.calculate_stage_returns()
        self.collect_precision_medicine_pipeline()
        print("\n✓ All VC & Growth Equity data collection complete!")


if __name__ == "__main__":
    collector = VCGrowthEquityCollector()
    collector.collect_all_vc_growth_data()
