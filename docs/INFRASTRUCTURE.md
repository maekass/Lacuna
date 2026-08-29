# Lacuna infrastructure

Operational guide for CI, Vercel, Postgres, SEC cron, and monitoring. **Framer
marketing is out of scope** — see
[SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md).

## Architecture

```mermaid
flowchart LR
  subgraph ci [GitHub CI]
    lint[ESLint]
    test[Vitest]
    build[Next build]
    dataset[validate:dataset]
  end
  subgraph vercel [Vercel]
    app[Next.js app]
    cron[Daily SEC cron]
  end
  subgraph data [Data]
    json[dataset.verified.json]
    pg[(Postgres)]
    ch[(ClickHouse)]
    s3[Object storage]
  end
  ci --> vercel
  app --> json
  app -->|LACUNA_DATA_MODE=db| pg
  app -->|LACUNA_VARIANT_STORE=clickhouse| ch
  app -.->|VCF blobs| s3
  cron --> pg
```

| Layer         | Location                                         | Notes                                                                                          |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| App           | Vercel — https://lacuna-maekass.vercel.app       | Next.js 16, default `static` data                                                              |
| CI            | `.github/workflows/deno.yml`                     | lint, test, build, dataset validation                                                          |
| Cron          | `vercel.json` → `/api/cron/sec-ingest`           | 06:00 UTC Mondays (`0 6 * * 1`, Hobby-safe)                                                    |
| Vercel tuning | [VERCEL_SETTINGS.md](./VERCEL_SETTINGS.md)       | Region, skew protection, Speed Insights, ignored builds                                        |
| Deal universe | [EPIC_DEAL_UNIVERSE.md](./EPIC_DEAL_UNIVERSE.md) | SEC queue → human promote → changelog (not auto-merge)                                         |
| DB            | `db/migrations/*.sql`                            | Verified dataset + `lacuna_deals` + ingest runs                                                |
| Local DB      | `docker-compose.yml`                             | Postgres 16 + ClickHouse 24 for dev                                                            |
| Variant store | `clickhouse/migrations/`                         | Callset catalog + variant summaries — [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md) |

## Quick local stack

```bash
cp .env.example .env.local
npm install
npm run dev                    # static JSON — no DB required
npm run validate:dataset
npm run infra:check
```

### Optional Postgres (db mode + SEC ingest)

```bash
docker compose up -d
# .env.local: DATABASE_URL=postgresql://lacuna:lacuna@localhost:5432/lacuna, PGSSLMODE=disable
npm run db:migrate
npm run db:import
LACUNA_DATA_MODE=db npm run dev
```

### Optional variant call-set store (ClickHouse + object storage)

```bash
docker compose up -d clickhouse
# .env.local: LACUNA_VARIANT_STORE=clickhouse, CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123
npm run clickhouse:migrate
npm run clickhouse:seed
```

## Environment variables

