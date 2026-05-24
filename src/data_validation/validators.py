"""
Core validation engine.

Runs declarative rules from ``rules.py`` against DataFrames or on-disk CSVs
and produces structured ``ValidationResult`` objects.
"""

from __future__ import annotations

import enum
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


class ValidationSeverity(enum.Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationResult:
    artifact: str
    passed: bool
    severity: ValidationSeverity
    check: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "artifact": self.artifact,
            "passed": self.passed,
            "severity": self.severity.value,
            "check": self.check,
            "message": self.message,
            "details": self.details,
        }


# ---------------------------------------------------------------------------
# Individual check runners
# ---------------------------------------------------------------------------


def _check_required_columns(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col in rules.get("required_columns", []):
        found = col in df.columns
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=found,
                severity=ValidationSeverity.ERROR,
                check="required_column",
                message=f"required column '{col}' present" if found else f"missing required column '{col}'",
                details={"column": col},
            )
        )
    return results


def _check_unique_columns(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col in rules.get("unique_columns", []):
        if col not in df.columns:
            continue
        dup_count = df[col].dropna().duplicated().sum()
        passed = dup_count == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.ERROR,
                check="unique_column",
                message=(
                    f"column '{col}' values are unique"
                    if passed
                    else f"column '{col}' has {dup_count} duplicate value(s)"
                ),
                details={"column": col, "duplicate_count": int(dup_count)},
            )
        )
    return results


def _check_non_null_columns(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col in rules.get("non_null_columns", []):
        if col not in df.columns:
            continue
        null_count = int(df[col].isna().sum())
        passed = null_count == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.ERROR if null_count > 0 else ValidationSeverity.INFO,
                check="non_null",
                message=(
                    f"column '{col}' has no nulls"
                    if passed
                    else f"column '{col}' has {null_count} null value(s)"
                ),
                details={"column": col, "null_count": null_count},
            )
        )
    return results


def _check_numeric_ranges(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col, (lo, hi) in rules.get("numeric_ranges", {}).items():
        if col not in df.columns:
            continue
        numeric = pd.to_numeric(df[col], errors="coerce")
        violations: list[str] = []
        if lo is not None:
            below = numeric[numeric < lo].dropna()
            if not below.empty:
                violations.append(f"{len(below)} value(s) below {lo}")
        if hi is not None:
            above = numeric[numeric > hi].dropna()
            if not above.empty:
                violations.append(f"{len(above)} value(s) above {hi}")
        passed = len(violations) == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.ERROR if not passed else ValidationSeverity.INFO,
                check="numeric_range",
                message=(
                    f"column '{col}' values within [{lo}, {hi}]"
                    if passed
                    else f"column '{col}' out of range [{lo}, {hi}]: {'; '.join(violations)}"
                ),
                details={"column": col, "min": lo, "max": hi},
            )
        )
    return results


def _check_allowed_values(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col, allowed in rules.get("allowed_values", {}).items():
        if col not in df.columns:
            continue
        invalid = set(df[col].dropna().unique()) - set(allowed)
        passed = len(invalid) == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.WARNING if not passed else ValidationSeverity.INFO,
                check="allowed_values",
                message=(
                    f"column '{col}' values are all valid"
                    if passed
                    else f"column '{col}' has {len(invalid)} unexpected value(s): {sorted(invalid)[:5]}"
                ),
                details={"column": col, "invalid_values": sorted(invalid)[:10]},
            )
        )
    return results


def _check_date_columns(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for col in rules.get("date_columns", []):
        if col not in df.columns:
            continue
        parsed = pd.to_datetime(df[col], errors="coerce")
        unparsed = int(df[col].notna().sum() - parsed.notna().sum())
        passed = unparsed == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.WARNING if not passed else ValidationSeverity.INFO,
                check="date_format",
                message=(
                    f"column '{col}' dates are parseable"
                    if passed
                    else f"column '{col}' has {unparsed} unparseable date value(s)"
                ),
                details={"column": col, "unparseable_count": unparsed},
            )
        )
    return results


