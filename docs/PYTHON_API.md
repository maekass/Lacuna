# Lacuna Python API (FastAPI + GraphQL)

Optional **FastAPI sidecar** for Lacuna — complements the Next.js REST routes
with Python, OpenAPI docs, and a **GraphQL** read API. Runs locally or in
Docker; it is **not** part of the Vercel production deployment.

## Stack

| Layer        | Technology                                             |
| ------------ | ------------------------------------------------------ |
| REST         | FastAPI + Uvicorn                                      |
| GraphQL      | Strawberry                                             |
| SQL          | PostgreSQL via `psycopg` (optional `research_studies`) |
| External API | ClinicalTrials.gov v2 proxy                            |

## Quick start

```bash
cd services/python-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

From the repo root:

```bash
npm run python-api:dev
npm run python-api:test
```

Open:

- REST OpenAPI: http://localhost:8000/docs
- GraphQL IDE: http://localhost:8000/graphql
- Health: http://localhost:8000/health

## Docker

```bash
docker compose --profile api up -d
curl -s http://localhost:8000/health | jq
```

Requires Postgres for `/api/v1/research/studies` (seed with
`npm run db:seed-research`).

## Environment

| Variable              | Default                          | Purpose                       |
| --------------------- | -------------------------------- | ----------------------------- |
| `LACUNA_DATASET_PATH` | `src/data/dataset.verified.json` | Verified deal network JSON    |
| `DATABASE_URL`        | unset                            | Postgres for research studies |
| `CORS_ORIGINS`        | `http://localhost:3000`          | Allowed browser origins       |

## REST endpoints

| Method | Path                       | Notes                              |
| ------ | -------------------------- | ---------------------------------- |
| `GET`  | `/health`                  | Liveness                           |
| `GET`  | `/health/ready`            | Dataset file + optional DB probe   |
| `GET`  | `/api/v1/dataset/verified` | Mirrors Next.js dataset route      |
| `GET`  | `/api/v1/research/studies` | SQL-backed when `DATABASE_URL` set |
| `GET`  | `/api/v1/clinical-trials`  | ClinicalTrials.gov proxy           |

Pagination mirrors the TypeScript API: pass `resource`, `limit`, `offset`,
`sector`, `genomics`, or `paginate=true`.

## GraphQL

Example query:

```graphql
query {
  datasetSummary {
    companyCount
    acquisitionCount
    provenance { lastUpdated datasetVersion }
  }
  companies(sector: "Diagnostics", limit: 5) {
    total
    items { id name sector }
  }
}
```

Fields:

- `datasetSummary`
- `companies(sector, genomics, limit, offset)`
- `acquisitions(sector, genomics, limit, offset)`
- `researchStudies(institution, condition, limit, offset)` — requires Postgres
- `clinicalTrials(condition, limit)`

## Relationship to Next.js

The Vercel app at https://lacuna-maekass.vercel.app keeps serving the primary UI
and `/api/*` routes. The Python service is a **portfolio / self-hosted** layer
for teams that want FastAPI, GraphQL, or pandas-friendly JSON without changing
the production deployment.
