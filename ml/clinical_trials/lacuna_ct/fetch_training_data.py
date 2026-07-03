"""Fetch ClinicalTrials.gov v2 studies for offline training (no API key required)."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import httpx

from lacuna_ct.constants import (
    NEGATIVE_CONDITION_QUERIES,
    WH_CONDITION_QUERIES,
)
from lacuna_ct.labels import label_completed, label_terminated

CTG_BASE = "https://clinicaltrials.gov/api/v2/studies"
DEFAULT_PAGE_SIZE = 100
MAX_PAGES_PER_QUERY = 5
REQUEST_DELAY_S = 0.4
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
    has_results: bool = False
    study_type: str = "INTERVENTIONAL"
    label_completed: int | None = None
    start_year: int | None = None
    sponsor_class: str = "other"

    def text_corpus(self) -> str:
        return " ".join(
            [
                self.title,
                self.condition,
                self.interventions,
                self.sponsor,
            ]
        ).strip()

    def as_feature_row(self) -> dict[str, Any]:
        return {
            "phase": self.phase,
            "enrollment": self.enrollment,
            "interventions": self.interventions,
            "has_results": self.has_results,
        }


def _parse_year(date_str: str | None) -> int | None:
    if not date_str or len(date_str) < 4:
        return None
    try:
        return int(date_str[:4])
    except ValueError:
        return None


def _sponsor_class(name: str) -> str:
    lower = name.lower()
    if any(
        token in lower
        for token in ("university", "college", "nih", "hospital", "medical center")
    ):
        return "academic"
    if any(token in lower for token in ("inc", "pharma", "therapeutics", "ltd", "gmbh")):
        return "industry"
    return "other"


def _parse_study(study: dict[str, Any]) -> dict[str, Any]:
    protocol = study.get("protocolSection") or {}
    status_mod = protocol.get("statusModule") or {}
    identification = protocol.get("identificationModule") or {}
    sponsor_mod = protocol.get("sponsorCollaboratorsModule") or {}
    design = protocol.get("designModule") or {}
    arms = protocol.get("armsInterventionsModule") or {}
    results = study.get("resultsSection") or {}

    interventions = [
        item.get("name", "")
        for item in (arms.get("interventions") or [])
        if item.get("name")
    ]

    phases = design.get("phases") or ["Not Applicable"]
    phase = phases[0] if phases else "Not Applicable"
    overall_status = status_mod.get("overallStatus", "Unknown")
    sponsor_name = (sponsor_mod.get("leadSponsor") or {}).get("name", "Unknown")
    start_date = (status_mod.get("startDateStruct") or {}).get("date", "")

    has_results = bool(
        results.get("participantFlowModule")
        or results.get("outcomeMeasuresModule")
        or results.get("adverseEventsModule")
    )

    return {
        "nct_id": identification.get("nctId", ""),
        "title": identification.get("briefTitle", ""),
        "phase": phase,
        "status": overall_status,
        "condition": ", ".join(
            protocol.get("conditionsModule", {}).get("conditions") or []
        ),
        "sponsor": sponsor_name,
        "enrollment": (design.get("enrollmentInfo") or {}).get("count") or 0,
        "interventions": ", ".join(interventions),
        "has_results": has_results,
        "study_type": design.get("studyType") or "INTERVENTIONAL",
        "start_year": _parse_year(start_date),
        "sponsor_class": _sponsor_class(sponsor_name),
        "label_completed": label_completed(overall_status),
        "label_terminated": label_terminated(overall_status),
    }


def fetch_studies_for_condition(
    client: httpx.Client,
    condition: str,
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
    max_pages: int = MAX_PAGES_PER_QUERY,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    page_token: str | None = None

    for _ in range(max_pages):
        params: dict[str, str] = {
            "query.cond": condition,
            "pageSize": str(page_size),
            "sort": "LastUpdatePostDate:desc",
        }
        if page_token:
            params["pageToken"] = page_token

        response = client.get(
            CTG_BASE,
            params=params,
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        payload = response.json()
        rows.extend(_parse_study(s) for s in payload.get("studies") or [])

        page_token = payload.get("nextPageToken")
        if not page_token:
            break
        time.sleep(REQUEST_DELAY_S)

    return rows


def build_training_records(
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
    max_pages: int = MAX_PAGES_PER_QUERY,
    use_network: bool = True,
) -> list[TrialRecord]:
    if not use_network:
        return load_seed_records()

    records: list[TrialRecord] = []
    seen: set[str] = set()

    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        for query in WH_CONDITION_QUERIES:
            for row in fetch_studies_for_condition(
                client, query, page_size=page_size, max_pages=max_pages
            ):
                nct = row["nct_id"]
                if not nct or nct in seen:
                    continue
                seen.add(nct)
                records.append(TrialRecord(**row, label_wh=1, source_query=query))
            time.sleep(REQUEST_DELAY_S)

        for query in NEGATIVE_CONDITION_QUERIES:
            for row in fetch_studies_for_condition(
                client, query, page_size=page_size, max_pages=max_pages
            ):
                nct = row["nct_id"]
                if not nct or nct in seen:
                    continue
                seen.add(nct)
                records.append(TrialRecord(**row, label_wh=0, source_query=query))
            time.sleep(REQUEST_DELAY_S)

    return records


def load_seed_records() -> list[TrialRecord]:
    seed_path = Path(__file__).resolve().parents[1] / "data" / "training_seed.json"
    if not seed_path.exists():
        raise FileNotFoundError(f"Missing offline seed: {seed_path}")
    raw = json.loads(seed_path.read_text(encoding="utf-8"))
    records: list[TrialRecord] = []
    for item in raw:
        # Backfill new fields for legacy seed rows
        item.setdefault("has_results", False)
        item.setdefault("study_type", "INTERVENTIONAL")
        item.setdefault("label_completed", label_completed(item.get("status", "")))
        item.setdefault("start_year", None)
        item.setdefault("sponsor_class", "other")
        records.append(TrialRecord(**item))
    return records


def load_cached_records(path: Path) -> list[TrialRecord]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [TrialRecord(**item) for item in raw]


def save_records(records: list[TrialRecord], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([asdict(r) for r in records], indent=2),
        encoding="utf-8",
    )
