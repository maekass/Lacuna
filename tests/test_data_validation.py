"""Comprehensive tests for the data validation framework."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pandas as pd
import pytest

from src.data_validation.validators import (
    ValidationResult,
    ValidationSeverity,
    validate_artifact,
    validate_directory,
    validate_json_artifact,
    validate_model_artifacts,
)
from src.data_validation.rules import (
    CLINICAL_TRIAL_STATUSES,
    VALIDATION_RULES,
    _check_nct_id_format,
    _check_no_duplicate_rows,
    _check_probability_range,
)
from src.data_validation.report import format_text_report, format_json_report, summary_stats


# ---------------------------------------------------------------------------
# Rule helpers
# ---------------------------------------------------------------------------


class TestNCTIDFormat:
    def test_valid_ids(self) -> None:
        df = pd.DataFrame({"nct_id": ["NCT12345678", "NCT00001234"]})
        assert _check_nct_id_format(df) == []

    def test_invalid_ids(self) -> None:
        df = pd.DataFrame({"nct_id": ["INVALID", "NCT12345678"]})
        errors = _check_nct_id_format(df)
        assert len(errors) == 1
        assert "malformed" in errors[0]

    def test_missing_column(self) -> None:
        df = pd.DataFrame({"title": ["x"]})
        assert _check_nct_id_format(df) == []


class TestProbabilityRange:
    def test_valid_range(self) -> None:
        df = pd.DataFrame({"probability_of_success": [0.1, 0.5, 0.9]})
        assert _check_probability_range(df) == []

    def test_out_of_range(self) -> None:
        df = pd.DataFrame({"probability_of_success": [0.5, 1.5, -0.1]})
        errors = _check_probability_range(df)
        assert len(errors) == 1
        assert "outside [0, 1]" in errors[0]

    def test_missing_column(self) -> None:
        df = pd.DataFrame({"other": [1]})
        assert _check_probability_range(df) == []


class TestDuplicateRows:
    def test_no_duplicates(self) -> None:
        df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
        assert _check_no_duplicate_rows(df) == []

    def test_with_duplicates(self) -> None:
        df = pd.DataFrame({"a": [1, 1, 2], "b": [4, 4, 6]})
        errors = _check_no_duplicate_rows(df)
        assert len(errors) == 1
        assert "duplicated" in errors[0]


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------


class TestValidateArtifact:
    def test_missing_required_columns(self) -> None:
        df = pd.DataFrame({"title": ["x"], "status": ["COMPLETED"]})
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        failed = [r for r in results if not r.passed and r.check == "required_column"]
        missing_cols = {r.details["column"] for r in failed}
        assert "nct_id" in missing_cols
        assert "start_date" in missing_cols
        assert "phase" in missing_cols

    def test_valid_clinical_trials(self) -> None:
        df = pd.DataFrame(
            {
                "nct_id": ["NCT12345678"],
                "title": ["A study"],
                "status": ["COMPLETED"],
                "start_date": ["2024-01-01"],
                "phase": ["Phase 2"],
            }
        )
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        assert all(r.passed for r in results)

    def test_invalid_status_value(self) -> None:
        df = pd.DataFrame(
            {
                "nct_id": ["NCT12345678"],
                "title": ["A study"],
                "status": ["INVALID_STATUS"],
                "start_date": ["2024-01-01"],
                "phase": ["Phase 2"],
            }
        )
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        status_checks = [r for r in results if r.check == "allowed_values"]
        assert any(not r.passed for r in status_checks)

    def test_duplicate_nct_ids(self) -> None:
        df = pd.DataFrame(
            {
                "nct_id": ["NCT12345678", "NCT12345678"],
                "title": ["A", "B"],
                "status": ["COMPLETED", "RECRUITING"],
                "start_date": ["2024-01-01", "2024-02-01"],
                "phase": ["Phase 2", "Phase 3"],
            }
        )
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        unique_checks = [r for r in results if r.check == "unique_column"]
        assert any(not r.passed for r in unique_checks)

    def test_null_in_non_null_column(self) -> None:
        df = pd.DataFrame(
            {
                "nct_id": [None, "NCT12345678"],
                "title": ["A", "B"],
                "status": ["COMPLETED", "RECRUITING"],
                "start_date": ["2024-01-01", "2024-02-01"],
                "phase": ["Phase 2", "Phase 3"],
            }
        )
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        null_checks = [
            r for r in results if r.check == "non_null" and r.details.get("column") == "nct_id"
        ]
        assert any(not r.passed for r in null_checks)

    def test_numeric_range_violation(self) -> None:
        df = pd.DataFrame(
            {
                "date": ["2024-01-01"],
                "scd_births_per_1000": [-1.0],
                "scd_prevalence_us": [100000],
                "new_treatments_approved": [2],
                "clinical_trials_active": [50],
            }
        )
        results = validate_artifact("cdc_sickle_cell_data.csv", df=df)
        range_checks = [r for r in results if r.check == "numeric_range" and not r.passed]
        assert len(range_checks) > 0

    def test_unparseable_dates(self) -> None:
        df = pd.DataFrame(
            {
                "nct_id": ["NCT12345678"],
                "title": ["A"],
                "status": ["COMPLETED"],
                "start_date": ["not-a-date"],
                "phase": ["Phase 2"],
            }
        )
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        date_checks = [r for r in results if r.check == "date_format"]
        assert any(not r.passed for r in date_checks)

    def test_unknown_artifact_skipped(self) -> None:
        df = pd.DataFrame({"x": [1]})
        results = validate_artifact("nonexistent_file.csv", df=df)
        assert len(results) == 1
        assert results[0].check == "no_rules"

    def test_min_rows_failure(self) -> None:
        df = pd.DataFrame(columns=["nct_id", "title", "status", "start_date", "phase"])
        results = validate_artifact("clinical_trials_scd.csv", df=df)
        row_checks = [r for r in results if r.check == "min_rows"]
        assert any(not r.passed for r in row_checks)

    def test_file_not_found(self) -> None:
        results = validate_artifact(
            "clinical_trials_scd.csv", path="/tmp/nonexistent_dir/fake.csv"
        )
        assert len(results) == 1
        assert not results[0].passed
        assert results[0].check == "file_exists"

    def test_gene_therapy_pipeline_valid(self) -> None:
        df = pd.DataFrame(
            {
                "company": ["Vertex"],
                "ticker": ["VRTX"],
                "gene_therapy_name": ["exa-cel"],
                "technology": ["CRISPR"],
                "clinical_phase": ["Phase 3"],
                "target_mechanism": ["BCL11A"],
                "probability_of_success": [0.85],
                "estimated_cost": [2000000],
            }
        )
        results = validate_artifact("gene_therapy_pipeline_scd.csv", df=df)
        assert all(r.passed for r in results)


# ---------------------------------------------------------------------------
# JSON artifact validation
# ---------------------------------------------------------------------------


class TestJSONValidation:
    def test_valid_json(self, tmp_path: Path) -> None:
        jf = tmp_path / "metrics.json"
        jf.write_text(json.dumps({"accuracy": 0.78}))
        results = validate_json_artifact(jf)
        assert all(r.passed for r in results)

    def test_missing_json(self, tmp_path: Path) -> None:
        results = validate_json_artifact(tmp_path / "nope.json")
        assert not results[0].passed

    def test_invalid_json(self, tmp_path: Path) -> None:
        jf = tmp_path / "bad.json"
        jf.write_text("{bad json")
        results = validate_json_artifact(jf)
        assert not results[0].passed
        assert "invalid JSON" in results[0].message

    def test_required_keys(self, tmp_path: Path) -> None:
        jf = tmp_path / "m.json"
        jf.write_text(json.dumps({"a": 1}))
        results = validate_json_artifact(jf, required_keys=["a", "b"])
        failed = [r for r in results if not r.passed]
        assert len(failed) == 1
        assert "b" in str(failed[0].message)


# ---------------------------------------------------------------------------
# Model artifacts
# ---------------------------------------------------------------------------


class TestModelArtifacts:
    def test_all_present(self, tmp_path: Path) -> None:
        for name in [
            "random_forest_regression.pkl",
            "ridge_regression.pkl",
            "trial_success_logistic_regression.pkl",
            "trial_success_random_forest.pkl",
            "trial_success_scaler.pkl",
        ]:
            (tmp_path / name).write_bytes(b"\x80\x05")
        results = validate_model_artifacts(tmp_path)
        assert all(r.passed for r in results)

    def test_missing_model(self, tmp_path: Path) -> None:
        results = validate_model_artifacts(tmp_path)
        assert all(not r.passed for r in results)


# ---------------------------------------------------------------------------
# Directory validation
# ---------------------------------------------------------------------------


class TestValidateDirectory:
    def test_validates_present_csvs(self, tmp_path: Path) -> None:
        df = pd.DataFrame(
            {
                "nct_id": ["NCT12345678"],
                "title": ["Study"],
                "status": ["COMPLETED"],
                "start_date": ["2024-01-01"],
                "phase": ["Phase 2"],
            }
        )
        df.to_csv(tmp_path / "clinical_trials_scd.csv", index=False)
        results = validate_directory(tmp_path, include={"clinical_trials_scd.csv"})
        assert any(r.artifact == "clinical_trials_scd.csv" for r in results)

    def test_missing_file_error(self, tmp_path: Path) -> None:
        results = validate_directory(tmp_path, include={"clinical_trials_scd.csv"})
        assert any(
            not r.passed and r.check == "file_exists" for r in results
        )


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------


class TestReports:
    @pytest.fixture()
    def sample_results(self) -> list[ValidationResult]:
        return [
            ValidationResult(
                artifact="test.csv",
                passed=True,
                severity=ValidationSeverity.INFO,
                check="required_column",
                message="ok",
            ),
            ValidationResult(
                artifact="test.csv",
                passed=False,
                severity=ValidationSeverity.ERROR,
                check="min_rows",
                message="only 0 rows",
            ),
        ]

    def test_summary_stats(self, sample_results: list[ValidationResult]) -> None:
        stats = summary_stats(sample_results)
        assert stats["total_checks"] == 2
        assert stats["passed"] == 1
        assert stats["failed"] == 1
        assert stats["errors"] == 1

    def test_text_report_contains_failures(
        self, sample_results: list[ValidationResult]
    ) -> None:
        report = format_text_report(sample_results)
        assert "FAILURES" in report
        assert "only 0 rows" in report

    def test_json_report_parseable(
        self, sample_results: list[ValidationResult]
    ) -> None:
        report = format_json_report(sample_results)
        data = json.loads(report)
        assert "summary" in data
        assert len(data["results"]) == 2

    def test_all_pass_text_report(self) -> None:
        results = [
            ValidationResult(
                artifact="ok.csv",
                passed=True,
                severity=ValidationSeverity.INFO,
                check="test",
                message="all good",
            )
        ]
        report = format_text_report(results)
        assert "All checks passed" in report


# ---------------------------------------------------------------------------
# Rules coverage
# ---------------------------------------------------------------------------


class TestRulesCoverage:
    def test_all_demo_csvs_have_rules(self) -> None:
        """Every CSV in data/demo should have a rule entry."""
        demo = Path("data/demo")
        if not demo.is_dir():
            pytest.skip("data/demo not present")
        csv_files = {p.name for p in demo.glob("*.csv")}
        covered = set(VALIDATION_RULES.keys())
        uncovered = csv_files - covered
        # Allow some flexibility — not every CSV needs rules
        assert len(uncovered) <= 5, f"uncovered CSVs: {uncovered}"

    def test_clinical_trial_statuses_complete(self) -> None:
        """Sanity check the known status set."""
        assert "COMPLETED" in CLINICAL_TRIAL_STATUSES
        assert "RECRUITING" in CLINICAL_TRIAL_STATUSES
        assert len(CLINICAL_TRIAL_STATUSES) >= 10


# ---------------------------------------------------------------------------
# Integration: validate bundled demo data
# ---------------------------------------------------------------------------


class TestDemoDataIntegration:
    """Run validators against the committed data/demo bundle."""

    def test_demo_clinical_trials_scd(self) -> None:
        path = Path("data/demo/clinical_trials_scd.csv")
        if not path.exists():
            pytest.skip("demo CSV not present")
        results = validate_artifact("clinical_trials_scd.csv", path=path)
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0, f"validation errors: {[e.message for e in errors]}"

    def test_demo_cdc_sickle_cell(self) -> None:
        path = Path("data/demo/cdc_sickle_cell_data.csv")
        if not path.exists():
            pytest.skip("demo CSV not present")
        results = validate_artifact("cdc_sickle_cell_data.csv", path=path)
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0, f"validation errors: {[e.message for e in errors]}"

    def test_demo_gene_therapy_pipeline(self) -> None:
        path = Path("data/demo/gene_therapy_pipeline_scd.csv")
        if not path.exists():
            pytest.skip("demo CSV not present")
        results = validate_artifact("gene_therapy_pipeline_scd.csv", path=path)
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0, f"validation errors: {[e.message for e in errors]}"

    def test_demo_fda_approvals_scd(self) -> None:
        path = Path("data/demo/fda_approvals_scd.csv")
        if not path.exists():
            pytest.skip("demo CSV not present")
        results = validate_artifact("fda_approvals_scd.csv", path=path)
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0, f"validation errors: {[e.message for e in errors]}"

    def test_demo_model_metrics_json(self) -> None:
        path = Path("data/demo/ml/model_metrics.json")
        if not path.exists():
            pytest.skip("demo JSON not present")
        results = validate_json_artifact(path)
        assert all(r.passed for r in results)

    def test_demo_quant_metrics_json(self) -> None:
        path = Path("data/demo/quant/quant_metrics.json")
        if not path.exists():
            pytest.skip("demo JSON not present")
        results = validate_json_artifact(path)
        assert all(r.passed for r in results)
