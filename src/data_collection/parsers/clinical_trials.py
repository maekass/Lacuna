"""
ClinicalTrials.gov legacy JSON and v2 REST parsers.
Bump PARSER_VERSION when field paths change; regression tests lock fixtures.
"""

from __future__ import annotations

from typing import Any

PARSER_VERSION = "2026.05.1"


def _normalize_legacy_phase(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, list):
        parts = [str(p).strip() for p in raw if p is not None and str(p).strip()]
        return "; ".join(parts)
    if isinstance(raw, dict):
        inner = raw.get("Phase", raw.get("phase"))
        return _normalize_legacy_phase(inner)
    return str(raw).strip()


def _format_v2_phases(phases: Any) -> str:
    if not phases:
        return ""
    out: list[str] = []
    for p in phases:
        if not p:
            continue
        s = str(p).strip()
        if s.upper().startswith("PHASE"):
            rest = s.upper().replace("PHASE", "", 1).replace("_", " ").strip()
            out.append(f"Phase {rest}" if rest else s)
        else:
            out.append(s)
    return "; ".join(out)


def parse_legacy_full_studies(data: dict[str, Any], *, max_trials: int = 50) -> list[dict[str, str]]:
    """Parse legacy `full_studies` JSON envelope → flat trial rows."""
    trials: list[dict[str, str]] = []
    if "FullStudiesResponse" not in data:
        return trials
    for study in data["FullStudiesResponse"].get("FullStudies", [])[:max_trials]:
        protocol = study.get("Study", {}).get("ProtocolSection", {})
        status = protocol.get("StatusModule", {}) or {}
        identification = protocol.get("IdentificationModule", {}) or {}
        design = protocol.get("DesignModule") or {}
        phase_list = design.get("PhaseList") or {}
        raw_phase = phase_list.get("Phase") if isinstance(phase_list, dict) else None
        phase = _normalize_legacy_phase(raw_phase)
        start_struct = status.get("StartDateStruct") or {}
        start_date = start_struct.get("StartDate", "") if isinstance(start_struct, dict) else ""
        trials.append(
            {
                "nct_id": identification.get("NCTId", ""),
                "title": identification.get("BriefTitle", ""),
                "status": status.get("OverallStatus", ""),
                "start_date": start_date,
                "phase": phase,
            }
        )
    return trials


def parse_v2_studies(payload: dict[str, Any], *, max_trials: int = 50) -> list[dict[str, str]]:
    """Parse v2 `/studies` JSON → flat trial rows."""
    trials: list[dict[str, str]] = []
    for study in payload.get("studies", [])[:max_trials]:
        ps = study.get("protocolSection", {}) or {}
        idm = ps.get("identificationModule", {}) or {}
        sm = ps.get("statusModule", {}) or {}
        dm = ps.get("designModule", {}) or {}
        start_struct = sm.get("startDateStruct") or {}
        start_date = (
            start_struct.get("date", "") if isinstance(start_struct, dict) else str(start_struct or "")
        )
        trials.append(
            {
                "nct_id": idm.get("nctId", ""),
                "title": idm.get("briefTitle", ""),
                "status": sm.get("overallStatus", ""),
                "start_date": start_date,
                "phase": _format_v2_phases(dm.get("phases")),
            }
        )
    return trials