Copy [`.env.example`](../.env.example) to `.env.local`. Production checklist:
[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

| Variable                     | When                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `LACUNA_DATA_MODE`           | `static` (default) or `db`                                                                     |
| `DATABASE_URL`               | db mode, SEC sync, `/api/cron/sec-ingest/status`                                               |
| `CRON_SECRET`                | Production cron auth                                                                           |
| `SEC_EDGAR_USER_AGENT`       | Required for SEC ingest and `download:free-apis` (SEC sources)                                 |
| `NCBI_TOOL_EMAIL`            | PubMed E-utilities (`download:free-apis`)                                                      |
| `PATENTSVIEW_API_KEY`        | Optional — PatentsView in `download:free-apis`                                                 |
| `LACUNA_INGEST_RUN_TRACKING` | Recommended — `lacuna_ingest_runs` audit                                                       |
| `SEC_USE_DB_CURSOR`          | Recommended — incremental daily scans                                                          |
| `LACUNA_VARIANT_STORE`       | `off` (default) or `clickhouse` — see [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md) |
| `CLICKHOUSE_URL`             | Required when variant store enabled                                                            |
| `UPSTASH_REDIS_REST_URL`     | Optional — Redis-backed rate limiting (production recommended)                                 |
| `UPSTASH_REDIS_REST_TOKEN`   | Required when `UPSTASH_REDIS_REST_URL` set                                                     |
| `RATE_LIMIT_FAIL_MODE`       | `closed` (default) deny on Redis errors; `open` falls back to capped in-memory buckets         |

AI and Sentry: [INFERENCE.md](./INFERENCE.md),
[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Scripts

| Command                       | Purpose                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run validate:dataset`    | Schema + provenance validation on JSON                                                                        |
| `npm run compute:all`         | Regenerate all dataset-derived `computed-*.json` models                                                       |
| `npm run verify:computed`     | CI guard — fail if computed artifacts are stale                                                               |
| `npm run reproduce -- <file>` | Arithmetic self-check of a self-contained artifact; add `--dataset` for the stronger dataset provenance check |

The browser's reproduction sheet downloads artifacts to `~/Downloads`. The
displayed command uses that path so it can be copied from the repository root.
The plain command recomputes the registered estimator using only the artifact's
embedded contributor values; it does not establish that those inputs came from
the dataset. With `--dataset`, the CLI verifies the dataset hash and, when the
metric has a registered production recomputation path, regenerates the metric
from the current dataset and compares contributors, sample size, value, and
confidence interval. Metrics without such a path use the weaker raw field-read
check and report that strength explicitly. | `npm run infra:check` | Env
checklist + health aggregate (exit 1 if unhealthy) | | `npm run db:migrate` |
Apply SQL migrations | | `npm run db:import` | Load `dataset.verified.json` into
Postgres | | `npm run db:restore` | Ping DB + migrate + import —
[RESTORE_POSTGRES.md](./RESTORE_POSTGRES.md) | | `npm run db:ping` | Validate
`DATABASE_URL` only | | `npm run sec:ingest` | SEC pipeline (CLI) | |
`npm run download:free-apis` | Batch JSON export from free public APIs (see
below) | | `npm run clickhouse:migrate` | Apply ClickHouse variant-store schema
| | `npm run clickhouse:seed` | Infrastructure demo callset (local dev) | |
`npm run clickhouse:ingest-vcf` | Stream VCF → object storage + ClickHouse
summaries | | `npm run python-api:dev` | FastAPI sidecar on :8000 (REST +
GraphQL) | | `npm run python-api:test` | Pytest for Python API | |
`npm run dotnet-api:dev` | ASP.NET Core + EF sidecar on :8001 (REST + Swagger) |
| `npm run dotnet-api:test` | xUnit for .NET API |

## Python API sidecar (optional)

FastAPI + Strawberry GraphQL service under `services/python-api/`. See
[PYTHON_API.md](./PYTHON_API.md).

```bash
npm run python-api:dev
# or
docker compose --profile api up -d
```

| Route (port 8000)              | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `GET /docs`                    | OpenAPI (FastAPI)                            |
| `POST /graphql`                | GraphQL queries                              |
| `GET /api/v1/dataset/verified` | Verified JSON (parity with Next.js route)    |
| `GET /api/v1/clinical-trials`  | ClinicalTrials.gov proxy                     |
| `GET /api/v1/research/studies` | Postgres research catalog when DB configured |

Not deployed on Vercel — local / self-hosted only.

## .NET API sidecar (optional)

ASP.NET Core + EF Core service under `services/dotnet-api/`. See
[DOTNET_API.md](./DOTNET_API.md).

```bash
npm run dotnet-api:dev
# or
docker compose --profile dotnet-api up -d
```

| Route (port 8001)              | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `GET /swagger`                 | OpenAPI (Swashbuckle)                       |
| `GET /api/v1/dataset/verified` | Verified JSON (parity with Next.js route)   |
| `GET /api/v1/clinical-trials`  | ClinicalTrials.gov proxy                    |
| `GET /api/v1/research/studies` | EF Core research catalog when DB configured |

Not deployed on Vercel — local / self-hosted only.

## HTTP endpoints (ops)

| Route                              | Auth                 | Purpose                                               |
| ---------------------------------- | -------------------- | ----------------------------------------------------- |
| `GET /api/health`                  | Public               | **Liveness** — constant-time (use for synthetics)     |
| `GET /api/health/ready`            | Public               | **Readiness** — dataset validation + optional DB ping |
| `GET /api/cron/sec-ingest`         | `Bearer CRON_SECRET` | Run SEC ingest (Vercel Cron)                          |
| `GET /api/cron/sec-ingest/status`  | Public               | Latest ingest run (needs `DATABASE_URL`)              |
| `GET /api/ingest/sec/status`       | Public               | Same as cron status — app-facing alias                |
| `GET /api/ingest/free-apis/status` | Public               | Latest `download:free-apis` export on disk            |
| `GET /api/dataset/verified`        | Public               | Verified dataset JSON export                          |

**Uptime monitors:** `GET /api/health` only — see
[MONITORING.md](./MONITORING.md). Expect HTTP 200 and `probe: "live"`. Never
schedule `/api/health/ready` (deploy smoke / manual only).

## Rate limiting

API routes use Redis-backed rate limiting via
[Upstash Redis](https://upstash.com/). Without Redis, rate limiting falls back
to a capped in-memory map (max 10k buckets, expired keys pruned on access, LRU
eviction at the cap). Limits are still per serverless instance.

Per-IP keys come from `src/lib/api/requestIdentity.ts` (trusted proxy hops — not
the leftmost `X-Forwarded-For` value). See `TRUSTED_PROXY_HOPS`.

When Redis is configured but errors, `RATE_LIMIT_FAIL_MODE` controls the path:
`closed` (default) denies the request; `open` uses the in-memory fallback.
Patient-data and AI routes go through `src/lib/api/rateLimitGuard.ts` and
therefore fail closed unless the env var is set to `open`. Both fallbacks emit
`reportWarning`.

### Setup Upstash Redis (production)

1. Create a free Redis database at
   [console.upstash.com](https://console.upstash.com/)
2. Copy **REST URL** and **REST Token** from the database dashboard
3. Add to Vercel environment variables:
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```
4. Redeploy or wait for next deployment

### Local development

Local dev works without Redis (in-memory fallback). To test Redis locally:

```bash
# Add to .env.local
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
npm run dev
```

### Rate limit configuration

Current limits (per IP, per minute):

| Endpoint                        | Limit | Window |
| ------------------------------- | ----- | ------ |
| `/api/ai/insights`              | 10    | 60s    |
| `/api/genomics/*`               | 30    | 60s    |
| `/api/evidence/fda`             | 30    | 60s    |
| `/api/evidence/clinical-trials` | 40    | 60s    |
| `/api/dataset/verified`         | 30    | 60s    |
| `/api/export/deals.csv`         | 10    | 60s    |

Limits are enforced in `src/lib/api/rateLimit.ts`. Redis keys auto-expire using
TTL. Redis errors: `RATE_LIMIT_FAIL_MODE=closed` (default) or `open`.

### Troubleshooting

| Symptom                 | Check                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Rate limits not shared  | Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set                                |
| Redis connection errors | Check Upstash dashboard for database status                                                       |
| Fallback to in-memory   | Expected when Redis env vars missing; Redis errors fail closed unless `RATE_LIMIT_FAIL_MODE=open` |

## Vercel deploy

1. Link repo and set env vars (see PRODUCTION_SETUP).
2. `vercel env pull .env.local` then `npm run db:migrate` against production DB.
3. Confirm cron: Vercel → Cron Jobs shows `0 6 * * 1` → `/api/cron/sec-ingest`.
4. Smoke: `curl -s https://lacuna-maekass.vercel.app/api/health | jq .ok`

Cron auth lives in `src/lib/infra/cronAuth.ts` — without `CRON_SECRET`,
non-production allows open access; production requires the bearer token.

## CI

Workflow: `.github/workflows/deno.yml` (job name **CI**).

```bash
npm run lint && npm test && npm run build && npm run validate:dataset
```

Branch protection (optional): `./scripts/configure-branch-protection.sh` —
requires `gh` admin on the repo.

Datadog synthetics: `.github/workflows/datadog-synthetics.yml` — daily cron plus
`workflow_dispatch`. The job skips (green) until `DD_API_KEY` / `DD_APP_KEY`
exist; it does not fail the schedule.

## SEC ingest

Full behavior: [SEC_INGESTION.md](./SEC_INGESTION.md). Candidates land in
`lacuna_deals` as `pending` — never auto-merge into verified JSON.

## Troubleshooting

| Symptom                 | Check                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health` 401       | Vercel Deployment Protection — bypass header or exempt liveness; see [MONITORING.md](./MONITORING.md)                                                           |
| `/api/health/ready` 503 | Dataset invalid, or `LACUNA_DATA_MODE=db` with a down database. Static mode still reports a stale `DATABASE_URL` under `checks.database` without failing ready. |
| Cron 401                | `CRON_SECRET` matches Vercel env                                                                                                                                |
| Cron 503 SEC            | `SEC_EDGAR_USER_AGENT` set                                                                                                                                      |
| Ingest status empty     | `DATABASE_URL` + migrations 003                                                                                                                                 |
| `ENOTFOUND` on Neon     | Stale `DATABASE_URL` on Vercel — remove it if you are on static mode, or `npm run db:restore -- --url "…"` then update Vercel env                               |
| DB SSL errors locally   | `PGSSLMODE=disable` in `.env.local` (remove for Neon)                                                                                                           |

## Related docs

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) — Vercel env checklist
- [SEC_INGESTION.md](./SEC_INGESTION.md) — ingest pipeline
- [FREE_API_DOWNLOADS.md](./FREE_API_DOWNLOADS.md) — free public API batch
  exports
- [DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) — verified dataset
  workflow
- [AGENTS.md](../AGENTS.md) — contributor conventions
