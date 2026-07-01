from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.clinical_trials import search_clinical_trials
from app.config import get_settings
from app.dataset import DatasetResource, load_verified_dataset, slice_verified_dataset
from app.db import check_database_connection, database_configured, load_research_studies_page
from app.graphql_schema import schema

app = FastAPI(
    title="Lacuna Python API",
    description=(
        "FastAPI sidecar for Lacuna — REST + GraphQL access to the verified "
        "dataset, optional Postgres research studies, and ClinicalTrials.gov proxy."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

graphql_app = GraphQLRouter(schema, path="/graphql")
app.include_router(graphql_app, prefix="")


def _dataset():
    return load_verified_dataset(str(settings.lacuna_dataset_path))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "lacuna-python-api"}


@app.get("/health/ready")
def health_ready() -> dict[str, object]:
    dataset_ok = settings.lacuna_dataset_path.is_file()
    db_ok = check_database_connection() if database_configured() else None
    ready = dataset_ok and (db_ok is not False)
    payload = {
        "status": "ready" if ready else "degraded",
        "dataset": "ok" if dataset_ok else "missing",
        "database": "ok" if db_ok else ("skipped" if db_ok is None else "unavailable"),
    }
    if not ready:
        raise HTTPException(status_code=503, detail=payload)
    return payload


@app.get("/api/v1/dataset/verified")
def get_verified_dataset(
    resource: DatasetResource = "all",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sector: str | None = None,
    genomics: bool = False,
    paginate: bool = Query(False),
) -> dict:
    dataset = _dataset()
    should_paginate = paginate or resource != "all" or sector is not None or genomics

    if should_paginate:
        page = slice_verified_dataset(
            dataset,
            resource=resource,
            limit=limit,
            offset=offset,
            sector=sector,
            genomics=genomics,
        )
        return page.model_dump()

    return dataset.model_dump()


@app.get("/api/v1/research/studies")
def get_research_studies(
    institution: Literal["nih", "harvard", "mit", "harvard_mit_collab"] | None = None,
    condition: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    if not database_configured():
        raise HTTPException(
            status_code=503,
            detail="DATABASE_URL is not configured for research study queries",
        )
    page = load_research_studies_page(
        institution=institution,
        condition=condition,
        limit=limit,
        offset=offset,
    )
    return {
        "studies": [
            {
                "studyId": study.study_id,
                "institution": study.institution,
                "sampleSize": study.sample_size,
                "source": study.source,
                "markerGenes": study.marker_genes,
            }
            for study in page.studies
        ],
        "meta": {
            "total": page.total,
            "limit": page.limit,
            "offset": page.offset,
        },
    }


@app.get("/api/v1/clinical-trials")
async def get_clinical_trials(
    condition: str = "",
    sponsor: str = "",
    phase: str = "",
    status: str = "",
    limit: int = Query(10, ge=1, le=100),
) -> dict:
    try:
        result = await search_clinical_trials(
            condition=condition,
            sponsor=sponsor,
            phase=phase,
            status=status,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="ClinicalTrials.gov is unavailable",
        ) from exc

    return {
        "trials": [
            {
                "nctId": trial.nct_id,
                "title": trial.title,
                "phase": trial.phase,
                "status": trial.status,
                "condition": trial.condition,
                "sponsor": trial.sponsor,
                "enrollment": trial.enrollment,
                "startDate": trial.start_date,
                "completionDate": trial.completion_date,
                "locations": trial.locations or [],
                "interventions": trial.interventions or [],
            }
            for trial in result.trials
        ],
        "total": result.total,
        "query": result.query,
    }
