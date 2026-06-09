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

| Layer         | Location                                   | Notes                                                                                          |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| App           | Vercel — https://lacuna-maekass.vercel.app | Next.js 16, default `static` data                                                              |
| CI            | `.github/workflows/deno.yml`               | lint, test, build, dataset validation                                                          |
| Cron          | `vercel.json` → `/api/cron/sec-ingest`     | 06:00 UTC daily (Hobby-safe)                                                                   |
| DB            | `db/migrations/*.sql`                      | Verified dataset + `lacuna_deals` + ingest runs                                                |
| Local DB      | `docker-compose.yml`                       | Postgres 16 + ClickHouse 24 for dev                                                            |
| Variant store | `clickhouse/migrations/`                   | Callset catalog + variant summaries — [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md) |

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
docker compose --profile genomics up -d clickhouse
# .env.local: LACUNA_VARIANT_STORE=clickhouse, CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123
npm run clickhouse:migrate   # applies 001_variant_store + 002_audit_events
npm run clickhouse:seed
```

VCF ingest runs on the **standalone worker** — not Vercel. See
[INGEST_WORKER.md](./INGEST_WORKER.md).

### Rate limiting (Upstash Redis)

Production API routes use **Upstash Redis** when configured; local dev falls
back to in-memory buckets (not durable across serverless instances).

```bash
# Vercel Marketplace → Upstash Redis → add to project env
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Unset both vars locally — `rateLimit()` in `src/lib/api/rateLimit.ts` uses
in-memory fallback automatically.

## Environment variables

Copy [`.env.example`](../.env.example) to `.env.local`. Production checklist:
[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

| Variable                     | When                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `LACUNA_DATA_MODE`           | `static` (default) or `db`                                                                     |
| `DATABASE_URL`               | db mode, SEC sync, `/api/cron/sec-ingest/status`                                               |
| `CRON_SECRET`                | Production cron auth                                                                           |
| `SEC_EDGAR_USER_AGENT`       | Required for SEC ingest                                                                        |
| `LACUNA_INGEST_RUN_TRACKING` | Recommended — `lacuna_ingest_runs` audit                                                       |
| `SEC_USE_DB_CURSOR`          | Recommended — incremental daily scans                                                          |
| `LACUNA_VARIANT_STORE`       | `off` (default) or `clickhouse` — see [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md) |
| `CLICKHOUSE_URL`             | Required when variant store enabled                                                            |
| `UPSTASH_REDIS_REST_URL`     | Production rate limits (optional locally)                                                      |
| `UPSTASH_REDIS_REST_TOKEN`   | Production rate limits (optional locally)                                                      |
| `LACUNA_AUDIT_SALT`          | Salt for hashed IPs in `audit_events` (ClickHouse)                                             |
| `LACUNA_INGEST_CONSENT_REF`  | Required for non-demo VCF ingest on worker                                                     |

AI and Sentry: [INFERENCE.md](./INFERENCE.md),
[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Scripts

| Command                         | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `npm run validate:dataset`      | Schema + provenance validation on JSON                 |
| `npm run infra:check`           | Env checklist + health aggregate (exit 1 if unhealthy) |
| `npm run db:migrate`            | Apply SQL migrations                                   |
| `npm run db:import`             | Load `dataset.verified.json` into Postgres             |
| `npm run sec:ingest`            | SEC pipeline (CLI)                                     |
| `npm run clickhouse:migrate`    | Apply ClickHouse variant-store schema                  |
| `npm run clickhouse:seed`       | Infrastructure demo callset (local dev)                |
| `npm run clickhouse:ingest-vcf` | Stream VCF → object storage + ClickHouse (CLI)         |
| `npm run ingest:worker`         | Same ingest logic — standalone worker entrypoint         |

## HTTP endpoints (ops)

| Route                             | Auth                 | Purpose                                               |
| --------------------------------- | -------------------- | ----------------------------------------------------- |
| `GET /api/health`                 | Public               | **Liveness** — constant-time (use for synthetics)     |
| `GET /api/health/ready`           | Public               | **Readiness** — dataset validation + optional DB ping |
| `GET /api/cron/sec-ingest`        | `Bearer CRON_SECRET` | Run SEC ingest (Vercel Cron)                          |
| `GET /api/cron/sec-ingest/status` | Public               | Latest ingest run (needs `DATABASE_URL`)              |
| `GET /api/dataset/verified`       | Public               | Verified dataset JSON export                          |

**Uptime monitors:** `GET /api/health` only — see
[MONITORING.md](./MONITORING.md). Expect HTTP 200 and `probe: "live"`. Never
schedule `/api/health/ready` (deploy smoke / manual only).

## Vercel deploy

1. Link repo and set env vars (see PRODUCTION_SETUP).
2. `vercel env pull .env.local` then `npm run db:migrate` against production DB.
3. Confirm cron: Vercel → Cron Jobs shows `0 6 * * *` → `/api/cron/sec-ingest`.
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

Datadog synthetics: `.github/workflows/datadog-synthetics.yml` — manual
`workflow_dispatch` until `DD_*` secrets exist.

## SEC ingest

Full behavior: [SEC_INGESTION.md](./SEC_INGESTION.md). Candidates land in
`lacuna_deals` as `pending` — never auto-merge into verified JSON.

## Troubleshooting

| Symptom               | Check                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `/api/health` 401     | Vercel Deployment Protection — bypass header or exempt liveness; see [MONITORING.md](./MONITORING.md) |
| `/api/health` 503     | `npm run validate:dataset`; if `db` mode, `npm run db:import`                                         |
| Cron 401              | `CRON_SECRET` matches Vercel env                                                                      |
| Cron 503 SEC          | `SEC_EDGAR_USER_AGENT` set                                                                            |
| Ingest status empty   | `DATABASE_URL` + migrations 003                                                                       |
| DB SSL errors locally | `PGSSLMODE=disable` in `.env.local`                                                                   |

## Related docs

- [INGEST_WORKER.md](./INGEST_WORKER.md) — VCF ingest off Vercel
- [PATIENT_DATA_GOVERNANCE.md](./PATIENT_DATA_GOVERNANCE.md) — audit_events sink
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) — Vercel env checklist
- [SEC_INGESTION.md](./SEC_INGESTION.md) — ingest pipeline
- [DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) — verified dataset
  workflow
- [AGENTS.md](../AGENTS.md) — contributor conventions
