"""Triage decision metrics and the pre-registered decision export gate.

The decision is "review the top k% of trials by predicted stop risk"
(risk = 1 - P(COMPLETED)). Positive class for triage is STOPPED.
Thresholds and k are read from ``preregistration/completion-decision-v1.json``;
nothing in this module is tuned on test results.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
from sklearn.metrics import roc_auc_score

from lacuna_ct.benchmark_stats import expected_calibration_error

PREREGISTRATION_PATH = (
    Path(__file__).resolve().parents[1] / "preregistration" / "completion-decision-v1.json"
)


def load_preregistration(path: Path = PREREGISTRATION_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def preregistration_provenance(path: Path = PREREGISTRATION_PATH) -> dict[str, Any]:
    """sha256 + introducing commit for the pre-registration and its addenda."""
    files = sorted(path.parent.glob(path.stem + "*.json"))
    return {"files": [_file_provenance(f) for f in files]}


def _file_provenance(path: Path) -> dict[str, Any]:
    body = path.read_bytes()
    info: dict[str, Any] = {"path": str(path.relative_to(path.parents[3])), "sha256": hashlib.sha256(body).hexdigest()}
    try:
        info["introduced_in_commit"] = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--format=%H %cI", "--", str(path)],
            text=True,
            cwd=path.parent,
        ).strip()
        info["last_modified_in_commit"] = subprocess.check_output(
            ["git", "log", "-1", "--format=%H %cI", "--", str(path)], text=True, cwd=path.parent
        ).strip()
    except Exception:
        pass
    return info


def rank_order(risk: np.ndarray, ids: Sequence[str]) -> np.ndarray:
    """Descending risk, ties broken by ascending id (pre-registered)."""
    return np.asarray(sorted(range(len(risk)), key=lambda i: (-float(risk[i]), str(ids[i]))))


def top_k_size(n: int, k: float) -> int:
    return max(1, int(math.ceil(k * n)))


def top_k_point(stopped: np.ndarray, risk: np.ndarray, ids: Sequence[str], k: float) -> dict[str, float]:
    n = len(stopped)
    m = top_k_size(n, k)
    order = rank_order(risk, ids)
    hits = int(stopped[order[:m]].sum())
    total = int(stopped.sum())
    prevalence = total / n if n else 0.0
    precision = hits / m
    return {
        "k": float(k),
        "n": int(n),
        "reviewed": int(m),
        "stopped_in_reviewed": hits,
        "stopped_total": total,
        "prevalence": float(prevalence),
        "precision_at_k": float(precision),
        "recall_at_k": float(hits / total) if total else 0.0,
        "lift_at_k": float(precision / prevalence) if prevalence else 0.0,
    }


def _fast_top_k(stopped: np.ndarray, risk: np.ndarray, tiebreak: np.ndarray, k: float) -> tuple[float, float, float]:
    n = len(stopped)
    m = top_k_size(n, k)
    order = np.lexsort((tiebreak, -risk))[:m]
    hits = float(stopped[order].sum())
    total = float(stopped.sum())
    prev = total / n
    precision = hits / m
    return precision, (hits / total if total else 0.0), (precision / prev if prev else 0.0)


def decision_metrics(
    y_completed: np.ndarray,
    p_completed: np.ndarray,
    ids: Sequence[str],
    *,
    k_fractions: Sequence[float],
    n_boot: int,
    seed: int = 42,
) -> dict[str, Any]:
    stopped = 1 - np.asarray(y_completed, dtype=int)
    risk = 1.0 - np.asarray(p_completed, dtype=float)
    # integer rank of ids -> vectorized, identical tie-break to rank_order
    tiebreak = np.argsort(np.argsort(np.asarray([str(i) for i in ids])))
    out: dict[str, Any] = {}
    points = {k: top_k_point(stopped, risk, ids, k) for k in k_fractions}
    samples = {k: ([], [], []) for k in k_fractions}
    rng = np.random.default_rng(seed)
    n = len(stopped)
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        if stopped[idx].sum() == 0:
            continue
        # duplicates keep their own tiebreak rank (stable, deterministic)
        for k in k_fractions:
            p, r, lift = _fast_top_k(stopped[idx], risk[idx], tiebreak[idx], k)
            samples[k][0].append(p)
            samples[k][1].append(r)
            samples[k][2].append(lift)
    for k in k_fractions:
        entry = dict(points[k])
        for name, vals in zip(("precision_at_k", "recall_at_k", "lift_at_k"), samples[k]):
            lo, hi = np.percentile(vals, [2.5, 97.5])
            entry[f"{name}_ci_95"] = [float(lo), float(hi)]
        entry["random_review_expectation"] = {
            "precision_at_k": entry["prevalence"],
            "recall_at_k": float(k),
            "lift_at_k": 1.0,
        }
        out[f"top_{int(round(k * 100))}pct"] = entry
    out["bootstrap"] = {"resamples": int(n_boot), "accepted": len(samples[k_fractions[0]][0]), "seed": seed}
    return out


def net_benefit_table(
    y_completed: np.ndarray, p_completed: np.ndarray, thresholds: Sequence[float]
) -> list[dict[str, Any]]:
    stopped = 1 - np.asarray(y_completed, dtype=int)
    risk = 1.0 - np.asarray(p_completed, dtype=float)
    n = len(stopped)
    prev = float(stopped.mean())
    rows = []
    for pt in thresholds:
        flag = risk >= pt
        tp = int(np.sum(flag & (stopped == 1)))
        fp = int(np.sum(flag & (stopped == 0)))
        w = pt / (1 - pt)
        rows.append(
            {
                "threshold_probability": float(pt),
                "flagged": int(flag.sum()),
                "true_positives": tp,
                "false_positives": fp,
                "net_benefit_model": float(tp / n - fp / n * w),
                "net_benefit_review_all": float(prev - (1 - prev) * w),
                "net_benefit_review_none": 0.0,
            }
        )
    return rows


def decision_gate(
    metrics: Mapping[str, Any], decision: Mapping[str, Any], prereg: Mapping[str, Any]
) -> dict[str, Any]:
    """Pre-registered decision gate (replaces accuracy-vs-majority)."""
    th = prereg["export_gate"]["thresholds"]
    primary = decision[f"top_{int(round(prereg['decision']['primary_k'] * 100))}pct"]
    checks = {
        "auc_ci_lower": {
            "value": float(metrics["roc_auc_ci_lower"]),
            "rule": f"> {th['auc_ci_lower_min_exclusive']}",
            "passes": float(metrics["roc_auc_ci_lower"]) > th["auc_ci_lower_min_exclusive"],
        },
        "brier_vs_base_rate": {
            "value": float(metrics["brier"]),
            "rule": f"< base_rate_brier {float(metrics['base_rate_brier']):.6f}",
            "passes": float(metrics["brier"]) < float(metrics["base_rate_brier"]),
        },
        "calibration_ece": {
            "value": float(metrics["expected_calibration_error"]),
            "rule": f"<= {th['ece_max_inclusive']}",
            "passes": float(metrics["expected_calibration_error"]) <= th["ece_max_inclusive"],
        },
        "lift_at_primary_k_ci_lower": {
            "value": float(primary["lift_at_k_ci_95"][0]),
            "rule": f"> {th['lift_at_primary_k_ci_lower_min_exclusive']}",
            "passes": float(primary["lift_at_k_ci_95"][0]) > th["lift_at_primary_k_ci_lower_min_exclusive"],
        },
    }
    failed = [name for name, c in checks.items() if not c["passes"]]
    return {
        "gate_version": prereg["export_gate"]["gate_version"],
        "passes": not failed,
        "reason": "ok" if not failed else "; ".join(f"{n} {checks[n]['value']:.4f} fails {checks[n]['rule']}" for n in failed),
        "checks": checks,
        "failed_checks": failed,
    }


def subgroup_calibration(
    y: np.ndarray, p: np.ndarray, groups: Sequence[str], *, min_n: int
) -> dict[str, Any]:
    out: dict[str, Any] = {}
    groups = np.asarray(groups)
    for g in sorted(set(groups.tolist())):
        mask = groups == g
        n = int(mask.sum())
        entry: dict[str, Any] = {"n": n}
        if n < min_n:
            entry["note"] = f"n < {min_n}; not reported"
            out[str(g)] = entry
            continue
        yg, pg = y[mask], p[mask]
        entry.update(
            {
                "observed_completion_rate": float(yg.mean()),
                "mean_predicted": float(pg.mean()),
                "calibration_in_the_large": float(pg.mean() - yg.mean()),
                "ece": float(expected_calibration_error(yg, pg)),
                "brier": float(np.mean(np.square(pg - yg))),
            }
        )
        if min(int(yg.sum()), int(n - yg.sum())) >= 10:
            entry["roc_auc"] = float(roc_auc_score(yg, pg))
        out[str(g)] = entry
    return out