def _check_min_rows(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    min_rows = rules.get("min_rows", 0)
    if min_rows <= 0:
        return []
    passed = len(df) >= min_rows
    return [
        ValidationResult(
            artifact=artifact,
            passed=passed,
            severity=ValidationSeverity.ERROR if not passed else ValidationSeverity.INFO,
            check="min_rows",
            message=(
                f"has {len(df)} row(s) (>= {min_rows})"
                if passed
                else f"only {len(df)} row(s), expected >= {min_rows}"
            ),
            details={"actual": len(df), "minimum": min_rows},
        )
    ]


def _check_custom(
    df: pd.DataFrame, artifact: str, rules: dict[str, Any]
) -> list[ValidationResult]:
    results: list[ValidationResult] = []
    for description, checker in rules.get("custom", []):
        errors = checker(df)
        passed = len(errors) == 0
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=passed,
                severity=ValidationSeverity.WARNING if not passed else ValidationSeverity.INFO,
                check=f"custom:{description}",
                message=description if passed else f"{description}: {'; '.join(errors)}",
                details={"errors": errors},
            )
        )
    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_CHECK_FNS = [
    _check_required_columns,
    _check_unique_columns,
    _check_non_null_columns,
    _check_numeric_ranges,
    _check_allowed_values,
    _check_date_columns,
    _check_min_rows,
    _check_custom,
]


def validate_artifact(
    artifact: str,
    df: pd.DataFrame | None = None,
    path: Path | str | None = None,
    rules: dict[str, Any] | None = None,
) -> list[ValidationResult]:
    """
    Validate a single artifact against its rules.

    Provide either *df* directly or *path* to read the CSV from disk.
    If *rules* is ``None`` the default rule set from ``rules.py`` is used.
    """
    from src.data_validation.rules import VALIDATION_RULES

    if rules is None:
        rules = VALIDATION_RULES.get(artifact, {})
    if not rules:
        return [
            ValidationResult(
                artifact=artifact,
                passed=True,
                severity=ValidationSeverity.INFO,
                check="no_rules",
                message="no validation rules defined — skipped",
            )
        ]

    if df is None and path is not None:
        path = Path(path)
        if not path.exists():
            return [
                ValidationResult(
                    artifact=artifact,
                    passed=False,
                    severity=ValidationSeverity.ERROR,
                    check="file_exists",
                    message=f"file not found: {path}",
                )
            ]
        df = pd.read_csv(path)

    if df is None:
        return [
            ValidationResult(
                artifact=artifact,
                passed=False,
                severity=ValidationSeverity.ERROR,
                check="no_data",
                message="no DataFrame or path provided",
            )
        ]

    results: list[ValidationResult] = []
    for fn in _CHECK_FNS:
        results.extend(fn(df, artifact, rules))
    return results


def validate_directory(
    data_dir: str | Path,
    *,
    include: set[str] | None = None,
) -> list[ValidationResult]:
    """
    Validate all recognised CSV artifacts found under *data_dir*.

    If *include* is given, only validate artifacts whose filenames are in the set.
    """
    from src.data_validation.rules import VALIDATION_RULES

    data_dir = Path(data_dir)
    results: list[ValidationResult] = []
    for artifact in sorted(VALIDATION_RULES):
        if include and artifact not in include:
            continue
        path = data_dir / artifact
        results.extend(validate_artifact(artifact, path=path))
    return results


