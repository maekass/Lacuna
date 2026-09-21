"""Build and serialize the TypeScript-consumed hazard artifact."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import numpy as np

from lacuna_hazard.claims import (
    ALLOWED_CLAIMS,
    CLAIM_CLASS,
    DISCLAIMER,
    FORBIDDEN_CLAIMS,
)
from lacuna_hazard.cohort import Cohort
from lacuna_hazard.concordance import concordance_index
from lacuna_hazard.cox import CoxFit, breslow_baseline, linear_predictor
from lacuna_hazard.features import (
    FEATURE_NAMES,
    MIN_EVENTS_OVERALL,
    MIN_EVENTS_PER_FEATURE,
)
from lacuna_hazard.nelson_aalen import nelson_aalen
from lacuna_hazard.paths import ARTIFACT_RELPATH, artifact_path

ARTIFACT_ID = "acquisition-time-v1"
MODEL_TYPE = "cox_ph_breslow"
TASK = "time_to_verified_acquisition"
SCHEMA_VERSION = "1.0.0"


def _round_floats(value: Any, ndigits: int = 12) -> Any:
    if isinstance(value, float):
        if not np.isfinite(value):
            return None
        return round(value, ndigits)
    if isinstance(value, np.floating):
        f = float(value)
        if not np.isfinite(f):
            return None
        return round(f, ndigits)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, dict):
        return {k: _round_floats(v, ndigits) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_round_floats(v, ndigits) for v in value]
    return value


def dataset_sha256(raw: bytes) -> str:
    """Hex digest of the verified dataset file bytes."""
    return hashlib.sha256(raw).hexdigest()


def sufficiency(cohort: Cohort, fit: CoxFit) -> dict[str, Any]:
    fits = cohort.n_events >= MIN_EVENTS_OVERALL
    reason = None
    if not fits:
        reason = (
            f"Only {cohort.n_events} events; need at least "
            f"{MIN_EVENTS_OVERALL} to report a baseline hazard."
        )
    elif not fit.converged:
        fits = False
        reason = "Cox Newton steps did not converge."
    return {
        "minEvents": MIN_EVENTS_OVERALL,
        "minEventsPerCoefficient": MIN_EVENTS_PER_FEATURE,
        "fits": fits,
        "reason": reason,
    }


def build_artifact(
    *,
    cohort: Cohort,
    fit: CoxFit,
    dataset_hash: str,
    X: np.ndarray,
    time: np.ndarray,
    event: np.ndarray,
    fitted_at: str | None = None,
) -> dict[str, Any]:
    """Assemble the portable artifact consumed by `src/lib/scoring/hazard.ts`."""
    included = cohort.included
    lp = linear_predictor(X, fit, FEATURE_NAMES) if included else np.zeros(0)
    c_index = concordance_index(lp, time, event) if included else None
    times, cumhaz, surv = (
        breslow_baseline(X, time, event, fit, FEATURE_NAMES)
        if included
        else ([], [], [])
    )
    na = nelson_aalen(time, event) if included else nelson_aalen(
        np.zeros(0),
        np.zeros(0, dtype=int),
    )
    fitted = fitted_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    coeff = [float(x) for x in fit.coefficients]
    hrs = [float(x) for x in fit.hazard_ratios]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "id": ARTIFACT_ID,
        "modelType": MODEL_TYPE,
        "task": TASK,
        "claimClass": CLAIM_CLASS,
        "fittedAt": fitted,
        "datasetVersion": cohort.dataset_version,
        "datasetSha256": dataset_hash,
        "disclaimer": DISCLAIMER,
        "allowedClaims": list(ALLOWED_CLAIMS),
        "forbiddenClaims": list(FORBIDDEN_CLAIMS),
        "cohort": {
            "n": cohort.n,
            "nEvents": cohort.n_events,
            "nCensored": cohort.n_censored,
            "nCompanies": cohort.n_companies,
            "excludedMissingFounded": cohort.n_missing_founded,
            "excludedNonpositiveTime": cohort.n_nonpositive_time,
            "excludedMissingSector": cohort.n_missing_sector,
            "timeUnit": "years_from_founded_jan1",
            "censorDate": cohort.censor_date,
            "notes": list(cohort.notes),
        },
        "featureNames": list(FEATURE_NAMES),
        "keptFeatureNames": list(fit.feature_names),
        "droppedFeatureNames": list(fit.dropped_features),
        "coefficients": coeff,
        "hazardRatios": hrs,
        "baseline": {
            "estimator": "breslow",
            "times": times,
            "cumulativeHazard": cumhaz,
            "survival": surv,
        },
        "nelsonAalen": {
            "times": list(na.times),
            "cumulativeHazard": list(na.cumulative_hazard),
            "nRisk": list(na.n_risk),
            "nEvents": list(na.n_events),
        },
        "metrics": {
            "concordance": c_index,
            "n": fit.n,
            "nEvents": fit.n_events,
            "logPartialLikelihood": fit.log_partial_likelihood,
            "nIter": fit.n_iter,
            "converged": fit.converged,
        },
        "sufficiency": sufficiency(cohort, fit),
        "fitNotes": list(fit.notes),
    }


def dump_artifact(artifact: Mapping[str, Any], path: Path | None = None) -> Path:
    """Write pretty, finite JSON for the TypeScript consumer."""
    dest = path or artifact_path()
    dest.parent.mkdir(parents=True, exist_ok=True)
    payload = _round_floats(dict(artifact))
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest


def load_artifact(path: Path | None = None) -> dict[str, Any]:
    """Read a previously exported artifact."""
    dest = path or artifact_path()
    return json.loads(dest.read_text(encoding="utf-8"))


def artifacts_equivalent(left: Mapping[str, Any], right: Mapping[str, Any]) -> bool:
    """Compare artifacts ignoring fittedAt timestamps."""
    a = {k: v for k, v in left.items() if k != "fittedAt"}
    b = {k: v for k, v in right.items() if k != "fittedAt"}
    return _round_floats(a) == _round_floats(b)


__all__ = [
    "ARTIFACT_RELPATH",
    "artifacts_equivalent",
    "build_artifact",
    "dataset_sha256",
    "dump_artifact",
    "load_artifact",
]
