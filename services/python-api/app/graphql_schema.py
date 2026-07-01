from __future__ import annotations

from typing import Optional

import strawberry

from app.clinical_trials import search_clinical_trials
from app.config import get_settings
from app.dataset import load_verified_dataset, slice_verified_dataset
from app.db import database_configured, load_research_studies_page


@strawberry.type
class ProvenanceGql:
    last_updated: str
    dataset_version: Optional[str]
    purpose: str
    disclaimer: str
    source_count: int


@strawberry.type
class DatasetSummaryGql:
    company_count: int
    acquisition_count: int
    acquirer_count: int
    provenance: ProvenanceGql


@strawberry.type
class CompanyGql:
    id: str
    name: str
    sector: str
    stage: str
    founded: int
    hq: str
    description: str


@strawberry.type
class AcquisitionGql:
    id: str
    target_name: str
    acquirer_name: str
    announced_date: str
    deal_value: Optional[float]
    deal_type: str


@strawberry.type
class CompanyPageGql:
    items: list[CompanyGql]
    total: int
    limit: int
    offset: int


@strawberry.type
class AcquisitionPageGql:
    items: list[AcquisitionGql]
    total: int
    limit: int
    offset: int


@strawberry.type
class ResearchStudyGql:
    study_id: str
    institution: str
    sample_size: int
    source: str
    marker_genes: list[str]


@strawberry.type
class ResearchStudyPageGql:
    items: list[ResearchStudyGql]
    total: int
    limit: int
    offset: int


@strawberry.type
class ClinicalTrialGql:
    nct_id: str
    title: str
    phase: str
    status: str
    condition: str
    sponsor: str
    enrollment: int


@strawberry.type
class ClinicalTrialPageGql:
    items: list[ClinicalTrialGql]
    total: int


def _dataset():
    settings = get_settings()
    return load_verified_dataset(str(settings.lacuna_dataset_path))


@strawberry.type
class Query:
    @strawberry.field
    def dataset_summary(self) -> DatasetSummaryGql:
        dataset = _dataset()
        provenance = dataset.provenance
        return DatasetSummaryGql(
            company_count=len(dataset.companies),
            acquisition_count=len(dataset.acquisitions),
            acquirer_count=len(dataset.acquirers),
            provenance=ProvenanceGql(
                last_updated=provenance.lastUpdated,
                dataset_version=provenance.datasetVersion,
                purpose=provenance.purpose,
                disclaimer=provenance.disclaimer,
                source_count=len(provenance.sources),
            ),
        )

    @strawberry.field
    def companies(
        self,
        sector: Optional[str] = None,
        genomics: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> CompanyPageGql:
        page = slice_verified_dataset(
            _dataset(),
            resource="companies",
            limit=min(max(limit, 1), 200),
            offset=max(offset, 0),
            sector=sector,
            genomics=genomics,
        )
        return CompanyPageGql(
            items=[
                CompanyGql(
                    id=c.id,
                    name=c.name,
                    sector=c.sector,
                    stage=c.stage,
                    founded=c.founded,
                    hq=c.hq,
                    description=c.description,
                )
                for c in page.companies
            ],
            total=page.meta.total["companies"],
            limit=page.meta.limit,
            offset=page.meta.offset,
        )

    @strawberry.field
    def acquisitions(
        self,
        sector: Optional[str] = None,
        genomics: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> AcquisitionPageGql:
        page = slice_verified_dataset(
            _dataset(),
            resource="acquisitions",
            limit=min(max(limit, 1), 200),
            offset=max(offset, 0),
            sector=sector,
            genomics=genomics,
        )
        return AcquisitionPageGql(
            items=[
                AcquisitionGql(
                    id=a.id,
                    target_name=a.targetName,
                    acquirer_name=a.acquirerName,
                    announced_date=a.announcedDate,
                    deal_value=a.dealValue,
                    deal_type=a.dealType,
                )
                for a in page.acquisitions
            ],
            total=page.meta.total["acquisitions"],
            limit=page.meta.limit,
            offset=page.meta.offset,
        )

    @strawberry.field
    def research_studies(
        self,
        institution: Optional[str] = None,
        condition: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> ResearchStudyPageGql:
        if not database_configured():
            return ResearchStudyPageGql(items=[], total=0, limit=limit, offset=offset)

        page = load_research_studies_page(
            institution=institution,
            condition=condition,
            limit=min(max(limit, 1), 100),
            offset=max(offset, 0),
        )
        return ResearchStudyPageGql(
            items=[
                ResearchStudyGql(
                    study_id=study.study_id,
                    institution=study.institution,
                    sample_size=study.sample_size,
                    source=study.source,
                    marker_genes=study.marker_genes,
                )
                for study in page.studies
            ],
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )

    @strawberry.field
    async def clinical_trials(
        self,
        condition: str = "",
        limit: int = 10,
    ) -> ClinicalTrialPageGql:
        result = await search_clinical_trials(condition=condition, limit=limit)
        return ClinicalTrialPageGql(
            items=[
                ClinicalTrialGql(
                    nct_id=trial.nct_id,
                    title=trial.title,
                    phase=trial.phase,
                    status=trial.status,
                    condition=trial.condition,
                    sponsor=trial.sponsor,
                    enrollment=trial.enrollment,
                )
                for trial in result.trials
            ],
            total=result.total,
        )


schema = strawberry.Schema(query=Query)
