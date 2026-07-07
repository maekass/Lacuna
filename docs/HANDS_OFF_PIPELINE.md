# Hands-off weekly deal pipeline

Set this up **once**. After that, no weekly review unless you want to.

## What runs automatically (Mondays 07:00 UTC)

GitHub Action
[`.github/workflows/weekly-deal-pipeline.yml`](../.github/workflows/weekly-deal-pipeline.yml):

```
SEC scan → classify → staging (Postgres)
    → auto-approve (high-confidence WH only)
    → promote → dataset.verified.json
    → compute:all → validate → git commit → Vercel deploys
```

Vercel cron [`/api/cron/sec-ingest`](../src/app/api/cron/sec-ingest/route.ts)
runs the same hands-off chain when `LACUNA_HANDS_OFF_INGEST=true` (best with
`LACUNA_DATA_MODE=db`).

## One-time setup

### GitHub repo secrets

| Secret                 | Example                                                |
| ---------------------- | ------------------------------------------------------ |
| `DATABASE_URL`         | `postgresql://...@...neon.tech/lacuna?sslmode=require` |
| `SEC_EDGAR_USER_AGENT` | `Lacuna Research you@example.edu`                      |

### Vercel production env (optional — db-mode live app without waiting for git)

| Variable                     | Value               |
| ---------------------------- | ------------------- |
| `DATABASE_URL`               | same as GitHub      |
| `CRON_SECRET`                | random bearer token |
| `SEC_EDGAR_USER_AGENT`       | same as GitHub      |
| `LACUNA_HANDS_OFF_INGEST`    | `true`              |
| `LACUNA_DATA_MODE`           | `db`                |
| `LACUNA_INGEST_RUN_TRACKING` | `true`              |
| `SEC_USE_DB_CURSOR`          | `true`              |

Run once locally: `npm run db:migrate && npm run db:import`

## Safety rails (still on)

| Gate                  | Rule                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Women's health filter | Non-WH filings never enter staging                                                        |
| Auto-approve          | **High** confidence only (default); set `LACUNA_AUTO_APPROVE_CONFIDENCE=medium` to loosen |
| Low confidence        | Stays in review queue for manual approve                                                  |
| Validation            | `validate:dataset` must pass before git commit                                            |
| Duplicate filings     | Same SEC URL won't merge twice                                                            |

## Manual override

Review queue still works at `/deals#data-pipelines` when you want to curate edge
cases.

```bash
npm run pipeline:weekly   # run the full chain locally
```

## Env reference

| Variable                         | Default | Purpose                 |
| -------------------------------- | ------- | ----------------------- |
| `LACUNA_HANDS_OFF_INGEST`        | `false` | Master switch           |
| `LACUNA_AUTO_APPROVE_CONFIDENCE` | `high`  | `high` or `medium`      |
| `LACUNA_PROMOTE_TARGET`          | `both`  | `json`, `db`, or `both` |
