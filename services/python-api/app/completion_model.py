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

    @field_validator("condition", "interventions")
    @classmethod
    def _clean_items(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        if any(len(item) > 300 for item in cleaned):
            raise ValueError("list items must be at most 300 characters")
        return cleaned


class CompletionPrediction(BaseModel):
    model_id: str
    model_version: str
    artifact_sha256: str
    probability_completed: float = Field(ge=0.0, le=1.0)
    calibrated: bool
    calibration_method: str
    export_gate_passed: bool
    featurizer_version: str
    disclaimer: str


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

    def predict(self, trial: TrialFeaturesInput, version: str | None = None) -> CompletionPrediction:
        import numpy as np

        model = self.load(version)
        row = np.asarray([cf.model_row(trial.model_dump())], dtype=object)
        probability = float(model.estimator.predict_proba(row)[0, 1])
        gate = model.entry["holdout_metrics"]["export_gate"]
        return CompletionPrediction(
            model_id=str(self.manifest["model_id"]),
            model_version=model.version,
            artifact_sha256=str(model.entry["artifact_sha256"]),
            probability_completed=probability,
            calibrated=bool(model.entry.get("calibration")),
            calibration_method=str(model.entry.get("calibration") or "none"),
            export_gate_passed=bool(gate["passes"]),
            featurizer_version=cf.FEATURIZER_VERSION,
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
            "evaluated_not_served": {
                key: value.get("holdout_metrics")
                for key, value in (self.manifest.get("evaluated_not_served") or {}).items()
            },
            "disclaimer": self.manifest["disclaimer"],
            "limitations": [
                "Current registry snapshot, not point-in-time feature reconstruction.",
                "Condition-query cohort is not a population sampling frame.",
                "Temporal holdout is right-censored: recent trials only carry a label "
                "if they already finished or stopped.",
                "No external validation cohort.",
            ],
        }


@lru_cache
def get_completion_registry() -> CompletionRegistry:
    return CompletionRegistry(get_settings().completion_registry_dir)
