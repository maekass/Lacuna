"""Named phases for `scripts/run_hazard.py`."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import numpy as np

from lacuna_hazard.cohort import Cohort, build_cohort
from lacuna_hazard.cox import CoxFit, fit_cox_ph
from lacuna_hazard.export import (
    artifacts_equivalent,
    build_artifact,
    dataset_sha256,
    dump_artifact,
    load_artifact,
)
from lacuna_hazard.features import FEATURE_NAMES
from lacuna_hazard.paths import artifact_path, dataset_path, repo_root

PHASES: tuple[str, ...] = (
    "ingest",
    "cohort",
    "fit",
    "export",
    "claims",
    "selfcheck",
)

DEPENDENCIES: dict[str, tuple[str, ...]] = {
    "ingest": (),
    "cohort": ("ingest",),
    "fit": ("ingest", "cohort"),
    "export": ("ingest", "cohort", "fit"),
    "claims": (),
    "selfcheck": (),
}


@dataclass
class PipelineState:
    root: Path
    dataset_bytes: bytes | None = None
    dataset: dict[str, Any] | None = None
    dataset_hash: str | None = None
    cohort: Cohort | None = None
    X: np.ndarray | None = None
    time: np.ndarray | None = None
    event: np.ndarray | None = None
    fit: CoxFit | None = None
    artifact: dict[str, Any] | None = None
    artifact_path: Path | None = None
    check: bool = False
    messages: list[str] = field(default_factory=list)

    def log(self, message: str) -> None:
        self.messages.append(message)
        print(message)


def _pythonpath(root: Path) -> dict[str, str]:
    env = os.environ.copy()
    hazard = str(root / "ml" / "hazard")
    existing = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = hazard if not existing else f"{hazard}{os.pathsep}{existing}"
    return env


def phase_ingest(state: PipelineState) -> None:
    path = dataset_path(state.root)
    raw = path.read_bytes()
    state.dataset_bytes = raw
    state.dataset = json.loads(raw.decode("utf-8"))
    state.dataset_hash = dataset_sha256(raw)
    n_co = len(state.dataset.get("companies") or [])
    n_deals = len(state.dataset.get("acquisitions") or [])
    state.log(f"ingest: {path} companies={n_co} acquisitions={n_deals}")


def phase_cohort(state: PipelineState) -> None:
    if state.dataset is None:
        raise RuntimeError("ingest must run before cohort")
    state.cohort = build_cohort(state.dataset)
    included = state.cohort.included
    state.X = (
        np.asarray([list(r.features) for r in included], dtype=float)
        if included
        else np.zeros((0, len(FEATURE_NAMES)))
    )
    state.time = np.asarray([r.time_years for r in included], dtype=float)
    state.event = np.asarray([r.event for r in included], dtype=int)
    state.log(
        "cohort: n={n} events={e} censored={c} excluded_founded={m}".format(
            n=state.cohort.n,
            e=state.cohort.n_events,
            c=state.cohort.n_censored,
            m=state.cohort.n_missing_founded,
        )
    )


def phase_fit(state: PipelineState) -> None:
    if state.cohort is None or state.X is None or state.time is None or state.event is None:
        raise RuntimeError("cohort must run before fit")
    state.fit = fit_cox_ph(state.X, state.time, state.event, FEATURE_NAMES)
    state.log(
        "fit: features={feats} converged={conv} events={e}".format(
            feats=list(state.fit.feature_names),
            conv=state.fit.converged,
            e=state.fit.n_events,
        )
    )


def phase_export(state: PipelineState) -> None:
    if (
        state.cohort is None
        or state.fit is None
        or state.dataset_hash is None
        or state.X is None
        or state.time is None
        or state.event is None
    ):
        raise RuntimeError("fit must run before export")
    artifact = build_artifact(
        cohort=state.cohort,
        fit=state.fit,
        dataset_hash=state.dataset_hash,
        X=state.X,
        time=state.time,
        event=state.event,
    )
    dest = artifact_path(state.root)
    if state.check:
        if not dest.is_file():
            raise SystemExit(f"--check: missing committed artifact {dest}")
        committed = load_artifact(dest)
        if not artifacts_equivalent(committed, artifact):
            raise SystemExit(
                f"--check: {dest} is stale; re-run without --check and commit."
            )
        state.artifact = committed
        state.artifact_path = dest
        state.log(f"export: check passed for {dest}")
        return
    dump_artifact(artifact, dest)
    state.artifact = artifact
    state.artifact_path = dest
    state.log(f"export: wrote {dest}")


def phase_claims(state: PipelineState) -> None:
    script = state.root / "scripts" / "check_claim_consistency.py"
    result = subprocess.run(
        [sys.executable, str(script), "--root", str(state.root)],
        cwd=state.root,
        env=_pythonpath(state.root),
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    state.log("claims: check_claim_consistency.py passed")


def phase_selfcheck(state: PipelineState) -> None:
    tests = state.root / "ml" / "hazard" / "tests"
    result = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(tests), "-v"],
        cwd=state.root,
        env=_pythonpath(state.root),
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    state.log("selfcheck: unittest passed")


PHASE_FNS: dict[str, Callable[[PipelineState], None]] = {
    "ingest": phase_ingest,
    "cohort": phase_cohort,
    "fit": phase_fit,
    "export": phase_export,
    "claims": phase_claims,
    "selfcheck": phase_selfcheck,
}


def expand_phases(phases: list[str]) -> list[str]:
    """Insert dependencies and keep canonical PHASES order."""
    unknown = [p for p in phases if p not in PHASE_FNS]
    if unknown:
        raise ValueError(f"unknown phases: {unknown}; expected one of {list(PHASES)}")
    needed: set[str] = set()
    for name in phases:
        needed.update(DEPENDENCIES[name])
        needed.add(name)
    return [name for name in PHASES if name in needed]


def run_phases(
    phases: list[str] | None = None,
    *,
    root: Path | None = None,
    check: bool = False,
) -> PipelineState:
    """Run pipeline phases in order. Unknown names raise ValueError."""
    selected = expand_phases(list(phases or PHASES))
    state = PipelineState(root=root or repo_root(), check=check)
    for name in selected:
        PHASE_FNS[name](state)
    return state
