"""Tests for institutional TensorFlow benchmark controls.

These tests do not import TensorFlow and are safe for ordinary CI.
"""

from __future__ import annotations

import unittest

import numpy as np

from lacuna_ct.benchmark_stats import (
    canonical_record_hash,
    paired_bootstrap_comparison,
    promotion_gate,
)
from lacuna_ct.fetch_training_data import TrialRecord
from lacuna_ct.tensorflow_benchmark import _development_split, _split_indices


def _record(
    index: int,
    *,
    year: int,
    completed: int,
    sponsor: str | None = None,
) -> TrialRecord:
    return TrialRecord(
        nct_id=f"NCT{index:08d}",
        title=f"Trial {index}",
        phase="PHASE2",
        status="COMPLETED" if completed else "TERMINATED",
        condition="Endometriosis",
        sponsor=sponsor or f"Sponsor {index % 12}",
        enrollment=100 + index,
        interventions="Drug A",
        label_wh=1,
        label_terminated=0 if completed else 1,
        source_query="endometriosis",
        has_results=bool(index % 2),
        study_type="INTERVENTIONAL",
        label_completed=completed,
        start_year=year,
        sponsor_class="industry",
    )


class BenchmarkControlTests(unittest.TestCase):
    def test_temporal_split_keeps_future_years_out_of_training(self) -> None:
        records: list[TrialRecord] = []
        for index in range(240):
            year = 2018 + (index // 40)
            records.append(
                _record(
                    index,
                    year=year,
                    completed=index % 2,
                )
            )
        labels = np.asarray([int(record.label_completed) for record in records])

        train_idx, test_idx, metadata = _split_indices(records, labels)

        self.assertEqual(metadata["strategy"], "start_year_holdout")
        cutoff = int(metadata["cutoff_year"])
        self.assertTrue(
            all(int(records[int(i)].start_year) <= cutoff for i in train_idx)
        )
        self.assertTrue(
            all(int(records[int(i)].start_year) > cutoff for i in test_idx)
        )
        self.assertEqual(set(train_idx) & set(test_idx), set())

    def test_development_split_never_uses_test_rows(self) -> None:
        labels = np.asarray([index % 2 for index in range(200)])
        train_idx = np.arange(160)
        test_idx = np.arange(160, 200)

        development_idx, validation_idx = _development_split(train_idx, labels)

        self.assertEqual(set(development_idx) & set(validation_idx), set())
        self.assertEqual(set(development_idx) & set(test_idx), set())
        self.assertEqual(set(validation_idx) & set(test_idx), set())
        self.assertEqual(
            set(development_idx) | set(validation_idx),
            set(train_idx),
        )

    def test_record_hash_is_invariant_to_input_order(self) -> None:
        records = [
            _record(1, year=2020, completed=1),
            _record(2, year=2021, completed=0),
            _record(3, year=2022, completed=1),
        ]
        self.assertEqual(
            canonical_record_hash(records),
            canonical_record_hash(list(reversed(records))),
        )

    def test_paired_bootstrap_detects_materially_better_challenger(self) -> None:
        y = np.asarray([0, 1] * 60)
        baseline = np.full(len(y), 0.5)
        challenger = np.where(y == 1, 0.9, 0.1)

        result = paired_bootstrap_comparison(
            y,
            baseline,
            challenger,
            n_resamples=400,
            seed=7,
        )

        self.assertGreater(result["roc_auc_delta"]["ci_95_lower"], 0.0)
        self.assertLess(result["brier_delta"]["ci_95_upper"], 0.0)
        self.assertLess(result["log_loss_delta"]["ci_95_upper"], 0.0)

    def test_promotion_gate_rejects_random_or_synthetic_runs(self) -> None:
        paired = {
            "roc_auc_delta": {"ci_95_lower": 0.01},
            "brier_delta": {"ci_95_upper": -0.001},
            "log_loss_delta": {"ci_95_upper": -0.001},
        }
        cohort = {
            "test_class_counts": {"0": 30, "1": 30},
            "nct_id_overlap_count": 0,
        }
        robustness = {
            "all_seeds_beat_baseline_auc_and_brier": True,
        }

        eligible = promotion_gate(
            training_source="ctgov_cached",
            split_strategy="start_year_holdout",
            cohort=cohort,
            paired=paired,
            robustness=robustness,
        )
        self.assertTrue(eligible["candidate_for_model_risk_review"])
        self.assertFalse(eligible["production_authorized"])

        ineligible = promotion_gate(
            training_source="synthetic_seed",
            split_strategy="stratified_random_fallback",
            cohort=cohort,
            paired=paired,
            robustness=robustness,
        )
        self.assertFalse(ineligible["candidate_for_model_risk_review"])
        self.assertIn(
            "non_synthetic_snapshot",
            ineligible["failed_checks"],
        )
        self.assertIn(
            "temporal_holdout",
            ineligible["failed_checks"],
        )


if __name__ == "__main__":
    unittest.main()
