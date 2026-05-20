"""
Data validation framework for the Immunology Investment Intelligence Platform.

Provides reusable validators, rule definitions, and report generation for
CSV artifacts, ML model outputs, and quant pipeline results.
"""

from src.data_validation.validators import (
    ValidationResult,
    ValidationSeverity,
    validate_all,
    validate_artifact,
)
from src.data_validation.rules import ML_VALIDATION_RULES, QUANT_VALIDATION_RULES, VALIDATION_RULES

__all__ = [
    "ML_VALIDATION_RULES",
    "QUANT_VALIDATION_RULES",
    "VALIDATION_RULES",
    "ValidationResult",
    "ValidationSeverity",
    "validate_all",
    "validate_artifact",
]
