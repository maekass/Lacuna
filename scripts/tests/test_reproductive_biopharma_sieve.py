#!/usr/bin/env python3
"""Contract tests for the reproductive-biopharma evidence classification."""

import unittest

from scripts.institutional_reproductive_biopharma_sieve import (
    EXCLUDED,
    INCLUDED,
    REVIEW,
    classify_reproductive_biopharma,
)


class ReproductiveBiopharmaClassifierTests(unittest.TestCase):
    def test_includes_therapeutic_reproductive_asset(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "ReproNova Therapeutics",
                "type": "Biotech / Therapeutics",
                "description": (
                    "Small-molecule pipeline for endometriosis and ovarian disease."
                ),
            }
        )
        self.assertEqual(result.status, INCLUDED)
        self.assertEqual(result.reason, "reproductive_therapeutic_asset")
        self.assertTrue(result.evidence["therapeutic_modality_detected"])
        self.assertTrue(result.evidence["reproductive_relevance_detected"])

    def test_excludes_consumer_clinic_without_therapeutic_asset(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "Boutique Fertility Clinic Rollup",
                "type": "Retail Clinics",
                "description": "Outpatient fertility clinic expansion.",
            }
        )
        self.assertEqual(result.status, EXCLUDED)
        self.assertEqual(result.reason, "consumer_or_care_service")

    def test_excludes_consumer_app_without_therapeutic_asset(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "Cycle Tracker",
                "type": "Consumer App",
                "description": "Subscription cycle-tracking and wellness app.",
            }
        )
        self.assertEqual(result.status, EXCLUDED)

    def test_does_not_require_inpatient_status(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "Endometriosis Therapeutics",
                "type": "Biotech",
                "description": "Biologic therapeutic pipeline for endometriosis.",
                "is_inpatient_hospital_node": False,
                "has_surrogate_biomarkers": False,
            }
        )
        self.assertEqual(result.status, INCLUDED)

    def test_does_not_require_surrogate_biomarkers(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "Ovarian Disease Biotech",
                "type": "Biotech",
                "description": "Small-molecule therapeutic program for ovarian disease.",
                "is_inpatient_hospital_node": True,
                "has_surrogate_biomarkers": False,
            }
        )
        self.assertEqual(result.status, INCLUDED)

    def test_single_dimension_signal_requires_review(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "General Biotech",
                "type": "Biotech",
                "description": "Biologic pipeline for an unspecified disease.",
            }
        )
        self.assertEqual(result.status, REVIEW)

    def test_source_record_is_not_mutated(self):
        source = {
            "target_name": "Endometriosis Therapeutics",
            "type": "Biotech",
            "description": "Small-molecule therapeutic pipeline for endometriosis.",
        }
        snapshot = dict(source)
        classify_reproductive_biopharma(source)
        self.assertEqual(source, snapshot)

    def test_definition_is_explicitly_versioned(self):
        result = classify_reproductive_biopharma(
            {
                "target_name": "Endometriosis Therapeutics",
                "type": "Biotech",
                "description": "Small-molecule therapeutic pipeline for endometriosis.",
            }
        )
        self.assertTrue(result.evidence["definition_version"])


if __name__ == "__main__":
    unittest.main()
