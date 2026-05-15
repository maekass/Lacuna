"""
Sickle Cell Disease Public Health Data Collector
Fetches publicly available data on sickle cell disease epidemiology, treatments, and research
All data sources are public and legally accessible
"""

import os

import numpy as np
import pandas as pd
import requests

from src.data_collection.csv_writer import write_csv
from src.data_collection.parsers.clinical_trials import PARSER_VERSION, parse_legacy_full_studies, parse_v2_studies
from src.data_collection.provenance import ProvenanceStore, PullRecord


# Representative sickle cell trials for offline / API-failure demos (public NCT IDs).
_FALLBACK_CLINICAL_TRIALS: list[dict[str, str]] = [
    {
        "nct_id": "NCT03745287",
        "title": "A Study of CTX001 in Severe Sickle Cell Disease",
        "status": "COMPLETED",
        "start_date": "2018-11-19",
        "phase": "Phase 1/2",
    },
    {
        "nct_id": "NCT04208592",
        "title": "Study of Voxelotor in Pediatric Participants With Sickle Cell Disease",
        "status": "COMPLETED",
        "start_date": "2019-12-18",
        "phase": "Phase 2",
    },
    {
        "nct_id": "NCT01895361",
        "title": "Safety and Efficacy Study of Crizanlizumab in Sickle Cell Disease",
        "status": "COMPLETED",
        "start_date": "2013-11",
        "phase": "Phase 2",
    },
    {
        "nct_id": "NCT03040908",
        "title": "New Hemolysis Parameters in Sickle Cell Disease",
        "status": "UNKNOWN",
        "start_date": "2019-09-01",
        "phase": "",
    },
    {
        "nct_id": "NCT04335721",
        "title": "Voxelotor in Sickle Cell Anemia Patients at Risk for CKD Progression",
        "status": "TERMINATED",
        "start_date": "2021-03-16",
        "phase": "Phase 1; Phase 2",
    },
    {
        "nct_id": "NCT00834899",
        "title": "Safety Study of Eptifibatide in Patients With Sickle Cell Disease",
        "status": "TERMINATED",
        "start_date": "2009-01",
        "phase": "Phase 1; Phase 2",
    },
    {
        "nct_id": "NCT00445978",
        "title": "Phase 2 Study of 6R-BH4 in Subjects With Sickle Cell Disease",
        "status": "COMPLETED",
        "start_date": "2007-05",
        "phase": "Phase 2",
    },
    {
        "nct_id": "NCT01685515",
        "title": "Study of Decitabine and THU in Patients With Sickle Cell Disease",
        "status": "COMPLETED",
        "start_date": "2012-08",
        "phase": "Phase 1",
    },
]


