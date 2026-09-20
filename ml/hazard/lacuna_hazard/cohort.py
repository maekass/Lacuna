"""Build a right-censored cohort from the verified catalog."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Mapping, Sequence

from lacuna_hazard.features import encode_row

DAYS_PER_YEAR = 365.25


@dataclass(frozen=True)
class CohortRow:
    company_id: str
    name: str
    sector: str
    time_years: float
    event: int
    features: tuple[float, ...]
    exclusion: str | None = None


@dataclass(frozen=True)
class Cohort:
    rows: tuple[CohortRow, ...]
    censor_date: str
    dataset_version: str | None
    n_companies: int
    n_missing_founded: int
    n_nonpositive_time: int
    n_missing_sector: int
    notes: tuple[str, ...] = field(default_factory=tuple)

    @property
    def included(self) -> tuple[CohortRow, ...]:
        return tuple(r for r in self.rows if r.exclusion is None)

    @property
    def n(self) -> int:
        return len(self.included)

    @property
    def n_events(self) -> int:
        return sum(r.event for r in self.included)

    @property
    def n_censored(self) -> int:
        return self.n - self.n_events


def _parse_iso_date(value: str) -> date:
    return date.fromisoformat(value[:10])


def _years_between(start_year: int, end: date) -> float:
    origin = date(start_year, 1, 1)
    return (end.toordinal() - origin.toordinal()) / DAYS_PER_YEAR


def _announced_date(deal: Mapping[str, Any]) -> date:
    raw = deal.get("announcedDate") or deal.get("announced_date")
    if not isinstance(raw, str) or len(raw) < 10:
        raise ValueError("acquisition is missing announcedDate")
    return _parse_iso_date(raw)


def build_cohort(dataset: Mapping[str, Any]) -> Cohort:
    """Construct time-to-verified-acquisition rows; never impute founded year."""
    provenance = dataset.get("provenance") or {}
    last_updated = provenance.get("lastUpdated") or provenance.get("last_updated")
    if not isinstance(last_updated, str) or len(last_updated) < 10:
        raise ValueError("dataset provenance.lastUpdated is required")
    censor_at = _parse_iso_date(last_updated)
    version = provenance.get("datasetVersion")
    version_s = version if isinstance(version, str) else None

    companies: Sequence[Mapping[str, Any]] = dataset.get("companies") or ()
    acquisitions: Sequence[Mapping[str, Any]] = dataset.get("acquisitions") or ()

    first_deal: dict[str, date] = {}
    for deal in acquisitions:
        target = deal.get("targetId") or deal.get("target_id")
        if not isinstance(target, str):
            continue
        announced = _announced_date(deal)
        prev = first_deal.get(target)
        if prev is None or announced < prev:
            first_deal[target] = announced

    rows: list[CohortRow] = []
    n_missing_founded = 0
    n_nonpositive_time = 0
    n_missing_sector = 0

    for company in companies:
        cid = str(company.get("id") or "")
        name = str(company.get("name") or cid)
        sector = str(company.get("sector") or "")
        founded = company.get("founded")
        features = encode_row(company)

        if not isinstance(founded, (int, float)) or founded <= 0:
            n_missing_founded += 1
            rows.append(
                CohortRow(
                    cid,
                    name,
                    sector,
                    0.0,
                    0,
                    (),
                    "missing_founded",
                )
            )
            continue

        event_date = first_deal.get(cid)
        event = 1 if event_date is not None else 0
        end = event_date if event_date is not None else censor_at
        time_years = _years_between(int(founded), end)
        if time_years <= 0:
            n_nonpositive_time += 1
            rows.append(
                CohortRow(
                    cid,
                    name,
                    sector,
                    time_years,
                    event,
                    (),
                    "nonpositive_time",
                )
            )
            continue

        if features is None:
            n_missing_sector += 1
            rows.append(
                CohortRow(
                    cid,
                    name,
                    sector,
                    time_years,
                    event,
                    (),
                    "missing_sector",
                )
            )
            continue

        rows.append(
            CohortRow(
                cid,
                name,
                sector,
                time_years,
                event,
                tuple(features),
            )
        )

    notes = (
        "Time origin is 1 January of founded year (year precision).",
        "Independents are right-censored at provenance.lastUpdated.",
        "Stage is not a covariate (acquired labels leak the event).",
    )
    return Cohort(
        rows=tuple(rows),
        censor_date=censor_at.isoformat(),
        dataset_version=version_s,
        n_companies=len(list(companies)),
        n_missing_founded=n_missing_founded,
        n_nonpositive_time=n_nonpositive_time,
        n_missing_sector=n_missing_sector,
        notes=notes,
    )
