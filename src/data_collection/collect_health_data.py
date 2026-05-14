"""
Sickle Cell Disease Public Health Data Collector
Fetches publicly available data on sickle cell disease epidemiology, treatments, and research
All data sources are public and legally accessible
"""

import os

import numpy as np
import pandas as pd
import requests


class SickleCellHealthDataCollector:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

    def collect_cdc_sickle_cell_data(self):
        """
        Collect CDC sickle cell data from public APIs
        Note: In production, you would use actual CDC API endpoints
        """
        print("Collecting CDC Sickle Cell Data...")

        # Simulated data structure - replace with actual CDC API calls
        # Real source: https://www.cdc.gov/ncbddd/sicklecell/data.html
        dates = pd.date_range(start="2015-01-01", end="2024-12-31", freq="QE")
        n_periods = len(dates)

        cdc_data = {
            "date": dates,
            "scd_births_per_1000": np.linspace(1.2, 1.5, n_periods),
            "scd_prevalence_us": np.linspace(100000, 120000, n_periods),
            "new_treatments_approved": [
                0, 0, 0, 1, 0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 1, 2, 2, 3, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2, 2, 3, 2, 1, 2, 3, 1, 2, 2, 3,
            ][:n_periods],
            "clinical_trials_active": np.linspace(45, 105, n_periods),
        }

        df = pd.DataFrame(cdc_data)
        df.to_csv(f"{self.data_dir}/cdc_sickle_cell_data.csv", index=False)
        print(f"✓ CDC data saved to {self.data_dir}/cdc_sickle_cell_data.csv")
        return df

    def collect_clinical_trials_data(self):
        """
        Fetch sickle cell clinical trial data from ClinicalTrials.gov.
        Verify the request URL/JSON shape against the current API docs:
        https://clinicaltrials.gov/data-api/api
        """
        print("Collecting Clinical Trials Data...")

        base_url = "https://clinicaltrials.gov/api/query/full_studies"
        params = {
            "expr": "sickle cell disease",
            "min_rnk": 1,
            "max_rnk": 50,
            "fmt": "json",
        }

        trials = []
        try:
            response = requests.get(base_url, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if "FullStudiesResponse" in data:
                    for study in data["FullStudiesResponse"].get("FullStudies", []):
                        protocol = study.get("Study", {}).get("ProtocolSection", {})
                        status = protocol.get("StatusModule", {})
                        identification = protocol.get("IdentificationModule", {})
                        phase_list = protocol.get("DesignModule", {}).get("PhaseList")
                        phase = ""
                        if phase_list and phase_list.get("Phase"):
                            ph = phase_list.get("Phase")
                            phase = ph[0] if isinstance(ph, list) else ph
                        trial = {
                            "nct_id": identification.get("NCTId", ""),
                            "title": identification.get("BriefTitle", ""),
                            "status": status.get("OverallStatus", ""),
                            "start_date": status.get("StartDateStruct", {}).get("StartDate", ""),
                            "phase": phase,
                        }
                        trials.append(trial)
            else:
                print(f"✗ ClinicalTrials.gov returned status {response.status_code}")
        except Exception as e:
            print(f"✗ ClinicalTrials.gov request failed: {e}")

        df = pd.DataFrame(trials) if trials else pd.DataFrame(
            columns=["nct_id", "title", "status", "start_date", "phase"]
        )
        df.to_csv(f"{self.data_dir}/clinical_trials_scd.csv", index=False)
        print(f"✓ Clinical trials data saved ({len(trials)} trials)")
        return df

    def collect_fda_approval_data(self):
        """Collect FDA drug approval data for sickle cell treatments (illustrative rows)."""
        print("Collecting FDA Approval Data...")

        fda_approvals = {
            "drug_name": ["L-glutamine", "Voxelotor", "Crizanlizumab", "LentiGlobin", "CTX001"],
            "company": [
                "Emmaus Life Sciences",
                "Global Blood Therapeutics",
                "Novartis",
                "Bluebird Bio",
                "CRISPR Therapeutics",
            ],
            "approval_date": ["2017-07-07", "2019-11-25", "2019-11-15", "2021-12-03", "2023-11-16"],
            "mechanism": [
                "Antioxidant",
                "HbS polymerization inhibitor",
                "P-selectin inhibitor",
                "Lentiviral gene therapy",
                "CRISPR gene editing",
            ],
            "phase": ["Commercial", "Commercial", "Commercial", "Phase 3", "Phase 3"],
            "efficacy": [
                "Reduces pain crises",
                "Increases hemoglobin",
                "Reduces pain crises",
                "Functional cure potential",
                "Functional cure potential",
            ],
        }

        df = pd.DataFrame(fda_approvals)
        df.to_csv(f"{self.data_dir}/fda_approvals_scd.csv", index=False)
        print(f"✓ FDA approval data saved ({len(df)} drugs)")
        return df

    def collect_gene_therapy_pipeline(self):
        """Collect gene therapy pipeline data for sickle cell (illustrative)."""
        print("Collecting Gene Therapy Pipeline Data...")

        gene_therapy_data = {
            "company": [
                "CRISPR Therapeutics",
                "Vertex Pharmaceuticals",
                "Editas Medicine",
                "Intellia Therapeutics",
                "Beam Therapeutics",
                "Bluebird Bio",
            ],
            "ticker": ["CRSP", "VRTX", "EDIT", "NTLA", "BEAM", "BLUE"],
            "gene_therapy_name": ["CTX001", "CTX001", "EDIT-301", "NTLA-2001", "BEAM-101", "LentiGlobin"],
            "technology": ["CRISPR-Cas9", "CRISPR-Cas9", "CRISPR-Cas9", "CRISPR-Cas9", "Base Editing", "Lentiviral"],
            "clinical_phase": ["Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Preclinical", "Phase 3"],
            "target_mechanism": [
                "BCL11A disruption",
                "BCL11A disruption",
                "BCL11A disruption",
                "BCL11A disruption",
                "Base editing",
                "Beta-globin addition",
            ],
            "probability_of_success": [0.80, 0.80, 0.45, 0.35, 0.30, 0.75],
            "estimated_cost": [1850000, 1850000, 1950000, 1750000, 1200000, 2100000],
        }

        df = pd.DataFrame(gene_therapy_data)
        df.to_csv(f"{self.data_dir}/gene_therapy_pipeline_scd.csv", index=False)
        print(f"✓ Gene therapy pipeline data saved ({len(df)} companies)")
        return df

    def collect_all_health_data(self):
        print("\n=== Collecting All Sickle Cell Health Data ===\n")
        self.collect_cdc_sickle_cell_data()
        self.collect_clinical_trials_data()
        self.collect_fda_approval_data()
        self.collect_gene_therapy_pipeline()
        print("\n✓ All health data collection complete!")


if __name__ == "__main__":
    collector = SickleCellHealthDataCollector()
    collector.collect_all_health_data()
