from dataclasses import dataclass

import httpx

from app.config import get_settings

DEFAULT_TRIAL_LIMIT = 10
MAX_TRIAL_LIMIT = 100


@dataclass
class ClinicalTrial:
    nct_id: str
    title: str
    phase: str
    status: str
    condition: str
    sponsor: str
    enrollment: int
    start_date: str
    completion_date: str | None = None
    locations: list[str] | None = None
    interventions: list[str] | None = None


@dataclass
class ClinicalTrialSearchResult:
    trials: list[ClinicalTrial]
    total: int
    query: dict[str, str]


def _clamp_limit(limit: int) -> int:
    return max(1, min(limit, MAX_TRIAL_LIMIT))


def _map_study(study: dict) -> ClinicalTrial:
    protocol = study.get("protocolSection") or {}
    status = protocol.get("statusModule") or {}
    identification = protocol.get("identificationModule") or {}
    sponsor = protocol.get("sponsorCollaboratorsModule") or {}
    design = protocol.get("designModule") or {}
    arms = protocol.get("armsInterventionsModule") or {}
    contacts = protocol.get("contactsLocationsModule") or {}

    locations = []
    for location in contacts.get("locations") or []:
        facility = location.get("facility") or {}
        address = facility.get("address") or {}
        label = f"{facility.get('name', '')}, {address.get('city', '')}".strip(", ")
        if label:
            locations.append(label)

    interventions = [
        item.get("name", "")
        for item in arms.get("interventions") or []
        if item.get("name")
    ]

    return ClinicalTrial(
        nct_id=identification.get("nctId", ""),
        title=identification.get("briefTitle", ""),
        phase=(design.get("phases") or ["Not Applicable"])[0],
        status=status.get("overallStatus", "Unknown"),
        condition=", ".join(protocol.get("conditionsModule", {}).get("conditions") or []),
        sponsor=(sponsor.get("leadSponsor") or {}).get("name", "Unknown"),
        enrollment=(design.get("enrollmentInfo") or {}).get("count") or 0,
        start_date=(status.get("startDateStruct") or {}).get("date", ""),
        completion_date=(status.get("completionDateStruct") or {}).get("date"),
        locations=locations,
        interventions=interventions,
    )


async def search_clinical_trials(
    *,
    condition: str = "",
    sponsor: str = "",
    phase: str = "",
    status: str = "",
    limit: int = DEFAULT_TRIAL_LIMIT,
) -> ClinicalTrialSearchResult:
    settings = get_settings()
    params: dict[str, str] = {
        "pageSize": str(_clamp_limit(limit)),
        "sort": "LastUpdatePostDate:desc",
    }
    if condition:
        params["query.cond"] = condition
    if sponsor:
        params["query.spons"] = sponsor
    if phase:
        params["filter.phase"] = phase
    if status:
        params["filter.status"] = status

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            f"{settings.clinical_trials_api_base}/studies",
            params=params,
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()

    trials = [_map_study(study) for study in payload.get("studies") or []]
    return ClinicalTrialSearchResult(
        trials=trials,
        total=int(payload.get("totalCount") or len(trials)),
        query={
            "condition": condition,
            "sponsor": sponsor,
            "phase": phase,
            "status": status,
        },
    )
