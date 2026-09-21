"""Self-check: artifact schema and --check equivalence."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np

from lacuna_hazard.cohort import build_cohort
from lacuna_hazard.cox import fit_cox_ph
from lacuna_hazard.export import (
    artifacts_equivalent,
    build_artifact,
    dump_artifact,
    load_artifact,
)
from lacuna_hazard.features import FEATURE_NAMES
from lacuna_hazard.pipeline import expand_phases, run_phases


def _mini_dataset() -> dict:
    companies = []
    acquisitions = []
    # Enough Fertility and Diagnostics events to keep both dummies.
    for i in range(12):
        companies.append(
            {
                "id": f"f{i}",
                "name": f"Fert{i}",
                "sector": "Fertility",
                "founded": 2010,
            }
        )
        acquisitions.append(
            {
                "id": f"df{i}",
                "targetId": f"f{i}",
                "announcedDate": f"{2014 + (i % 5):04d}-06-01",
            }
        )
    for i in range(12):
        companies.append(
            {
                "id": f"d{i}",
                "name": f"Dx{i}",
                "sector": "Diagnostics",
                "founded": 2011,
            }
        )
        acquisitions.append(
            {
                "id": f"dd{i}",
                "targetId": f"d{i}",
                "announcedDate": f"{2016 + (i % 4):04d}-03-01",
            }
        )
    for i in range(8):
        companies.append(
            {
                "id": f"o{i}",
                "name": f"Other{i}",
                "sector": "Menopause",
                "founded": 2012,
            }
        )
    return {
        "provenance": {
            "lastUpdated": "2026-09-05",
            "datasetVersion": "v-test",
            "purpose": "test",
            "disclaimer": "test",
            "sources": [],
            "notes": [],
        },
        "companies": companies,
        "acquirers": [],
        "acquisitions": acquisitions,
    }


class ExportTests(unittest.TestCase):
    def test_artifact_schema_keys(self) -> None:
        dataset = _mini_dataset()
        cohort = build_cohort(dataset)
        included = cohort.included
        X = np.asarray([list(r.features) for r in included], dtype=float)
        time = np.asarray([r.time_years for r in included], dtype=float)
        event = np.asarray([r.event for r in included], dtype=int)
        fit = fit_cox_ph(X, time, event, FEATURE_NAMES, min_events_per_feature=8)
        artifact = build_artifact(
            cohort=cohort,
            fit=fit,
            dataset_hash="abc",
            X=X,
            time=time,
            event=event,
            fitted_at="2026-09-20T00:00:00Z",
        )
        for key in (
            "schemaVersion",
            "id",
            "modelType",
            "claimClass",
            "coefficients",
            "keptFeatureNames",
            "baseline",
            "sufficiency",
            "allowedClaims",
            "forbiddenClaims",
        ):
            self.assertIn(key, artifact)
        self.assertEqual(artifact["claimClass"], "descriptive")
        self.assertEqual(artifact["modelType"], "cox_ph_breslow")
        self.assertTrue(artifact["sufficiency"]["fits"])
        self.assertEqual(len(artifact["coefficients"]), len(artifact["keptFeatureNames"]))

    def test_dump_roundtrip_ignores_fitted_at(self) -> None:
        dataset = _mini_dataset()
        cohort = build_cohort(dataset)
        included = cohort.included
        X = np.asarray([list(r.features) for r in included], dtype=float)
        time = np.asarray([r.time_years for r in included], dtype=float)
        event = np.asarray([r.event for r in included], dtype=int)
        fit = fit_cox_ph(X, time, event, FEATURE_NAMES, min_events_per_feature=8)
        a = build_artifact(
            cohort=cohort,
            fit=fit,
            dataset_hash="abc",
            X=X,
            time=time,
            event=event,
            fitted_at="2026-01-01T00:00:00Z",
        )
        b = build_artifact(
            cohort=cohort,
            fit=fit,
            dataset_hash="abc",
            X=X,
            time=time,
            event=event,
            fitted_at="2026-02-02T00:00:00Z",
        )
        self.assertTrue(artifacts_equivalent(a, b))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "artifact.json"
            dump_artifact(a, path)
            loaded = load_artifact(path)
            self.assertTrue(artifacts_equivalent(loaded, a))
            json.loads(path.read_text(encoding="utf-8"))

    def test_expand_phases_inserts_dependencies(self) -> None:
        self.assertEqual(
            expand_phases(["export"]),
            ["ingest", "cohort", "fit", "export"],
        )
        self.assertEqual(expand_phases(["claims"]), ["claims"])


class PipelineSkipNetworkTests(unittest.TestCase):
    def test_run_ingest_on_repo_dataset(self) -> None:
        state = run_phases(["ingest", "cohort", "fit"])
        self.assertIsNotNone(state.cohort)
        self.assertIsNotNone(state.fit)
        assert state.cohort is not None
        self.assertGreater(state.cohort.n_events, 0)


if __name__ == "__main__":
    unittest.main()