def validate_json_artifact(
    path: str | Path,
    required_keys: list[str] | None = None,
) -> list[ValidationResult]:
    """Validate a JSON artifact (e.g. model_metrics.json, quant_metrics.json)."""
    path = Path(path)
    artifact = path.name
    if not path.exists():
        return [
            ValidationResult(
                artifact=artifact,
                passed=False,
                severity=ValidationSeverity.ERROR,
                check="file_exists",
                message=f"JSON file not found: {path}",
            )
        ]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [
            ValidationResult(
                artifact=artifact,
                passed=False,
                severity=ValidationSeverity.ERROR,
                check="json_parse",
                message=f"invalid JSON: {exc}",
            )
        ]

    results: list[ValidationResult] = []
    if required_keys:
        if isinstance(data, dict):
            missing = [k for k in required_keys if k not in data]
            passed = len(missing) == 0
            results.append(
                ValidationResult(
                    artifact=artifact,
                    passed=passed,
                    severity=ValidationSeverity.ERROR if not passed else ValidationSeverity.INFO,
                    check="json_keys",
                    message=(
                        "all required keys present"
                        if passed
                        else f"missing keys: {missing}"
                    ),
                    details={"missing_keys": missing},
                )
            )
        else:
            results.append(
                ValidationResult(
                    artifact=artifact,
                    passed=False,
                    severity=ValidationSeverity.WARNING,
                    check="json_keys",
                    message="JSON root is not an object; cannot check keys",
                )
            )
    else:
        results.append(
            ValidationResult(
                artifact=artifact,
                passed=True,
                severity=ValidationSeverity.INFO,
                check="json_parse",
                message="valid JSON",
            )
        )
    return results


def validate_model_artifacts(models_dir: str | Path) -> list[ValidationResult]:
    """Check that expected pickled model files exist and are non-empty."""
    models_dir = Path(models_dir)
    expected = [
        "random_forest_regression.pkl",
        "ridge_regression.pkl",
        "trial_success_logistic_regression.pkl",
        "trial_success_random_forest.pkl",
        "trial_success_scaler.pkl",
    ]
    results: list[ValidationResult] = []
    for name in expected:
        p = models_dir / name
        exists = p.exists() and p.stat().st_size > 0
        results.append(
            ValidationResult(
                artifact=name,
                passed=exists,
                severity=ValidationSeverity.ERROR if not exists else ValidationSeverity.INFO,
                check="model_file",
                message=(
                    f"model file present ({p.stat().st_size:,} bytes)"
                    if exists
                    else f"model file missing or empty: {p}"
                ),
            )
        )
    return results


def validate_all(
    data_raw: str | Path = "data/raw",
    data_demo: str | Path = "data/demo",
    data_processed: str | Path = "data/processed",
    data_models: str | Path = "data/models",
) -> list[ValidationResult]:
    """
    Run the full validation suite across all data directories.

    Validates:
      1. data/raw CSVs (or data/demo as fallback)
      2. ML training CSVs and metrics JSON
      3. Quant output CSVs and metrics JSON
      4. Pickled model files
    """
    data_raw = Path(data_raw)
    data_demo = Path(data_demo)
    data_processed = Path(data_processed)
    data_models = Path(data_models)
    results: list[ValidationResult] = []

    # Primary CSV artifacts — prefer data/raw, fall back to data/demo.
    # After real-data transition, data/demo may not exist; skip legacy artifact checks.
    if data_raw.is_dir() and any(data_raw.glob("*.csv")):
        csv_dir = data_raw
        results.extend(validate_directory(csv_dir))
    elif data_demo.is_dir() and any(data_demo.glob("*.csv")):
        csv_dir = data_demo
        results.extend(validate_directory(csv_dir))

    # ML artifacts (separate rule set, separate directory)
    from src.data_validation.rules import ML_VALIDATION_RULES

    ml_dir = data_processed if data_processed.is_dir() else data_demo / "ml"
    for artifact, rules in ML_VALIDATION_RULES.items():
        results.extend(validate_artifact(artifact, path=ml_dir / artifact, rules=rules))

    for jf in ["model_metrics.json"]:
        results.extend(validate_json_artifact(ml_dir / jf))

    # Quant artifacts (separate rule set, separate directory)
    from src.data_validation.rules import QUANT_VALIDATION_RULES

    quant_dir = data_processed / "quant" if (data_processed / "quant").is_dir() else data_demo / "quant"
    for artifact, rules in QUANT_VALIDATION_RULES.items():
        results.extend(validate_artifact(artifact, path=quant_dir / artifact, rules=rules))

    for jf in ["quant_metrics.json"]:
        results.extend(validate_json_artifact(quant_dir / jf))

    # Model pickle files
    models_source = data_models if data_models.is_dir() else data_demo / "models"
    results.extend(validate_model_artifacts(models_source))

    return results
