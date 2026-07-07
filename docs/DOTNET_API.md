# Lacuna .NET API (ASP.NET Core + EF Core)

Optional **ASP.NET Core sidecar** for Lacuna — complements the Next.js REST
routes with C#, OpenAPI (Swagger), and **Entity Framework Core** for Postgres
research studies. Runs locally or in Docker; it is **not** part of the Vercel
production deployment.

## Stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| REST         | ASP.NET Core 8 Minimal APIs                           |
| ORM          | Entity Framework Core 8 + Npgsql                      |
| SQL          | PostgreSQL (`research_studies` from `db/migrations/`) |
| External API | ClinicalTrials.gov v2 proxy                           |

## Quick start

Prerequisites: [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

```bash
cd services/dotnet-api
dotnet restore
dotnet run --project Lacuna.DotNetApi --urls http://localhost:8001
```

From the repo root:

```bash
npm run dotnet-api:dev
npm run dotnet-api:test
```

Open:

- Swagger UI: http://localhost:8001/swagger
- Health: http://localhost:8001/health

Port **8001** avoids conflict with the Python sidecar on **8000**.

## Docker

```bash
docker compose --profile dotnet-api up -d
curl -s http://localhost:8001/health | jq
```

Requires Postgres for `/api/v1/research/studies` (seed with
`npm run db:seed-research`).

## Environment

| Variable                   | Default                             | Purpose                       |
| -------------------------- | ----------------------------------- | ----------------------------- |
| `LACUNA_DATASET_PATH`      | `src/data/dataset.verified.json`    | Verified deal network JSON    |
| `DATABASE_URL`             | unset                               | Postgres for research studies |
| `CORS_ORIGINS`             | `http://localhost:3000`             | Allowed browser origins       |
| `CLINICAL_TRIALS_API_BASE` | `https://clinicaltrials.gov/api/v2` | Trials proxy base URL         |

## REST endpoints

| Method | Path                       | Notes                               |
| ------ | -------------------------- | ----------------------------------- |
| `GET`  | `/health`                  | Liveness                            |
| `GET`  | `/health/ready`            | Dataset file + optional EF DB probe |
| `GET`  | `/api/v1/dataset/verified` | Mirrors Next.js / Python routes     |
| `GET`  | `/api/v1/research/studies` | EF Core when `DATABASE_URL` set     |
| `GET`  | `/api/v1/clinical-trials`  | ClinicalTrials.gov proxy            |

Pagination mirrors the TypeScript and Python APIs: pass `resource`, `limit`,
`offset`, `sector`, `genomics`, or `paginate=true`.

### Research studies (EF Core)

`research_studies` is managed by Lacuna SQL migrations (`npm run db:migrate`).
The .NET sidecar maps the table with EF Core — no separate EF migrations.

```bash
npm run db:migrate
npm run db:seed-research
curl "http://localhost:8001/api/v1/research/studies?institution=harvard&limit=5"
```

## Relationship to other services

| Service          | Port | Notes                                     |
| ---------------- | ---- | ----------------------------------------- |
| Next.js (Vercel) | 3000 | Primary UI + `/api/*` in production       |
| Python API       | 8000 | FastAPI + GraphQL sidecar                 |
| .NET API         | 8001 | ASP.NET Core + EF Core sidecar (this doc) |

The Vercel app keeps serving the primary UI. Both sidecars are **portfolio /
self-hosted** layers for teams that want alternative stacks without changing the
production deployment.
