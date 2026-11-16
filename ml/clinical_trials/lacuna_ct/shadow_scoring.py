"""Join realized CT.gov outcomes onto logged shadow predictions and score them.

Only the first logged prediction per (nct_id, model_version) is scored, so
re-logging a trial cannot improve its own score. A prediction counts as
resolved once the trial's current overall status is terminal.
"""

from __future__ import annotations

import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Mapping, Sequence

import numpy as np
from sklearn.metrics import roc_auc_score

from lacuna_ct.decision_metrics import decision_metrics
from lacuna_ct.labels import label_completed
from lacuna_ct.shadow_log import BUCKETS

MIN_RESOLVED_PER_CLASS = 20
CAVEAT = (
    "Early resolutions are biased toward fast outcomes (quick withdrawals, short trials). "
    "Treat shadow metrics as provisional until most logged trials have had time to finish."
)


def fetch_current_status(
    nct_ids: Sequence[str], *, batch_size: int = 200, delay_s: float = 0.4
) -> dict[str, dict[str, Any]]:
    import httpx

    from lacuna_ct.fetch_training_data import CTG_BASE, USER_AGENT

    out: dict[str, dict[str, Any]] = {}
    ids = sorted({i for i in nct_ids if i})
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        for start in range(0, len(ids), batch_size):
            batch = ids[start : start + batch_size]
            response = client.get(
                CTG_BASE,
                params={
                    "filter.ids": ",".join(batch),
                    "fields": "NCTId,OverallStatus,LastUpdatePostDate",
                    "pageSize": "1000",
                },
                headers={"Accept": "application/json", "User-Agent": USER_AGENT},
            )
            response.raise_for_status()
            for study in response.json().get("studies") or []:
                proto = study.get("protocolSection") or {}
                nct = (proto.get("identificationModule") or {}).get("nctId")
                status = proto.get("statusModule") or {}
                if nct:
                    out[nct] = {
                        "overall_status": status.get("overallStatus"),
                        "last_update_post_date": (status.get("lastUpdatePostDateStruct") or {}).get("date"),
                    }
            time.sleep(delay_s)
    return out


def first_predictions(records: Iterable[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    first: dict[tuple[str, str], Mapping[str, Any]] = {}
    for r in records:
        if not r.get("nct_id"):
            continue
        key = (str(r["nct_id"]), str(r["model_version"]))
        if key not in first or str(r["predicted_at"]) < str(first[key]["predicted_at"]):
            first[key] = r
    return sorted(first.values(), key=lambda r: (str(r["model_version"]), str(r["nct_id"])))


def score(
    records: Sequence[Mapping[str, Any]],
    outcomes: Mapping[str, Mapping[str, Any]],
    *,
    k_fractions: Sequence[float] = (0.05, 0.1, 0.2),
    n_boot: int = 1000,
    now: Callable[[], str] = lambda: datetime.now(timezone.utc).isoformat(),
) -> dict[str, Any]:
    firsts = first_predictions(records)
    by_version: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for r in firsts:
        by_version[str(r["model_version"])].append(r)
    report: dict[str, Any] = {
        "schema": "lacuna-completion-shadow-score-v1",
        "scored_at_utc": now(),
        "log_records": len(records),
        "log_records_without_nct_id": sum(1 for r in records if not r.get("nct_id")),
        "scored_unit": "first logged prediction per (nct_id, model_version)",
        "caveat": CAVEAT,
        "versions": {},
    }
    for version, rows in sorted(by_version.items()):
        labels = []
        for r in rows:
            status = (outcomes.get(str(r["nct_id"])) or {}).get("overall_status")
            labels.append(label_completed(status) if status else None)
        resolved = [(r, y) for r, y in zip(rows, labels) if y is not None]
        buckets: dict[str, Counter] = {b: Counter() for b in BUCKETS}
        for r, y in zip(rows, labels):
            c = buckets[str(r["rank_bucket"])]
            c["logged"] += 1
            if y is not None:
                c["resolved"] += 1
                c["stopped"] += 1 - y
        entry: dict[str, Any] = {
            "predictions": len(rows),
            "outcome_found": sum(1 for r in rows if str(r["nct_id"]) in outcomes),
            "resolved": len(resolved),
            "resolved_class_counts": {
                "completed": sum(y for _, y in resolved),
                "stopped": sum(1 - y for _, y in resolved),
            },
            "by_rank_bucket": {
                b: {
                    **dict(c),
                    "stop_rate_among_resolved": (c["stopped"] / c["resolved"]) if c["resolved"] else None,
                }
                for b, c in buckets.items()
            },
        }
        reviewed = [(r, y) for r, y in zip(rows, labels) if r.get("reviewer_decision")]
        entry["reviewer"] = {
            "with_decision": len(reviewed),
            "overrides": sum(1 for r, _ in reviewed if r.get("reviewer_override")),
            "resolved_with_decision": sum(1 for _, y in reviewed if y is not None),
        }
        n_stop = entry["resolved_class_counts"]["stopped"]
        n_comp = entry["resolved_class_counts"]["completed"]
        if min(n_stop, n_comp) >= MIN_RESOLVED_PER_CLASS:
            y = np.asarray([y for _, y in resolved])
            p = np.asarray([float(r["probability_completed"]) for r, _ in resolved])
            ids = [str(r["nct_id"]) for r, _ in resolved]
            entry["metrics_on_resolved"] = {
                "roc_auc": float(roc_auc_score(y, p)),
                "brier": float(np.mean(np.square(p - y))),
                "decision": decision_metrics(y, p, ids, k_fractions=k_fractions, n_boot=n_boot),
            }
        else:
            entry["metrics_on_resolved"] = None
            entry["metrics_note"] = (
                f"needs >= {MIN_RESOLVED_PER_CLASS} resolved trials per class "
                f"(have {n_comp} completed, {n_stop} stopped)"
            )
        report["versions"][version] = entry
    return report
