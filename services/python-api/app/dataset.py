import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

DatasetResource = Literal["companies", "acquisitions", "acquirers", "all"]

GENOMICS_KEYWORD = re.compile(
    r"genomic|genome|sequenc|brca|biomarker|hereditary|carrier screening|cgp|"
    r"profiling|variant|exome|oncotype|pcos|sickle|hbb|lynch|lupus|hla|"
    r"palb2|chek2|dennd1a|fshr",
    re.IGNORECASE,
)


class Provenance(BaseModel):
    lastUpdated: str
    datasetVersion: str | None = None
    sources: list[str]
    notes: list[str] = Field(default_factory=list)
    purpose: str
    disclaimer: str


class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    sector: str = "Unknown"
    stage: str = ""
    founded: int = 0
    hq: str = ""
    description: str = ""
    lastKnownValuation: float | None = None
    valuationSource: str | None = None
    totalFunding: float | None = None
    sources: list[str] | None = None
    evidenceClass: str | None = None


class Acquirer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    ticker: str | None = None
    sector: str | None = None
    hq: str = ""
    type: str | None = None
    description: str | None = None


class Acquisition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    targetId: str
    acquirerId: str
    targetName: str
    acquirerName: str
    announcedDate: str
    dealType: str
    source: str
    strategicRationale: str = ""
    closedDate: str | None = None
    dealValue: float | None = None
    dealValueNote: str | None = None


class VerifiedDataset(BaseModel):
    provenance: Provenance
    companies: list[Company]
    acquirers: list[Acquirer]
    acquisitions: list[Acquisition]


class DatasetMeta(BaseModel):
    resource: DatasetResource
    limit: int
    offset: int
    sector: str | None = None
    genomics: bool = False
    total: dict[str, int]


class DatasetSlice(BaseModel):
    provenance: Provenance
    companies: list[Company]
    acquirers: list[Acquirer]
    acquisitions: list[Acquisition]
    meta: DatasetMeta


def is_genomics_relevant_company(company: Company) -> bool:
    if company.sector == "Diagnostics":
        return True
    haystack = f"{company.name} {company.description}"
    return bool(GENOMICS_KEYWORD.search(haystack))


def _paginate(items: list[Any], limit: int, offset: int) -> list[Any]:
    return items[offset : offset + limit]


@lru_cache
def load_verified_dataset(dataset_path: str) -> VerifiedDataset:
    path = Path(dataset_path)
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return VerifiedDataset.model_validate(payload)


def slice_verified_dataset(
    dataset: VerifiedDataset,
    *,
    resource: DatasetResource = "all",
    limit: int = 50,
    offset: int = 0,
    sector: str | None = None,
    genomics: bool = False,
) -> DatasetSlice:
    companies_by_id = {company.id: company for company in dataset.companies}
    companies = list(dataset.companies)
    acquisitions = list(dataset.acquisitions)

    if sector:
        companies = [c for c in companies if c.sector == sector]
        sector_ids = {c.id for c in companies}
        acquisitions = [d for d in acquisitions if d.targetId in sector_ids]

    if genomics:
        companies = [c for c in companies if is_genomics_relevant_company(c)]
        acquisitions = [
            d
            for d in acquisitions
            if (target := companies_by_id.get(d.targetId)) is not None
            and is_genomics_relevant_company(target)
        ]

    totals = {
        "companies": len(companies),
        "acquisitions": len(acquisitions),
        "acquirers": len(dataset.acquirers),
    }

    sliced_companies = (
        _paginate(companies, limit, offset)
        if resource in ("all", "companies")
        else []
    )
    sliced_acquisitions = (
        _paginate(acquisitions, limit, offset)
        if resource in ("all", "acquisitions")
        else []
    )
    sliced_acquirers = (
        _paginate(dataset.acquirers, limit, offset)
        if resource in ("all", "acquirers")
        else []
    )

    return DatasetSlice(
        provenance=dataset.provenance,
        companies=sliced_companies,
        acquirers=sliced_acquirers,
        acquisitions=sliced_acquisitions,
        meta=DatasetMeta(
            resource=resource,
            limit=limit,
            offset=offset,
            sector=sector,
            genomics=genomics,
            total=totals,
        ),
    )
