"""Append-only shadow-mode prediction log for the completion-proxy model.

Dependency-free on purpose. An identical copy lives at
``services/python-api/app/shadow_log.py``; a unit test fails if they diverge.

Format: JSON Lines, one prediction per line. Each record carries
``prev_sha256`` (sha256 of the previous line's bytes, or 64 zeros for the
first line) and ``record_sha256`` (sha256 of the canonical JSON of the record
without that field), so edits, deletions and reordering are detectable with
``verify_log``. Writers only ever open the file in append mode.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

SCHEMA = "lacuna-completion-shadow-v1"
GENESIS = "0" * 64
BUCKETS = ("top_5pct", "top_10pct", "top_20pct", "below_top_20pct")
REVIEWER_DECISIONS = ("review", "no_review")


class ShadowLogError(Exception):
    """The log failed integrity verification."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def rank_bucket(risk_stopped: float, thresholds: Mapping[str, float]) -> str:
    """Map stop risk to the holdout-derived top-k% bucket (tightest first)."""
    for name in BUCKETS[:-1]:
        cut = thresholds.get(name)
        if cut is not None and risk_stopped >= float(cut):
            return name
    return BUCKETS[-1]


def flagged_for_review(bucket: str, primary: str = "top_10pct") -> bool:
    order = list(BUCKETS)
    return order.index(bucket) <= order.index(primary)


def _canonical(record: Mapping[str, Any]) -> bytes:
    return json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def _last_line(path: Path) -> bytes | None:
    if not path.exists() or path.stat().st_size == 0:
        return None
    size = path.stat().st_size
    with path.open("rb") as handle:
        window = min(size, 1 << 16)
        handle.seek(size - window)
        chunk = handle.read(window).rstrip(b"\n")
        if b"\n" not in chunk and window < size:  # a single very long line
            handle.seek(0)
            chunk = handle.read().rstrip(b"\n")
    return chunk.rsplit(b"\n", 1)[-1]


def make_record(
    *,
    nct_id: str | None,
    model_id: str,
    model_version: str,
    artifact_sha256: str,
    probability_completed: float,
    rank_bucket: str,
    source: str,
    predicted_at: str | None = None,
    reviewer_decision: str | None = None,
    extra: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    if rank_bucket not in BUCKETS:
        raise ValueError(f"unknown rank bucket {rank_bucket!r}")
    if reviewer_decision is not None and reviewer_decision not in REVIEWER_DECISIONS:
        raise ValueError(f"unknown reviewer decision {reviewer_decision!r}")
    flagged = flagged_for_review(rank_bucket)
    record: dict[str, Any] = {
        "schema": SCHEMA,
        "nct_id": nct_id,
        "predicted_at": predicted_at or utc_now(),
        "model_id": model_id,
        "model_version": model_version,
        "artifact_sha256": artifact_sha256,
        "probability_completed": float(probability_completed),
        "risk_stopped": float(1.0 - probability_completed),
        "rank_bucket": rank_bucket,
        "model_flags_for_review": flagged,
        "reviewer_decision": reviewer_decision,
        "reviewer_override": (
            None if reviewer_decision is None else (reviewer_decision == "review") != flagged
        ),
        "source": source,
    }
    if extra:
        record["extra"] = dict(extra)
    return record


def append_record(path: Path, record: Mapping[str, Any]) -> dict[str, Any]:
    """Append one record (hash-chained). Never rewrites existing bytes."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        try:
            import fcntl

            fcntl.flock(fd, fcntl.LOCK_EX)
        except ImportError:  # pragma: no cover - non-POSIX
            pass
        last = _last_line(path)
        body = {k: v for k, v in record.items() if k not in ("prev_sha256", "record_sha256")}
        body["prev_sha256"] = hashlib.sha256(last).hexdigest() if last else GENESIS
        body["record_sha256"] = hashlib.sha256(_canonical(body)).hexdigest()
        os.write(fd, _canonical(body) + b"\n")
        return body
    finally:
        os.close(fd)


def append_records(path: Path, records: Iterable[Mapping[str, Any]]) -> int:
    count = 0
    for record in records:
        append_record(path, record)
        count += 1
    return count


def read_log(path: Path, *, verify: bool = True) -> list[dict[str, Any]]:
    path = Path(path)
    if not path.exists():
        return []
    records: list[dict[str, Any]] = []
    prev = GENESIS
    for number, raw in enumerate(path.read_bytes().splitlines(), start=1):
        if not raw.strip():
            raise ShadowLogError(f"line {number}: blank line")
        try:
            record = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ShadowLogError(f"line {number}: invalid JSON") from exc
        if verify:
            if record.get("prev_sha256") != prev:
                raise ShadowLogError(f"line {number}: hash chain broken (edited, removed or reordered)")
            body = {k: v for k, v in record.items() if k != "record_sha256"}
            if hashlib.sha256(_canonical(body)).hexdigest() != record.get("record_sha256"):
                raise ShadowLogError(f"line {number}: record hash mismatch (edited)")
            if raw != _canonical(record):
                raise ShadowLogError(f"line {number}: non-canonical serialization")
        prev = hashlib.sha256(raw).hexdigest()
        records.append(record)
    return records


def verify_log(path: Path) -> int:
    """Return the number of verified records; raise ``ShadowLogError`` if tampered."""
    return len(read_log(path, verify=True))
