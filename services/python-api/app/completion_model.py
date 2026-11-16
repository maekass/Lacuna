"""Versioned model registry + inference for the completion-proxy classifier.

The registry directory contains ``manifest.json`` and one sub-directory per
served version. Artifacts are loaded only after their SHA-256 matches the
manifest and the installed scikit-learn minor version matches the version the
artifact was trained with (joblib pickles are not portable across minors).
"""

from __future__ import annotations

import hashlib
import json
import threading
from dataclasses import dataclass
from functools import lru_cache
from importlib import metadata
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app import completion_features as cf
from app import shadow_log
from app.config import get_settings


class RegistryError(Exception):
    """Registry is missing, malformed, or failed an integrity check (HTTP 503)."""


class UnknownVersionError(Exception):
    """Requested model version is not in the manifest (HTTP 404)."""


Phase = Literal[
    "EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA", "NOT_APPLICABLE"
]
StudyType = Literal["INTERVENTIONAL", "OBSERVATIONAL", "EXPANDED_ACCESS"]


class TrialFeaturesInput(BaseModel):
    """Registration-time design fields only.

    Unknown fields are rejected so outcome-bearing fields (status, actual
    enrollment, results, completion dates) cannot be smuggled in.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=500)
    condition: list[str] = Field(default_factory=list, max_length=50)
    interventions: list[str] = Field(default_factory=list, max_length=50)
    sponsor: str = Field(default="", max_length=300)
    phase: Phase = "NA"
    study_type: StudyType = "INTERVENTIONAL"
    # Not model inputs: identify the trial and record the human decision in
    # the shadow log. They never reach the featurizer.
    nct_id: str | None = Field(default=None, pattern=r"^NCT\d{8}$")
    reviewer_decision: Literal["review", "no_review"] | None = Field(
        default=None,
        description="Optional human triage decision, logged with the prediction. "
        "reviewer_override in the response is true when it disagrees with the model flag.",
    )

    @field_validator("condition", "interventions")
    @classmethod
    def _clean_items(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        if any(len(item) > 300 for item in cleaned):
            raise ValueError("list items must be at most 300 characters")
        return cleaned


NON_FEATURE_FIELDS = frozenset({"nct_id", "reviewer_decision"})


class FeatureContribution(BaseModel):
    feature: str
    kind: Literal["text_term", "numeric"]
    value: float
    contribution_logit: float
    direction: Literal["toward_completed", "toward_stopped"]


class CompletionPrediction(BaseModel):
    model_id: str
    model_version: str
    artifact_sha256: str
    probability_completed: float = Field(ge=0.0, le=1.0)
    risk_stopped: float = Field(ge=0.0, le=1.0)
    rank_bucket: str
    model_flags_for_review: bool
    calibrated: bool
    calibration_method: str
    export_gate_passed: bool
    export_gate_version: str
    featurizer_version: str
    top_features: list[FeatureContribution]
    explanation_method: str
    nct_id: str | None = None
    reviewer_decision: str | None = None
    reviewer_override: bool | None = None
    shadow_logged: bool
    disclaimer: str


def explain_logistic(estimator: Any, row: Any, top_n: int = 5) -> tuple[list[FeatureContribution], str]:
    """Per-feature logit contributions of the uncalibrated logistic pipeline.

    Platt scaling is a monotone map of the logistic decision function, so the
    sign and ranking of contributions carry over to the calibrated probability.
    Numeric contributions are relative to the training mean (standardized).
    """
    try:
        pipe = estimator.calibrated_classifiers_[0].estimator.estimator
        features = pipe.named_steps["features"]
        clf = pipe.named_steps["clf"]
        coef = clf.coef_.ravel()
    except (AttributeError, KeyError, IndexError):
        return [], "unavailable for this model family"
    import numpy as np

    z = features.transform(row)
    z = z.toarray().ravel() if hasattr(z, "toarray") else np.asarray(z).ravel()
    names = list(features.get_feature_names_out())
    numeric_names = list(cf.NUMERIC_FEATURE_NAMES)
    raw_numeric = [float(v) for v in row[0][1:]]
    items: list[FeatureContribution] = []
    n_text = len(names) - len(numeric_names)
    for idx, name in enumerate(names):
        contribution = float(coef[idx] * z[idx])
        if contribution == 0.0:
            continue
        if idx < n_text:
            label, kind, value = name.split("__", 1)[-1], "text_term", float(z[idx])
        else:
            pos = idx - n_text
            label, kind, value = numeric_names[pos], "numeric", raw_numeric[pos]
        items.append(
            FeatureContribution(
                feature=label,
                kind=kind,  # type: ignore[arg-type]
                value=value,
                contribution_logit=contribution,
                direction="toward_completed" if contribution > 0 else "toward_stopped",
            )
        )
    items.sort(key=lambda c: abs(c.contribution_logit), reverse=True)
    return items[:top_n], "logistic logit contributions (coef x transformed value), pre-calibration"


@dataclass
class LoadedModel:
    version: str
    entry: dict[str, Any]
    estimator: Any


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _minor(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split(".")[:2])


class CompletionRegistry:
    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        self._lock = threading.Lock()
        self._loaded: dict[str, LoadedModel] = {}
        manifest_path = self.root / "manifest.json"
        if not manifest_path.is_file():
            raise RegistryError(f"model registry manifest not found at {manifest_path}")
        try:
            self.manifest: dict[str, Any] = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RegistryError("model registry manifest is not valid JSON") from exc
        for key in ("model_id", "champion", "versions", "sklearn_version", "disclaimer"):
            if key not in self.manifest:
                raise RegistryError(f"model registry manifest missing '{key}'")
        if self.manifest["featurizer_version"] != cf.FEATURIZER_VERSION:
            raise RegistryError(
                "featurizer version mismatch: manifest "
                f"{self.manifest['featurizer_version']} vs service {cf.FEATURIZER_VERSION}"
            )

    @property
    def champion(self) -> str:
        return str(self.manifest["champion"])

    @property
    def versions(self) -> list[str]:
        return sorted(self.manifest["versions"])

    def resolve(self, version: str | None) -> str:
        resolved = version or self.champion
        if resolved not in self.manifest["versions"]:
            raise UnknownVersionError(resolved)
        return resolved

    def load(self, version: str | None = None) -> LoadedModel:
        resolved = self.resolve(version)
        with self._lock:
            if resolved in self._loaded:
                return self._loaded[resolved]
            entry = self.manifest["versions"][resolved]
            artifact = (self.root / entry["artifact"]).resolve()
            if self.root.resolve() not in artifact.parents or not artifact.is_file():
                raise RegistryError(f"artifact for {resolved} is missing")
            if _sha256(artifact) != entry["artifact_sha256"]:
                raise RegistryError(f"artifact sha256 mismatch for {resolved}")
            installed = metadata.version("scikit-learn")
            if _minor(installed) != _minor(str(self.manifest["sklearn_version"])):
                raise RegistryError(
                    f"scikit-learn {installed} cannot load artifact trained with "
                    f"{self.manifest['sklearn_version']}"
                )
            import joblib  # deferred so the rest of the API starts without it

            loaded = LoadedModel(resolved, entry, joblib.load(artifact))
            self._loaded[resolved] = loaded
            return loaded

    def predict(
        self,
        trial: TrialFeaturesInput,
        version: str | None = None,
        *,
        shadow_log_path: Path | None = None,
    ) -> CompletionPrediction:
        import numpy as np

        model = self.load(version)
        features = {k: v for k, v in trial.model_dump().items() if k not in NON_FEATURE_FIELDS}
        row = np.asarray([cf.model_row(features)], dtype=object)
        probability = float(model.estimator.predict_proba(row)[0, 1])
        gate = model.entry["holdout_metrics"]["export_gate"]
        thresholds = model.entry.get("rank_thresholds_risk") or {}
        bucket = shadow_log.rank_bucket(1.0 - probability, thresholds)
        top, method = explain_logistic(model.estimator, row)
        record = shadow_log.make_record(
            nct_id=trial.nct_id,
            model_id=str(self.manifest["model_id"]),
            model_version=model.version,
            artifact_sha256=str(model.entry["artifact_sha256"]),
            probability_completed=probability,
            rank_bucket=bucket,
            source="api",
            reviewer_decision=trial.reviewer_decision,
        )
        logged = False
        if shadow_log_path is not None:
            try:
                shadow_log.append_record(shadow_log_path, record)
                logged = True
            except OSError:
                logged = False  # read-only filesystem etc.; prediction still returned
        return CompletionPrediction(
            model_id=str(self.manifest["model_id"]),
            model_version=model.version,
            artifact_sha256=str(model.entry["artifact_sha256"]),
            probability_completed=probability,
            risk_stopped=1.0 - probability,
            rank_bucket=bucket,
            model_flags_for_review=bool(record["model_flags_for_review"]),
            calibrated=bool(model.entry.get("calibration")),
            calibration_method=str(model.entry.get("calibration") or "none"),
            export_gate_passed=bool(gate["passes"]),
            export_gate_version=str(gate.get("gate_version", "legacy")),
            featurizer_version=cf.FEATURIZER_VERSION,
            top_features=top,
            explanation_method=method,
            nct_id=trial.nct_id,
            reviewer_decision=trial.reviewer_decision,
            reviewer_override=record["reviewer_override"],
            shadow_logged=logged,
            disclaimer=str(self.manifest["disclaimer"]),
        )

    def model_card(self, version: str | None = None) -> dict[str, Any]:
        resolved = self.resolve(version)
        entry = self.manifest["versions"][resolved]
        return {
            "model_id": self.manifest["model_id"],
            "model_version": resolved,
            "champion_version": self.champion,
            "available_versions": self.versions,
            "task": self.manifest.get("task"),
            "positive_label": self.manifest.get("positive_label"),
            "negative_labels": self.manifest.get("negative_labels"),
            "model_family": entry.get("model_family"),
            "calibration_method": entry.get("calibration"),
            "artifact_sha256": entry.get("artifact_sha256"),
            "trained_at_utc": self.manifest.get("trained_at_utc"),
            "training_snapshot_sha256": self.manifest.get("training_snapshot_sha256"),
            "sklearn_version": self.manifest.get("sklearn_version"),
            "featurizer_version": self.manifest.get("featurizer_version"),
            "input_features": {
                "text": ["title", "condition", "interventions", "sponsor"],
                "numeric": self.manifest.get("numeric_feature_names"),
            },
            "excluded_fields": cf.EXCLUDED_FIELDS,
            "split": self.manifest.get("split"),
            "holdout_metrics": entry.get("holdout_metrics"),
            "promotion": self.manifest.get("promotion"),
            "decision_tool": self.manifest.get("decision_tool"),
            "decision_metrics": entry.get("decision_metrics"),
            "rank_thresholds_risk": entry.get("rank_thresholds_risk"),
            "request_only_fields": {
                "nct_id": "optional NCT id; logged with the prediction, never a model input",
                "reviewer_decision": "optional 'review' | 'no_review'; logged with the prediction",
            },
            "evaluated_not_served": {
                key: value.get("holdout_metrics")
                for key, value in (self.manifest.get("evaluated_not_served") or {}).items()
            },
            "disclaimer": self.manifest["disclaimer"],
            "limitations": [
                "The served v3 model uses current-registry design fields; point-in-time "
                "features were evaluated in the v4 candidate (see decision_evaluation.json).",
                "Condition-query cohort is not a population sampling frame.",
                "Temporal holdout is right-censored: recent trials only carry a label "
                "if they already finished or stopped.",
                "External check uses other condition queries from the same registry, "
                "not an independent data source.",
            ],
        }


@lru_cache
def get_completion_registry() -> CompletionRegistry:
    return CompletionRegistry(get_settings().completion_registry_dir)
