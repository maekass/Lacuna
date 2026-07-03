"""Fetch ClinicalTrials.gov v2 studies for offline training (no API key required)."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import httpx

from lacuna_ct.constants import (
    NEGATIVE_CONDITION_QUERIES,
    WH_CONDITION_QUERIES,
)

CTG_BASE = "https://clinicaltrials.gov/api/v2/studies"
DEFAULT_PAGE_SIZE = 100
REQUEST_DELAY_S = 0.35
USER_AGENT = "Lacuna-ML-Research/1.0 (educational; mps5cy@virginia.edu)"


@dataclass
class TrialRecord:
    nct_id: str
    title: str
    phase: str
    status: str
    condition: str
    sponsor: str
    enrollment: int
    interventions: str
    label_wh: int
    label_terminated: int | None
    source_query: str

    def text_corpus(self) -> str:
        return " ".join(
            [
                self.title,
                self.condition,
                self.interventions,
                self.sponsor,
            ]
        ).strip()


def _parse_study(study: dict[str, Any]) -> dict[str, Any]:
    protocol = study.get("protocolSection") or {}
    status = protocol.get("statusModule") or {}
    identification = protocol.get("identificationModule") or {}
    sponsor = protocol.get("sponsorCollaboratorsModule") or {}
    design = protocol.get("designModule") or {}
    arms = protocol.get("armsInterventionsModule") or {}

    interventions = [
        item.get("name", "")
        for item in (arms.get("interventions") or [])
        if item.get("name")
    ]

    phases = design.get("phases") or ["Not Applicable"]
    phase = phases[0] if phases else "Not Applicable"

    return {
        "nct_id": identification.get("nctId", ""),
        "title": identification.get("briefTitle", ""),
        "phase": phase,
        "status": status.get("overallStatus", "Unknown"),
        "condition": ", ".join(
            protocol.get("conditionsModule", {}).get("conditions") or []
        ),
        "sponsor": (sponsor.get("leadSponsor") or {}).get("name", "Unknown"),
        "enrollment": (design.get("enrollmentInfo") or {}).get("count") or 0,
        "interventions": ", ".join(interventions),
    }


def _termination_label(status: str) -> int | None:
    normalized = status.upper().replace(" ", "_")
    if normalized in {"TERMINATED", "WITHDRAWN", "SUSPENDED"}:
        return 1
    if normalized in {
        "COMPLETED",
        "RECRUITING",
        "ACTIVE_NOT_RECRUITING",
        "ENROLLING_BY_INVITATION",
        "NOT_YET_RECRUITING",
    }:
        return 0
    return None


def fetch_studies_for_condition(
    client: httpx.Client,
    condition: str,
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    params = {
        "query.cond": condition,
        "pageSize": str(page_size),
        "sort": "LastUpdatePostDate:desc",
    }
    response = client.get(
        CTG_BASE,
        params=params,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    payload = response.json()
    return [_parse_study(s) for s in payload.get("studies") or []]


def build_training_records(
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
    use_network: bool = True,
) -> list[TrialRecord]:
    if not use_network:
        return load_seed_records()

    records: list[TrialRecord] = []
    seen: set[str] = set()

    with httpx.Client(timeout=30.0) as client:
        for query in WH_CONDITION_QUERIES:
            for row in fetch_studies_for_condition(client, query, page_size=page_size):
                nct = row["nct_id"]
                if not nct or nct in seen:
                    continue
                seen.add(nct)
                records.append(
                    TrialRecord(
                        **row,
                        label_wh=1,
                        label_terminated=_termination_label(row["status"]),
                        source_query=query,
                    )
                )
            time.sleep(REQUEST_DELAY_S)

        for query in NEGATIVE_CONDITION_QUERIES:
            for row in fetch_studies_for_condition(client, query, page_size=page_size):
                nct = row["nct_id"]
                if not nct or nct in seen:
                    continue
                seen.add(nct)
                records.append(
                    TrialRecord(
                        **row,
                        label_wh=0,
                        label_terminated=_termination_label(row["status"]),
                        source_query=query,
                    )
                )
            time.sleep(REQUEST_DELAY_S)

    return records


def load_seed_records() -> list[TrialRecord]:
    seed_path = Path(__file__).resolve().parents[1] / "data" / "training_seed.json"
    if not seed_path.exists():
        raise FileNotFoundError(f"Missing offline seed: {seed_path}")
    raw = json.loads(seed_path.read_text(encoding="utf-8"))
    return [TrialRecord(**item) for item in raw]


def save_records(records: list[TrialRecord], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([asdict(r) for r in records], indent=2),
        encoding="utf-8",
    )
