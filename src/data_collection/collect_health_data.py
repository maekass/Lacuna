"""
Immunology-focused health data collector (multi-disease registry).
"""

from __future__ import annotations

import os

import pandas as pd
import requests

from src.data_collection.csv_writer import write_csv
from src.data_collection.demo_tables import (
    epidemiology_df,
    fda_sarc,
    fda_scd,
    fda_sle,
    pipeline_sarc,
    pipeline_scd,
    pipeline_sle,
)
from src.data_collection.disease_fallbacks import FALLBACK_TRIALS
from src.data_collection.parsers.clinical_trials import PARSER_VERSION, parse_legacy_full_studies, parse_v2_studies
from src.data_collection.parsers.openfda import PARSER_VERSION as OPENFDA_PARSER_VERSION
from src.data_collection.parsers.openfda import fetch_labels_for_query
from src.data_collection.provenance import ProvenanceStore, PullRecord
from src.disease_registry import FOCUS_DISEASE_IDS, DiseaseSpec, get_disease, list_diseases


class ImmunologyHealthDataCollector:
    def __init__(self, data_dir: str = "data/raw"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.provenance = ProvenanceStore(data_dir)

    def collect_epidemiology(self, spec: DiseaseSpec) -> pd.DataFrame:
        print(f"Collecting epidemiology for {spec.display_name}...")
        df = epidemiology_df(spec.disease_id)
        pull = PullRecord.now(
            artifact=spec.epidemiology_artifact,
            source_url="illustrative://epidemiology",
            params={"disease_id": spec.disease_id},
            parser_version="illustrative.v1",
            extractor="collect_epidemiology",
            kind="illustrative",
            notes=spec.disparity_note[:200],
        )
        write_csv(
            df,
            f"{self.data_dir}/{spec.epidemiology_artifact}",
            artifact=spec.epidemiology_artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
        return df

    def collect_clinical_trials(self, spec: DiseaseSpec, max_trials: int = 50) -> pd.DataFrame:
        print(f"Collecting trials for {spec.display_name}...")
        trials: list[dict[str, str]] = []
        pull: PullRecord | None = None
        query = spec.clinical_trials_query

        legacy_url = "https://clinicaltrials.gov/api/query/full_studies"
        legacy_params = {"expr": query, "min_rnk": 1, "max_rnk": max_trials, "fmt": "json"}
        try:
            response = requests.get(legacy_url, params=legacy_params, timeout=30)
            if response.status_code == 200:
                trials = parse_legacy_full_studies(response.json(), max_trials=max_trials)
                if trials:
                    pull = PullRecord.now(
                        artifact=spec.trials_artifact,
                        source_url=legacy_url,
                        params=legacy_params,
                        parser_version=PARSER_VERSION,
                        extractor="parse_legacy_full_studies",
                        http_status=response.status_code,
                    )
        except Exception as e:
            print(f"  ✗ Legacy API: {e}")

        if not trials:
            v2_url = "https://clinicaltrials.gov/api/v2/studies"
            v2_params = {"query.cond": query, "pageSize": min(max_trials, 100)}
            try:
                r2 = requests.get(v2_url, params=v2_params, timeout=30)
                if r2.status_code == 200:
                    trials = parse_v2_studies(r2.json(), max_trials=max_trials)
                    if trials:
                        pull = PullRecord.now(
                            artifact=spec.trials_artifact,
                            source_url=v2_url,
                            params=v2_params,
                            parser_version=PARSER_VERSION,
                            extractor="parse_v2_studies",
                            http_status=r2.status_code,
                        )
            except Exception as e:
                print(f"  ✗ v2 API: {e}")

        if not trials:
            trials = list(FALLBACK_TRIALS.get(spec.disease_id, []))
            pull = PullRecord.now(
                artifact=spec.trials_artifact,
                source_url="bundled://fallback_clinical_trials",
                params={"disease_id": spec.disease_id},
                parser_version=PARSER_VERSION,
                extractor="FALLBACK_TRIALS",
                kind="illustrative",
            )

        df = pd.DataFrame(trials)
        df["disease_id"] = spec.disease_id
        write_csv(
            df,
            f"{self.data_dir}/{spec.trials_artifact}",
            artifact=spec.trials_artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
        print(f"  ✓ {len(df)} trials → {spec.trials_artifact}")
        return df

    def collect_fda_approvals(self, spec: DiseaseSpec, df: pd.DataFrame | None = None) -> pd.DataFrame:
        pull: PullRecord | None = None
        if df is None:
            rows, meta = fetch_labels_for_query(spec.openfda_query, limit=15)
            if rows:
                df = pd.DataFrame(rows)
                df["disease_id"] = spec.disease_id
                pull = PullRecord.now(
                    artifact=spec.fda_artifact,
                    source_url=meta["source_url"],
                    params=meta.get("params"),
                    parser_version=OPENFDA_PARSER_VERSION,
                    extractor="fetch_labels_for_query",
                    http_status=meta.get("http_status"),
                    kind="sourced_public",
                )
            else:
                df = {"scd": fda_scd, "sle": fda_sle, "sarc": fda_sarc}[spec.disease_id]()
                pull = PullRecord.now(
                    artifact=spec.fda_artifact,
                    source_url="illustrative://fda_approvals",
                    params={"disease_id": spec.disease_id, "openfda_error": meta.get("error")},
                    kind="illustrative",
                    extractor="collect_fda_approvals",
                )
        if pull is None:
            pull = PullRecord.now(
                artifact=spec.fda_artifact,
                source_url="illustrative://fda_approvals",
                params={"disease_id": spec.disease_id},
                kind="illustrative",
                extractor="collect_fda_approvals",
            )
        write_csv(
            df,
            f"{self.data_dir}/{spec.fda_artifact}",
            artifact=spec.fda_artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
        return df

    def collect_pipeline(self, spec: DiseaseSpec, df: pd.DataFrame | None = None) -> pd.DataFrame:
        if df is None:
            df = {"scd": pipeline_scd, "sle": pipeline_sle, "sarc": pipeline_sarc}[spec.disease_id]()
        pull = PullRecord.now(
            artifact=spec.pipeline_artifact,
            source_url="illustrative://pipeline",
            params={"disease_id": spec.disease_id},
            kind="illustrative",
            extractor="collect_pipeline",
        )
        write_csv(
            df,
            f"{self.data_dir}/{spec.pipeline_artifact}",
            artifact=spec.pipeline_artifact,
            pull=pull,
            provenance_store=self.provenance,
        )
        return df

    def collect_disease(self, disease_id: str) -> None:
        spec = get_disease(disease_id)
        self.collect_epidemiology(spec)
        self.collect_clinical_trials(spec)
        self.collect_fda_approvals(spec)
        self.collect_pipeline(spec)

    def collect_all_health_data(self) -> None:
        print("\n=== Collecting registry health data (SCD · SLE · sarcoidosis) ===\n")
        for spec in list_diseases():
            self.collect_disease(spec.disease_id)
        print("\n✓ All registry health data collection complete!")


# Backward-compatible alias
SickleCellHealthDataCollector = ImmunologyHealthDataCollector


if __name__ == "__main__":
    ImmunologyHealthDataCollector().collect_all_health_data()
