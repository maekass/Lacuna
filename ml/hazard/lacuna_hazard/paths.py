"""Repo-relative paths for the hazard pipeline."""

from __future__ import annotations

from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
HAZARD_ROOT = PACKAGE_DIR.parent
REPO_ROOT = HAZARD_ROOT.parent.parent

DATASET_RELPATH = Path("src/data/dataset.verified.json")
ARTIFACT_RELPATH = Path("src/data/ml/hazard/acquisition-time-v1.json")


def repo_root() -> Path:
    """Return the Lacuna repository root (two levels above `lacuna_hazard`)."""
    return REPO_ROOT


def dataset_path(root: Path | None = None) -> Path:
    """Path to the verified JSON catalog."""
    return (root or repo_root()) / DATASET_RELPATH


def artifact_path(root: Path | None = None) -> Path:
    """Path to the committed TypeScript-consumed artifact."""
    return (root or repo_root()) / ARTIFACT_RELPATH
