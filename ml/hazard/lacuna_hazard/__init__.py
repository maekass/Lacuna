"""Offline acquisition-time hazard package. Not imported by the Next.js app."""

from __future__ import annotations

__version__ = "0.1.0"

from lacuna_hazard.claims import ALLOWED_CLAIMS, FORBIDDEN_CLAIMS
from lacuna_hazard.cohort import build_cohort
from lacuna_hazard.cox import fit_cox_ph
from lacuna_hazard.export import ARTIFACT_RELPATH, build_artifact, dump_artifact
from lacuna_hazard.pipeline import PHASES, run_phases

__all__ = [
    "ALLOWED_CLAIMS",
    "ARTIFACT_RELPATH",
    "FORBIDDEN_CLAIMS",
    "PHASES",
    "__version__",
    "build_artifact",
    "build_cohort",
    "dump_artifact",
    "fit_cox_ph",
    "run_phases",
]
