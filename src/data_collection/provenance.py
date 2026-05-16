"""
Per-pull provenance: source URL, query string, UTC timestamp, parser version.
Persisted to data/raw/provenance_log.jsonl (append-only audit trail).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlparse, urlunparse


@dataclass
class PullRecord:
    """One HTTP/API or synthetic data-generation event that produced an artifact."""

    artifact: str
    source_url: str
    query_string: str
    pulled_at_utc: str
    pull_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    row_count: int | None = None
    parser_version: str = ""
    extractor: str = ""
    http_status: int | None = None
    kind: str = "sourced_public"  # illustrative | sourced_public | sourced_public_delayed
    notes: str = ""

    @classmethod
    def now(
        cls,
        *,
        artifact: str,
        source_url: str,
        params: dict[str, Any] | None = None,
        row_count: int | None = None,
        parser_version: str = "",
        extractor: str = "",
        http_status: int | None = None,
        kind: str = "sourced_public",
        notes: str = "",
    ) -> PullRecord:
        qs = urlencode({k: v for k, v in (params or {}).items() if v is not None})
        return cls(
            artifact=artifact,
            source_url=source_url,
            query_string=qs,
            pulled_at_utc=datetime.now(timezone.utc).isoformat(),
            row_count=row_count,
            parser_version=parser_version,
            extractor=extractor,
            http_status=http_status,
            kind=kind,
            notes=notes,
        )

    def full_url(self) -> str:
        if not self.query_string:
            return self.source_url
        parsed = urlparse(self.source_url)
        return urlunparse(parsed._replace(query=self.query_string))

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["full_url"] = self.full_url()
        return d


class ProvenanceStore:
    """Append pull records to provenance_log.jsonl under the data directory."""

    LOG_NAME = "provenance_log.jsonl"

    def __init__(self, data_dir: str | Path):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.log_path = self.data_dir / self.LOG_NAME

    def record(self, pull: PullRecord) -> Path:
        line = json.dumps(pull.to_dict(), ensure_ascii=False)
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
        return self.log_path

    def load_all(self) -> list[dict[str, Any]]:
        if not self.log_path.is_file():
            return []
        rows: list[dict[str, Any]] = []
        for line in self.log_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
        return rows

    def latest_for_artifact(self, artifact: str) -> dict[str, Any] | None:
        matches = [r for r in self.load_all() if r.get("artifact") == artifact]
        return matches[-1] if matches else None

    def summary_by_artifact(self) -> dict[str, dict[str, Any]]:
        """Most recent pull per artifact filename."""
        out: dict[str, dict[str, Any]] = {}
        for row in self.load_all():
            art = row.get("artifact")
            if art:
                out[art] = row
        return out