class SickleCellHealthDataCollector:
    def __init__(self, data_dir="data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.provenance = ProvenanceStore(data_dir)

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
        artifact = "cdc_sickle_cell_data.csv"
        pull = PullRecord.now(
            artifact=artifact,
            source_url="https://www.cdc.gov/ncbddd/sicklecell/data.html",
            params={},
            parser_version="illustrative.v1",
            extractor="collect_cdc_sickle_cell_data",
            kind="illustrative",
            notes="Illustrative time series until live CDC API wired.",
        )
        write_csv(
            df,
            f"{self.data_dir}/{artifact}",
            artifact=artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
        print(f"✓ CDC data saved to {self.data_dir}/{artifact}")
        print(
            "  Note: prevalence-style columns are illustrative placeholders until wired to cited agency/surveillance sources."
        )
        return df

    def collect_clinical_trials_data(self, max_trials: int = 50):
        """
        Fetch sickle cell clinical trial data from ClinicalTrials.gov.
        Tries the legacy JSON API first; on failure or empty payload, uses the v2 REST API
        (see https://clinicaltrials.gov/data-api/api).
        """
        print("Collecting Clinical Trials Data...")

        trials: list[dict[str, str]] = []
        pull: PullRecord | None = None
        legacy_url = "https://clinicaltrials.gov/api/query/full_studies"
        legacy_params = {
            "expr": "sickle cell disease",
            "min_rnk": 1,
            "max_rnk": max_trials,
            "fmt": "json",
        }

        try:
            response = requests.get(legacy_url, params=legacy_params, timeout=30)
            if response.status_code == 200:
                trials = parse_legacy_full_studies(response.json(), max_trials=max_trials)
                if trials:
                    pull = PullRecord.now(
                        artifact="clinical_trials_scd.csv",
                        source_url=legacy_url,
                        params=legacy_params,
                        parser_version=PARSER_VERSION,
                        extractor="parse_legacy_full_studies",
                        http_status=response.status_code,
                    )
            else:
                print(f"✗ Legacy ClinicalTrials.gov API returned status {response.status_code}")
        except Exception as e:
            print(f"✗ Legacy ClinicalTrials.gov request failed: {e}")

        if not trials:
            v2_url = "https://clinicaltrials.gov/api/v2/studies"
            v2_params = {
                "query.cond": "sickle cell disease",
                "pageSize": min(max_trials, 100),
            }
            try:
                r2 = requests.get(v2_url, params=v2_params, timeout=30)
                if r2.status_code != 200:
                    print(f"✗ ClinicalTrials.gov v2 API returned status {r2.status_code}")
                else:
                    trials = parse_v2_studies(r2.json(), max_trials=max_trials)
                    if trials:
                        pull = PullRecord.now(
                            artifact="clinical_trials_scd.csv",
                            source_url=v2_url,
                            params=v2_params,
                            parser_version=PARSER_VERSION,
                            extractor="parse_v2_studies",
                            http_status=r2.status_code,
                        )
                        print(f"✓ Loaded {len(trials)} trials via ClinicalTrials.gov v2 API")
            except Exception as e:
                print(f"✗ ClinicalTrials.gov v2 request failed: {e}")

        if not trials:
            trials = _FALLBACK_CLINICAL_TRIALS
            pull = PullRecord.now(
                artifact="clinical_trials_scd.csv",
                source_url="bundled://fallback_clinical_trials",
                params={"reason": "api_unavailable"},
                parser_version=PARSER_VERSION,
                extractor="_FALLBACK_CLINICAL_TRIALS",
                kind="illustrative",
                notes="Bundled fallback rows when APIs fail.",
            )
            print(
                f"  Using {len(trials)} bundled fallback trial rows (API unavailable or empty)."
            )

        df = pd.DataFrame(trials)
        artifact = "clinical_trials_scd.csv"
        write_csv(
            df,
            f"{self.data_dir}/{artifact}",
            artifact=artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
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
        artifact = "fda_approvals_scd.csv"
        pull = PullRecord.now(
            artifact=artifact,
            source_url="https://api.fda.gov/drug/event.json",
            params={"search": "sickle cell (not yet wired)"},
            parser_version="illustrative.v1",
            extractor="collect_fda_approval_data",
            kind="illustrative",
        )
        write_csv(df, f"{self.data_dir}/{artifact}", artifact=artifact, pull=pull, provenance_store=self.provenance)
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
                "Sangamo Therapeutics",
            ],
            "ticker": ["CRSP", "VRTX", "EDIT", "NTLA", "BEAM", "SGMO"],
            "gene_therapy_name": ["CTX001", "CTX001", "EDIT-301", "NTLA-2001", "BEAM-101", "ST-400"],
            "technology": ["CRISPR-Cas9", "CRISPR-Cas9", "CRISPR-Cas9", "CRISPR-Cas9", "Base Editing", "ZFN"],
            "clinical_phase": ["Phase 3", "Phase 3", "Phase 1/2", "Phase 1", "Preclinical", "Phase 1/2"],
            "target_mechanism": [
                "BCL11A disruption",
                "BCL11A disruption",
                "BCL11A disruption",
                "BCL11A disruption",
                "Base editing",
                "BCL11A repression",
            ],
            "probability_of_success": [0.80, 0.80, 0.45, 0.35, 0.30, 0.40],
            "estimated_cost": [1850000, 1850000, 1950000, 1750000, 1200000, 1800000],
        }

        df = pd.DataFrame(gene_therapy_data)
        artifact = "gene_therapy_pipeline_scd.csv"
        pull = PullRecord.now(
            artifact=artifact,
            source_url="illustrative://gene_therapy_pipeline",
            params={},
            parser_version="illustrative.v1",
            extractor="collect_gene_therapy_pipeline",
            kind="illustrative",
        )
        write_csv(df, f"{self.data_dir}/{artifact}", artifact=artifact, pull=pull, provenance_store=self.provenance)
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
