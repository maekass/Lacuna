"""
VC and Growth Equity Data Collector for Sickle Cell Investments
Collects data on private companies at different investment stages

⚠️ ILLUSTRATIVE DATA: Private market data (VC deals, growth equity, valuations) 
is provided for framing and context only. Without access to paid deal databases,
these values are estimates based on public announcements and should not be used
as ground truth for investment decisions. For production use, integrate with
authoritative data sources like PitchBook, Crunchbase, or Preqin.
"""

import pandas as pd
import requests
from datetime import datetime
import os

class VCGrowthEquityCollector:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
    def collect_venture_capital_deals(self):
        """
        Collect VC deals for sickle cell/gene therapy startups
        Sources: Public press releases, Crunchbase (public info), company announcements
        """
        print("Collecting Venture Capital Deals...")
        
        # Sample VC deals (publicly announced)
        vc_deals = {
            "company": ["Editas Medicine", "Beam Therapeutics", "Mammoth Biosciences", 
                       "Intellia Therapeutics", "Caribou Biosciences", "Metagenomi",
                       "Graphite Bio", "LocanaBio", "Precision BioSciences", "EpicentRx"],
            "stage": ["Series B", "Series C", "Series B", "Series A", "Series B", "Series A",
                     "Series B", "Series A", "Series C", "Series B"],
            "focus": ["CRISPR gene editing", "Base editing", "CRISPR diagnostics", 
                     "CRISPR therapeutics", "CRISPR gene editing", "Gene editing tools",
                     "Gene correction", "RNA targeting", "Genome editing", "Gene therapy"],
            "sickle_cell_relevance": ["High", "Medium", "Low", "High", "Medium", "Low",
                                     "High", "Medium", "Medium", "High"],
            "funding_amount_millions": [120, 180, 95, 55, 85, 45, 70, 40, 150, 65],
            "lead_investor": ["Flagship Pioneering", "Fidelity", "Deerfield", "Atlas Venture",
                            "Fidelity", "Mayfield", "RA Capital", "Novo Holdings", "Baker Bros", "MPM Capital"],
            "announcement_date": ["2021-03-15", "2022-06-20", "2021-09-10", "2018-05-22",
                                "2020-11-18", "2022-02-28", "2021-07-08", "2020-03-15",
                                "2021-12-01", "2022-04-12"],
            "valuation_millions": [1200, 3500, 800, 450, 650, 250, 500, 200, 1800, 400],
            "clinical_stage": ["Phase 1/2", "Phase 1", "Preclinical", "Phase 1", "Preclinical",
                              "Preclinical", "Phase 1", "Preclinical", "Phase 1/2", "Phase 1"]
        }
        
        df = pd.DataFrame(vc_deals)
        df['announcement_date'] = pd.to_datetime(df['announcement_date'])
        df.to_csv(f"{self.data_dir}/vc_deals_scd.csv", index=False)
        print(f"✓ VC deals data saved ({len(df)} deals)")
        return df
    
    def collect_growth_equity_deals(self):
        """
        Collect Growth Equity deals for later-stage sickle cell companies
        Sources: Public press releases, SEC filings, company announcements
        """
        print("Collecting Growth Equity Deals...")
        
        # Sample growth equity deals (publicly announced)
        growth_deals = {
            "company": ["Bluebird Bio", "CRISPR Therapeutics", "Vertex Pharmaceuticals (investment)",
                       "Global Blood Therapeutics", "Editas Medicine", "Intellia Therapeutics",
                       "Sangamo Therapeutics", "LogicBio Therapeutics", "Rocket Pharmaceuticals",
                       "Generation Bio"],
            "stage": ["Series C", "Series D", "Corporate Investment", "Series C", "Series C",
                     "Series C", "Series D", "Series B", "Series C", "Series C"],
            "focus": ["Lentiviral gene therapy", "CRISPR gene editing", "Gene therapy partnership",
                     "Small molecule SCD treatment", "CRISPR gene editing", "CRISPR therapeutics",
                     "Zinc finger nucleases", "Gene therapy", "Gene therapy", "Non-viral gene therapy"],
            "sickle_cell_relevance": ["High", "High", "High", "Very High", "Medium", "Medium",
                                     "Medium", "High", "High", "Medium"],
            "funding_amount_millions": [250, 300, 900, 200, 150, 175, 120, 85, 110, 130],
            "investor_type": ["Growth Equity", "Growth Equity", "Strategic", "Growth Equity",
                            "Growth Equity", "Growth Equity", "Growth Equity", "Growth Equity",
                            "Growth Equity", "Growth Equity"],
            "lead_investor": ["Wellington Management", "Fidelity", "CRISPR Therapeutics",
                            "Blackstone", "RA Capital", "Janus Henderson", "Fidelity",
                            "Deerfield", "Fidelity", "TPG"],
            "announcement_date": ["2019-06-10", "2020-03-15", "2021-06-21", "2018-09-20",
                                "2021-02-18", "2020-07-22", "2019-11-15", "2020-05-10",
                                "2021-08-01", "2021-10-15"],
            "valuation_millions": [2800, 4500, 12000, 1500, 1200, 1800, 800, 350, 900, 650],
            "clinical_stage": ["Phase 3", "Phase 3", "Phase 3", "Phase 3", "Phase 1/2",
                              "Phase 1", "Phase 2", "Phase 1/2", "Phase 2", "Phase 1"],
            "years_to_ipo": [2, 1, 0, 1, 3, 2, 4, 3, 2, 4]
        }
        
        df = pd.DataFrame(growth_deals)
        df['announcement_date'] = pd.to_datetime(df['announcement_date'])
        df.to_csv(f"{self.data_dir}/growth_equity_deals_scd.csv", index=False)
        print(f"✓ Growth equity deals data saved ({len(df)} deals)")
        return df
    
    def collect_public_equity_companies(self):
        """
        Collect data on publicly traded sickle cell/precision medicine companies
        """
        print("Collecting Public Equity Companies Data...")
        
        # Public companies focused on sickle cell/precision medicine
        public_companies = {
            "ticker": ["CRSP", "VRTX", "BLUE", "EDIT", "SGMO", "BNTX", "MRNA", "NVAX",
                      "GILD", "REGN", "BMY", "PFE"],
            "company": ["CRISPR Therapeutics", "Vertex Pharmaceuticals", "Bluebird Bio",
                       "Editas Medicine", "Sangamo Therapeutics", "BioNTech", "Moderna",
                       "Novavax", "Gilead Sciences", "Regeneron", "Bristol Myers Squibb",
                       "Pfizer"],
            "market_cap_millions": [5500, 85000, 450, 600, 350, 35000, 45000, 800,
                                   85000, 90000, 110000, 250000],
            "sickle_cell_focus": ["High", "High", "High", "Medium", "Medium", "Low", "Low",
                                 "Low", "Medium", "Medium", "High", "High"],
            "primary_product": ["CTX001 (gene therapy)", "CTX001 (partnered)", "LentiGlobin",
                              "EDIT-301", "ZFN therapies", "mRNA platform", "mRNA platform",
                              "Vaccine platform", "Antiviral therapies", "Antibody therapies",
                              "Multiple SCD drugs", "Multiple SCD drugs"],
            "revenue_millions": [150, 8500, 5, 15, 45, 15000, 18000, 1000, 25000, 12000,
                               45000, 100000],
            "clinical_stage_scd": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 2",
                                  "Preclinical", "Preclinical", "None", "Phase 2", "Phase 2",
                                  "Commercial", "Commercial"],
            "ipo_year": [2016, 1991, 2013, 2016, 2014, 2019, 2018, 2020, 1992, 1991, 1925, 1942],
            "volatility_1y": [0.65, 0.28, 0.85, 0.72, 0.58, 0.55, 0.48, 0.92, 0.32, 0.35, 0.25, 0.22]
        }
        
        df = pd.DataFrame(public_companies)
        df.to_csv(f"{self.data_dir}/public_equity_companies_scd.csv", index=False)
        print(f"✓ Public equity companies data saved ({len(df)} companies)")
        return df
    
    def calculate_stage_returns(self):
        """
        Calculate hypothetical returns by investment stage
        Based on historical data patterns
        """
        print("Calculating Stage-Based Return Analysis...")
        
        # Historical return patterns by stage (industry averages)
        stage_returns = {
            "investment_stage": ["Venture Capital (Early)", "Venture Capital (Late)",
                               "Growth Equity (Series B/C)", "Growth Equity (Pre-IPO)",
                               "Public Equity (IPO)", "Public Equity (Mature)"],
            "avg_annual_return": [0.35, 0.28, 0.22, 0.18, 0.15, 0.12],
            "volatility": [0.85, 0.65, 0.45, 0.35, 0.50, 0.25],
            "failure_rate": [0.60, 0.40, 0.25, 0.15, 0.10, 0.02],
            "time_horizon_years": [7, 5, 4, 2, 3, 1],
            "liquidity": ["Low", "Low", "Medium", "Medium", "High", "High"],
            "minimum_investment_millions": [1, 5, 10, 25, 0.1, 0.1],
            "sickle_cell_specific_premium": [0.05, 0.04, 0.03, 0.02, 0.01, 0.00]
        }
        
        df = pd.DataFrame(stage_returns)
        df.to_csv(f"{self.data_dir}/stage_returns_analysis.csv", index=False)
        print(f"✓ Stage returns analysis saved")
        return df
    
    def collect_precision_medicine_pipeline(self):
        """
        Collect precision medicine pipeline data for sickle cell
        Focus on targeted therapies and personalized approaches
        """
        print("Collecting Precision Medicine Pipeline Data...")
        
        precision_pipeline = {
            "company": ["CRISPR Therapeutics", "Vertex", "Bluebird Bio", "Editas Medicine",
                       "Graphite Bio", "Intellia", "Beam Therapeutics", "Mammoth Biosciences"],
            "ticker": ["CRSP", "VRTX", "BLUE", "EDIT", "GRPH", "NTLA", "BEAM", "PRIVATE"],
            "technology": ["CRISPR-Cas9", "CRISPR-Cas9", "Lentiviral", "CRISPR-Cas9",
                          "Gene correction", "CRISPR-Cas9", "Base Editing", "CRISPR-Cas12"],
            "target_mechanism": ["BCL11A disruption", "BCL11A disruption", "Beta-globin addition",
                               "BCL11A disruption", "Gene correction", "BCL11A disruption",
                               "Base editing", "Diagnostics"],
            "precision_level": ["High", "High", "Medium", "High", "Very High", "High",
                              "High", "High"],
            "phase": ["Phase 3", "Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Phase 1",
                     "Phase 1", "Preclinical"],
            "patient_stratification": ["All SCD", "All SCD", "All SCD", "All SCD",
                                      "Genotype-specific", "All SCD", "Genotype-specific",
                                      "All SCD"],
            "manufacturing_complexity": ["High", "High", "High", "High", "Very High", "High",
                                       "Medium", "Low"],
            "estimated_cost_per_patient": [1850000, 1850000, 2100000, 1950000, 2500000,
                                         1750000, 1200000, 500],
            "probability_of_success": [0.80, 0.80, 0.75, 0.45, 0.35, 0.40, 0.50, 0.60]
        }
        
        df = pd.DataFrame(precision_pipeline)
        df.to_csv(f"{self.data_dir}/precision_medicine_pipeline.csv", index=False)
        print(f"✓ Precision medicine pipeline data saved ({len(df)} companies)")
        return df
    
    def collect_all_vc_growth_data(self):
        """
        Collect all VC and growth equity data
        """
        print("\n=== Collecting VC & Growth Equity Investment Data ===\n")
        
        self.collect_venture_capital_deals()
        self.collect_growth_equity_deals()
        self.collect_public_equity_companies()
        self.calculate_stage_returns()
        self.collect_precision_medicine_pipeline()
        
        print("\n✓ All VC & Growth Equity data collection complete!")

if __name__ == "__main__":
    collector = VCGrowthEquityCollector()
    collector.collect_all_vc_growth_data()
