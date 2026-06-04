# Lacuna infrastructure

Operational guide for CI, Vercel, Postgres, SEC cron, and monitoring. **Framer marketing is out of scope** — see [SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md).

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
  end
  ci --> vercel
  app --> json
  app -->|LACUNA_DATA_MODE=db| pg
  cron --> pg
```

| Layer | Location | Notes |
| --- | --- | --- |
| App | Vercel — https://lacuna-maekass.vercel.app | Next.js 16, default `static` data |
| CI | `.github/workflows/deno.yml` | lint, test, build, dataset validation |
| Cron | `vercel.json` → `/api/cron/sec-ingest` | 06:00 UTC daily (Hobby-safe) |
| DB | `db/migrations/*.sql` | Verified dataset + `lacuna_deals` + ingest runs |
| Local DB | `docker-compose.yml` | Postgres 16 for dev |

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

## Environment variables

Copy [`.env.example`](../.env.example) to `.env.local`. Production checklist: [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

| Variable | When |
| --- | --- |
| `LACUNA_DATA_MODE` | `static` (default) or `db` |
| `DATABASE_URL` | db mode, SEC sync, `/api/cron/sec-ingest/status` |
| `CRON_SECRET` | Production cron auth |
| `SEC_EDGAR_USER_AGENT` | Required for SEC ingest |
| `LACUNA_INGEST_RUN_TRACKING` | Recommended — `lacuna_ingest_runs` audit |
| `SEC_USE_DB_CURSOR` | Recommended — incremental daily scans |

AI and Sentry: [INFERENCE.md](./INFERENCE.md), [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run validate:dataset` | Schema + provenance validation on JSON |
| `npm run infra:check` | Env checklist + health aggregate (exit 1 if unhealthy) |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:import` | Load `dataset.verified.json` into Postgres |
| `npm run sec:ingest` | SEC pipeline (CLI) |

## HTTP endpoints (ops)

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | Readiness — dataset validation + optional DB ping |
| `GET /api/cron/sec-ingest` | `Bearer CRON_SECRET` | Run SEC ingest (Vercel Cron) |
| `GET /api/cron/sec-ingest/status` | Public | Latest ingest run (needs `DATABASE_URL`) |
| `GET /api/dataset/verified` | Public | Verified dataset JSON export |

Point Datadog synthetics (or uptime checks) at `/api/health` — expect HTTP 200 and `ok: true`.

## Vercel deploy

1. Link repo and set env vars (see PRODUCTION_SETUP).
2. `vercel env pull .env.local` then `npm run db:migrate` against production DB.
3. Confirm cron: Vercel → Cron Jobs shows `0 6 * * *` → `/api/cron/sec-ingest`.
4. Smoke: `curl -s https://lacuna-maekass.vercel.app/api/health | jq .ok`

Cron auth lives in `src/lib/infra/cronAuth.ts` — without `CRON_SECRET`, non-production allows open access; production requires the bearer token.

## CI

Workflow: `.github/workflows/deno.yml` (job name **CI**).

```bash
npm run lint && npm test && npm run build && npm run validate:dataset
```

Branch protection (optional): `./scripts/configure-branch-protection.sh` — requires `gh` admin on the repo.

Datadog synthetics: `.github/workflows/datadog-synthetics.yml` — manual `workflow_dispatch` until `DD_*` secrets exist.

## SEC ingest

Full behavior: [SEC_INGESTION.md](./SEC_INGESTION.md). Candidates land in `lacuna_deals` as `pending` — never auto-merge into verified JSON.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/api/health` 503 | `npm run validate:dataset`; if `db` mode, `npm run db:import` |
| Cron 401 | `CRON_SECRET` matches Vercel env |
| Cron 503 SEC | `SEC_EDGAR_USER_AGENT` set |
| Ingest status empty | `DATABASE_URL` + migrations 003 |
| DB SSL errors locally | `PGSSLMODE=disable` in `.env.local` |

## Related docs

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) — Vercel env checklist
- [SEC_INGESTION.md](./SEC_INGESTION.md) — ingest pipeline
- [DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) — verified dataset workflow
- [AGENTS.md](../AGENTS.md) — contributor conventions
