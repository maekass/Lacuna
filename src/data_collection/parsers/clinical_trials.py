"""
ClinicalTrials.gov legacy JSON and v2 REST parsers.
Bump PARSER_VERSION when field paths change; regression tests lock fixtures.
"""

from __future__ import annotations

from typing import Any

PARSER_VERSION = "2026.05.2"


def _determine_outcome(status: str) -> str:
    """
    Determine trial outcome (success/failure) based on status.
    
    Success indicators:
    - Completed: Trial finished successfully
    - Active, not recruiting: Ongoing, likely successful so far
    
    Failure indicators:
    - Terminated: Stopped early (safety, futility, etc.)
    - Withdrawn: Cancelled before enrollment
    - Suspended: Temporarily halted (often bad sign)
    
    Unknown:
    - Recruiting, Enrolling, Not yet recruiting: Too early to tell
    - Unknown status: Insufficient data
    """
    if not status:
        return "Unknown"
    
    status_lower = status.lower()
    
    # Success indicators
    if "completed" in status_lower:
        return "Success"
    # Check for "not recruiting" before general "recruiting" check
    if "active" in status_lower and "not" in status_lower and "recruiting" in status_lower:
        return "Success"
    
    # Failure indicators
    if "terminated" in status_lower:
        return "Failure"
    if "withdrawn" in status_lower:
        return "Failure"
    if "suspended" in status_lower:
        return "Failure"
    
    # Ongoing or unknown (check after "not recruiting" to avoid false positives)
    # Special case: "not yet recruiting" is Ongoing
    if "not yet" in status_lower:
        return "Ongoing"
    
    if any(word in status_lower for word in ["recruiting", "enrolling"]):
        # Make sure it's not "active not recruiting" which was already handled as Success
        if "active" in status_lower and "not" in status_lower:
            pass  # Already handled above as Success
        else:
            return "Ongoing"
    
    return "Unknown"


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
        sponsor = protocol.get("SponsorCollaboratorsModule", {}) or {}
        
        # Phase
        phase_list = design.get("PhaseList") or {}
        raw_phase = phase_list.get("Phase") if isinstance(phase_list, dict) else None
        phase = _normalize_legacy_phase(raw_phase)
        
        # Dates
        start_struct = status.get("StartDateStruct") or {}
        start_date = start_struct.get("StartDate", "") if isinstance(start_struct, dict) else ""
        completion_struct = status.get("CompletionDateStruct") or {}
        completion_date = completion_struct.get("CompletionDate", "") if isinstance(completion_struct, dict) else ""
        
        # Enrollment
        enrollment_info = design.get("EnrollmentInfo") or {}
        enrollment = str(enrollment_info.get("Count", "")) if isinstance(enrollment_info, dict) else ""
        
        # Sponsor
        lead_sponsor = sponsor.get("LeadSponsor", {}) or {}
        sponsor_name = lead_sponsor.get("LeadSponsorName", "")
        sponsor_class = lead_sponsor.get("LeadSponsorClass", "")
        
        # Outcome (success/failure based on status)
        trial_status = status.get("OverallStatus", "")
        outcome = _determine_outcome(trial_status)
        
        trials.append(
            {
                "nct_id": identification.get("NCTId", ""),
                "title": identification.get("BriefTitle", ""),
                "status": trial_status,
                "phase": phase,
                "start_date": start_date,
                "completion_date": completion_date,
                "enrollment": enrollment,
                "sponsor_name": sponsor_name,
                "sponsor_type": sponsor_class,
                "outcome": outcome,
            }
        )
    return trials


def parse_v2_studies(payload: dict[str, Any], *, max_trials: int = 50) -> list[dict[str, str]]:
    """Parse v2 `/studies` JSON → flat trial rows with full metadata."""
    trials: list[dict[str, str]] = []
    for study in payload.get("studies", [])[:max_trials]:
        ps = study.get("protocolSection", {}) or {}
        idm = ps.get("identificationModule", {}) or {}
        sm = ps.get("statusModule", {}) or {}
        dm = ps.get("designModule", {}) or {}
        sponsor_mod = ps.get("sponsorCollaboratorsModule", {}) or {}
        arms_mod = ps.get("armsInterventionsModule", {}) or {}
        
        # Dates
        start_struct = sm.get("startDateStruct") or {}
        start_date = (
            start_struct.get("date", "") if isinstance(start_struct, dict) else str(start_struct or "")
        )
        completion_struct = sm.get("completionDateStruct") or {}
        completion_date = (
            completion_struct.get("date", "") if isinstance(completion_struct, dict) else str(completion_struct or "")
        )
        
        # Enrollment
        enrollment_info = dm.get("enrollmentInfo") or {}
        enrollment = str(enrollment_info.get("count", "")) if isinstance(enrollment_info, dict) else ""
        
        # Sponsor
        lead_sponsor = sponsor_mod.get("leadSponsor", {}) or {}
        sponsor_name = lead_sponsor.get("name", "")
        sponsor_class = lead_sponsor.get("class", "")
        
        # Interventions/Drugs
        interventions = arms_mod.get("interventions", []) or []
        drug_names = []
        intervention_types = []
        for intervention in interventions:
            if isinstance(intervention, dict):
                int_type = intervention.get("type", "")
                int_name = intervention.get("name", "")
                if int_name:
                    if int_type.upper() == "DRUG":
                        drug_names.append(int_name)
                    intervention_types.append(int_type)
        
        primary_drug = drug_names[0] if drug_names else ""
        all_drugs = "; ".join(drug_names[:3]) if drug_names else ""  # Limit to 3 for readability
        intervention_type = intervention_types[0] if intervention_types else ""
        
        # Outcome (success/failure based on status)
        trial_status = sm.get("overallStatus", "")
        outcome = _determine_outcome(trial_status)
        
        trials.append(
            {
                "nct_id": idm.get("nctId", ""),
                "title": idm.get("briefTitle", ""),
                "status": trial_status,
                "phase": _format_v2_phases(dm.get("phases")),
                "start_date": start_date,
                "completion_date": completion_date,
                "enrollment": enrollment,
                "sponsor_name": sponsor_name,
                "sponsor_type": sponsor_class,
                "outcome": outcome,
                "primary_drug": primary_drug,
                "all_drugs": all_drugs,
                "intervention_type": intervention_type,
            }
        )
    return trials
