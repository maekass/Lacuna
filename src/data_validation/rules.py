"""
Declarative validation rules for every registered data artifact.

Each rule set maps an artifact filename to a dict containing:
  - required_columns: columns that must exist
  - unique_columns: columns whose values must be unique (no duplicates)
  - non_null_columns: columns that must not contain NaN/None
  - numeric_ranges: {col: (min, max)} — inclusive bounds, None means unbounded
  - allowed_values: {col: set(...)} — column values must be in the set
  - date_columns: columns expected to be parseable as dates
  - min_rows: minimum number of data rows
  - custom: list of (description, callable(df) -> list[str]) for ad-hoc checks
"""

from __future__ import annotations

from typing import Any

CLINICAL_TRIAL_STATUSES = {
    "RECRUITING",
    "COMPLETED",
    "ACTIVE_NOT_RECRUITING",
    "NOT_YET_RECRUITING",
    "TERMINATED",
    "WITHDRAWN",
    "SUSPENDED",
    "ENROLLING_BY_INVITATION",
    "UNKNOWN",
    "AVAILABLE",
    "NO_LONGER_AVAILABLE",
    "TEMPORARILY_NOT_AVAILABLE",
    "APPROVED_FOR_MARKETING",
    "WITHHELD",
}

CLINICAL_TRIAL_PHASES = {
    "",
    "Phase 1",
    "Phase 2",
    "Phase 3",
    "Phase 4",
    "Phase 1; Phase 2",
    "Phase 2; Phase 3",
    "Early Phase 1",
    "Not Applicable",
}


def _check_nct_id_format(df: "pd.DataFrame") -> list[str]:
    """NCT IDs should match the pattern NCTxxxxxxxx."""
    errors: list[str] = []
    if "nct_id" not in df.columns:
        return errors
    bad = df[~df["nct_id"].astype(str).str.match(r"^NCT\d{5,}$", na=False)]
    if not bad.empty:
        samples = bad["nct_id"].head(3).tolist()
        errors.append(f"malformed nct_id values (expected NCTxxxxxxxx): {samples}")
    return errors


def _check_probability_range(df: "pd.DataFrame") -> list[str]:
    """probability_of_success should be between 0 and 1."""
    errors: list[str] = []
    col = "probability_of_success"
    if col not in df.columns:
        return errors
    import pandas as pd

    numeric = pd.to_numeric(df[col], errors="coerce")
    out_of_range = numeric[(numeric < 0) | (numeric > 1)].dropna()
    if not out_of_range.empty:
        errors.append(
            f"{col} has {len(out_of_range)} values outside [0, 1]: "
            f"min={out_of_range.min()}, max={out_of_range.max()}"
        )
    return errors


def _check_positive_numeric(col_name: str) -> "callable":
    """Return a checker that verifies a numeric column has only positive values."""

    def _check(df: "pd.DataFrame") -> list[str]:
        import pandas as pd

        errors: list[str] = []
        if col_name not in df.columns:
            return errors
        numeric = pd.to_numeric(df[col_name], errors="coerce")
        negatives = numeric[numeric < 0].dropna()
        if not negatives.empty:
            errors.append(
                f"{col_name} has {len(negatives)} negative values (min={negatives.min()})"
            )
        return errors

    _check.__doc__ = f"{col_name} must be non-negative"
    return _check


def _check_no_duplicate_rows(df: "pd.DataFrame") -> list[str]:
    """Flag fully duplicated rows."""
    errors: list[str] = []
    dups = df.duplicated()
    n = dups.sum()
    if n > 0:
        errors.append(f"{n} fully duplicated row(s)")
    return errors


def _check_null_ratio(col_name: str, max_ratio: float = 0.5) -> "callable":
    """Return a checker that flags columns with too many nulls."""

    def _check(df: "pd.DataFrame") -> list[str]:
        errors: list[str] = []
        if col_name not in df.columns:
            return errors
        ratio = df[col_name].isna().mean()
        if ratio > max_ratio:
            errors.append(
                f"{col_name} has {ratio:.0%} null values (threshold: {max_ratio:.0%})"
            )
        return errors

    _check.__doc__ = f"{col_name} null ratio must be <= {max_ratio:.0%}"
    return _check


# ---------------------------------------------------------------------------
# Per-artifact rule definitions
# ---------------------------------------------------------------------------

_TRIALS_RULES: dict[str, Any] = {
    "required_columns": ["nct_id", "title", "status", "start_date", "phase"],
    "unique_columns": ["nct_id"],
    "non_null_columns": ["nct_id", "title", "status"],
    "allowed_values": {"status": CLINICAL_TRIAL_STATUSES},
    "date_columns": ["start_date"],
    "min_rows": 1,
    "custom": [
        ("NCT ID format", _check_nct_id_format),
        ("No duplicate rows", _check_no_duplicate_rows),
    ],
}

_FDA_RULES: dict[str, Any] = {
    "required_columns": ["drug_name", "company", "approval_date", "mechanism", "phase", "efficacy"],
    "non_null_columns": ["drug_name", "company"],
    "date_columns": ["approval_date"],
    "min_rows": 1,
    "custom": [
        ("No duplicate rows", _check_no_duplicate_rows),
    ],
}

