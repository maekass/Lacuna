"""Single source of truth for language this package may and may not use."""

from __future__ import annotations

from typing import Final

CLAIM_CLASS: Final[str] = "descriptive"

ALLOWED_CLAIMS: Final[tuple[str, ...]] = (
    "Breslow / Nelson–Aalen baseline of time to a verified acquisition in this curated sample.",
    "No sector dummy covariates; the design matrix is empty.",
    "Not a forecast of future M&A and not an acquisition probability.",
    "Missing founded year is exclusion, not imputation.",
    "Current stage is unused because acquired labels leak the event.",
)

FORBIDDEN_CLAIMS: Final[tuple[str, ...]] = (
    "predicts which company will be acquired",
    "statistically validated predictor",
    "acquisition probability",
    "forecast of future M&A",
    "investment advice",
    "keyword-derived risk score",
    "PitchBook multiple",
    "invented TAM",
    "invented SAM",
)

# Phrases that must not appear as product claims on hazard surfaces.
# The lists above are scanned with an allowlist so this file does not fail itself.
FORBIDDEN_CLAIM_PATTERNS: Final[tuple[str, ...]] = (
    r"\bwill be acquired\b",
    r"\bacquisition probability\b",
    r"\bstatistically validated predictor\b",
    r"\bforecast(?:s|ing)? future M&A\b",
    r"\binvestment advice\b",
    r"\bkeyword-derived risk\b",
    r"\binvented TAM\b",
    r"\binvented SAM\b",
    r"\bPitchBook multiple\b",
)

HAZARD_SURFACE_GLOBS: Final[tuple[str, ...]] = (
    "ml/hazard/**/*.py",
    "ml/hazard/**/*.md",
    "scripts/run_hazard.py",
    "scripts/check_claim_consistency.py",
    "src/lib/scoring/hazard.ts",
    "src/lib/scoring/hazard.test.ts",
    "src/data/ml/hazard/**/*.json",
    "docs/HAZARD.md",
    ".github/workflows/hazard.yml",
)

DISCLAIMER: Final[str] = (
    "Descriptive time-to-acquisition baseline on Lacuna's curated verified catalog. "
    "Not a forecast, not an acquisition probability, not investment advice."
)
