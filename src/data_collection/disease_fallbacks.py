"""Bundled trial fallbacks per disease when ClinicalTrials.gov is unavailable."""

from __future__ import annotations

FALLBACK_TRIALS: dict[str, list[dict[str, str]]] = {
    "scd": [
        {
            "nct_id": "NCT03745287",
            "title": "A Study of CTX001 in Severe Sickle Cell Disease",
            "status": "COMPLETED",
            "start_date": "2018-11-19",
            "phase": "Phase 1/2",
        },
        {
            "nct_id": "NCT04208592",
            "title": "Study of Voxelotor in Pediatric Participants With Sickle Cell Disease",
            "status": "COMPLETED",
            "start_date": "2019-12-18",
            "phase": "Phase 2",
        },
    ],
    "sle": [
        {
            "nct_id": "NCT05129128",
            "title": "A Study of Anifrolumab in Adult Participants With Active Systemic Lupus Erythematosus",
            "status": "COMPLETED",
            "start_date": "2021-09-15",
            "phase": "Phase 3",
        },
        {
            "nct_id": "NCT03285711",
            "title": "Efficacy and Safety of Belimumab in Black Race Patients With SLE",
            "status": "COMPLETED",
            "start_date": "2018-01-10",
            "phase": "Phase 4",
        },
        {
            "nct_id": "NCT03920295",
            "title": "Study of Deucravacitinib in Participants With Active Systemic Lupus Erythematosus",
            "status": "ACTIVE_NOT_RECRUITING",
            "start_date": "2019-07-22",
            "phase": "Phase 2",
        },
    ],
    "sarc": [
        {
            "nct_id": "NCT03732807",
            "title": "Study of Cosentyx in Patients With Pulmonary Sarcoidosis",
            "status": "TERMINATED",
            "start_date": "2019-01-14",
            "phase": "Phase 2",
        },
        {
            "nct_id": "NCT03910543",
            "title": "Rituximab for Treatment of Sarcoidosis",
            "status": "COMPLETED",
            "start_date": "2019-06-01",
            "phase": "Phase 2",
        },
    ],
}