_EPI_RULES: dict[str, Any] = {
    "required_columns": ["date", "prevalence_us", "clinical_trials_active", "new_treatments_approved"],
    "non_null_columns": ["date"],
    "date_columns": ["date"],
    "numeric_ranges": {
        "prevalence_us": (0, None),
        "clinical_trials_active": (0, None),
        "new_treatments_approved": (0, None),
    },
    "min_rows": 1,
    "custom": [
        ("No duplicate rows", _check_no_duplicate_rows),
    ],
}

_PIPELINE_RULES: dict[str, Any] = {
    "required_columns": [
        "company", "ticker", "clinical_phase", "target_mechanism",
        "probability_of_success", "estimated_cost",
    ],
    "non_null_columns": ["company"],
    "numeric_ranges": {
        "probability_of_success": (0, 1),
        "estimated_cost": (0, None),
    },
    "min_rows": 1,
    "custom": [
        ("Probability range", _check_probability_range),
        ("No duplicate rows", _check_no_duplicate_rows),
    ],
}


VALIDATION_RULES: dict[str, dict[str, Any]] = {
    # --- SCD ---
    "cdc_sickle_cell_data.csv": {
        "required_columns": [
            "date", "scd_births_per_1000", "scd_prevalence_us",
            "new_treatments_approved", "clinical_trials_active",
        ],
        "non_null_columns": ["date"],
        "date_columns": ["date"],
        "numeric_ranges": {
            "scd_births_per_1000": (0, 100),
            "scd_prevalence_us": (0, None),
            "new_treatments_approved": (0, None),
            "clinical_trials_active": (0, None),
        },
        "min_rows": 1,
        "custom": [
            ("No duplicate rows", _check_no_duplicate_rows),
            ("scd_births_per_1000 positive", _check_positive_numeric("scd_births_per_1000")),
        ],
    },
    "clinical_trials_scd.csv": _TRIALS_RULES,
    "fda_approvals_scd.csv": _FDA_RULES,
    "gene_therapy_pipeline_scd.csv": {
        "required_columns": [
            "company", "ticker", "gene_therapy_name", "technology",
            "clinical_phase", "target_mechanism",
            "probability_of_success", "estimated_cost",
        ],
        "non_null_columns": ["company", "ticker", "gene_therapy_name"],
        "numeric_ranges": {
            "probability_of_success": (0, 1),
            "estimated_cost": (0, None),
        },
        "min_rows": 1,
        "custom": [
            ("Probability range", _check_probability_range),
            ("No duplicate rows", _check_no_duplicate_rows),
        ],
    },
    "stock_prices_companies.csv": {
        "required_columns": [],
        "min_rows": 4,
        "custom": [
            ("No duplicate rows", _check_no_duplicate_rows),
        ],
    },
    "stock_prices_etfs.csv": {
        "required_columns": [],
        "min_rows": 4,
        "custom": [
            ("No duplicate rows", _check_no_duplicate_rows),
        ],
    },
    "company_financials.csv": {
        "required_columns": ["company", "ticker"],
        "non_null_columns": ["company", "ticker"],
        "min_rows": 1,
        "custom": [
            ("No duplicate rows", _check_no_duplicate_rows),
        ],
    },
    # --- SLE ---
    "clinical_trials_sle.csv": _TRIALS_RULES,
    "fda_approvals_sle.csv": _FDA_RULES,
    "epidemiology_sle.csv": _EPI_RULES,
    "pipeline_sle.csv": _PIPELINE_RULES,
    # --- Sarcoidosis ---
    "clinical_trials_sarc.csv": _TRIALS_RULES,
    "fda_approvals_sarc.csv": _FDA_RULES,
    "epidemiology_sarc.csv": _EPI_RULES,
    "pipeline_sarc.csv": _PIPELINE_RULES,
    # --- Illustrative / stage analysis ---
    "vc_deals_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "growth_equity_deals_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "public_equity_companies_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "stage_returns_analysis.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "market_size_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "investment_attractiveness_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "competitive_landscape_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "deal_flow_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "regulatory_landscape_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "large_pharma_investments_scd.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "precision_medicine_pipeline.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
}

# ML training / metrics CSVs (live in data/processed or data/demo/ml)
ML_VALIDATION_RULES: dict[str, dict[str, Any]] = {
    "model_comparison.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "regression_training.csv": {
        "required_columns": [],
        "min_rows": 10,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "trial_success_training.csv": {
        "required_columns": [],
        "min_rows": 10,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
}

# Quant pipeline CSVs (live in data/processed/quant or data/demo/quant)
QUANT_VALIDATION_RULES: dict[str, dict[str, Any]] = {
    "backtest_metrics.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "efficient_frontier.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "factor_model_betas.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "portfolio_weights.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [
            ("No duplicate rows", _check_no_duplicate_rows),
        ],
    },
    "walk_forward_summary.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "walk_forward_folds.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "walk_forward_oos_curve.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "walk_forward_compounded_summary.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
    "monte_carlo_fan.csv": {
        "required_columns": [],
        "min_rows": 1,
        "custom": [("No duplicate rows", _check_no_duplicate_rows)],
    },
}
