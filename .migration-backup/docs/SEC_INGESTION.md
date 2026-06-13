# SEC EDGAR ingestion

Live M&A candidate pipeline from SEC 8-K Item 2.01 filings. Candidates land in
`lacuna_deals` with `status=pending` for human review — **never** auto-merged
into `dataset.verified.json`.

## Architecture

| Module                                          | Role                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `src/lib/ingestion/secEdgarConnector.ts`        | SEC submissions + archives fetch, Item 2.01 heuristic parse |
| `src/lib/ingestion/dealClassificationEngine.ts` | Women's health keyword classification + confidence          |
| `src/lib/ingestion/databaseSync.ts`             | PostgreSQL upsert into `lacuna_deals`                       |
| `src/lib/ingestion/monitoringAlerts.ts`         | Structured JSON logs (API failures, new deals)              |
| `src/lib/ingestion/secIngestPipeline.ts`        | Orchestration (scan → classify → sync)                      |
| `src/lib/ingestion/index.ts`                    | Public exports for CLI, cron, future MCP server             |

Legacy keyword scan (no Item 2.01 parse): `secEdgarClient.ts` +
`npm run sec:scan`.

## Environment variables

| Variable                         | Required        | Description                                                                                   |
| -------------------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `SEC_EDGAR_USER_AGENT`           | **Yes**         | SEC fair-access User-Agent, e.g. `Lacuna Research mps5cy@virginia.edu`                        |
| `DATABASE_URL`                   | For DB sync     | PostgreSQL connection string                                                                  |
| `CRON_SECRET`                    | Production cron | Bearer token for `/api/cron/sec-ingest`                                                       |
| `SEC_SCAN_SINCE`                 | No              | ISO date floor (default: Jan 1 prior year)                                                    |
| `SEC_LIMIT_PER_TICKER`           | No              | Max 8-K filings per ticker (default: 15)                                                      |
| `SEC_EXTRA_TICKERS`              | No              | Comma-separated extra tickers                                                                 |
| `SEC_HEALTHCARE_SIC_ONLY`        | No              | `true` to skip non-283x/384x SIC companies                                                    |
| `PGSSLMODE`                      | No              | Set `disable` for local Postgres                                                              |
| `SEC_MAX_TICKERS_PER_RUN`        | No              | Hard cap on tickers per ingest run (default: no cap)                                          |
| `SEC_MAX_PARSED_FILINGS_PER_RUN` | No              | Hard cap on parsed filings per ingest run (default: no cap)                                   |
| `SEC_USE_DB_CURSOR`              | No              | `true` to use `lacuna_ingest_state.last_successful_since_date` when `SEC_SCAN_SINCE` is unset |
| `LACUNA_INGEST_RUN_TRACKING`     | No              | `true` to persist `lacuna_ingest_runs` audit records during cron runs                         |

### AI classification (optional)

Structured classification uses the
[Vercel AI Gateway](https://vercel.com/docs/ai-gateway) when gateway auth is
present; otherwise keyword-only fallback (no API keys required).

| Variable                 | Required              | Description                                                                                                     |
| ------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `VERCEL_OIDC_TOKEN`      | On Vercel / local dev | Auto-provisioned OIDC token — run `vercel link` and `vercel env pull .env.local` (refreshes ~every 24h locally) |
| `AI_GATEWAY_API_KEY`     | CI / non-Vercel       | Static gateway key when OIDC is unavailable                                                                     |
| `OPENAI_API_KEY`         | Fallback              | Direct OpenAI via `@ai-sdk/openai` when no gateway auth                                                         |
| `SENTRY_DSN`             | No                    | Enable Sentry server/edge error reporting for cron + APIs                                                       |
| `NEXT_PUBLIC_SENTRY_DSN` | No                    | Optional client DSN (browser errors + replays if enabled)                                                       |

**Auth priority:** `AI_GATEWAY_API_KEY` → `VERCEL_OIDC_TOKEN` → `OPENAI_API_KEY`
→ keyword-only.

**Model:** `openai/gpt-5.4-mini` (gateway slug) — cost-efficient classification;
requests tagged `feature:sec-ingest` for usage attribution.

Enable AI Gateway in the Vercel project settings before deploying the cron
route.

## Database

```bash
npm run db:migrate   # applies 001_verified_dataset.sql + 002_lacuna_deals.sql
```

Table `lacuna_deals` — unique on `sec_accession`. Status flow: `pending` /
`pending_review` → manual `approved` / `rejected`.

### Ingest run state (recommended for production)

Migration `003_lacuna_ingest_runs.sql` adds:

- `lacuna_ingest_runs` — durable audit trail of each cron/CLI run
  (success/failure, counts)
- `lacuna_ingest_state` — single-row cursor store (`last_successful_since_date`)
  for incremental daily scans

### Production setup (Vercel Hobby)

1. **Create a Postgres database** (Vercel Postgres / Neon) and copy its
   connection string.
2. **Set Vercel environment variables** (Production):
   - `DATABASE_URL` — Postgres connection string
   - `LACUNA_INGEST_RUN_TRACKING=true` — persist `lacuna_ingest_runs`
   - `SEC_USE_DB_CURSOR=true` — use
     `lacuna_ingest_state.last_successful_since_date` when `SEC_SCAN_SINCE` is
     unset
   - `CRON_SECRET` — protects `/api/cron/sec-ingest`
   - `SEC_EDGAR_USER_AGENT` — SEC fair-access UA
3. **Apply migrations** against the production DB:

```bash
vercel link
vercel env pull .env.local
npm run db:migrate
```

After this, `/api/cron/sec-ingest/status` will return the latest ingest run row
(or 503 if DB is missing).

## Run ingest

```bash
export SEC_EDGAR_USER_AGENT="Lacuna Research mps5cy@virginia.edu"
export DATABASE_URL="postgresql://..."

npm run sec:ingest           # full pipeline
npm run sec:ingest -- --dry-run   # scan + classify, no DB writes
```

## Scheduled runs

Vercel Cron is configured in `vercel.json` (`0 6 * * *` — once daily at 06:00
UTC → `/api/cron/sec-ingest`). This schedule fits **Hobby** plans (max one run
per day; actual invocation may drift by up to ~59 minutes). Set `CRON_SECRET` in
Vercel env; Vercel sends `Authorization: Bearer <CRON_SECRET>`.

For more frequent polling (e.g. every 6 hours), use **Pro** cron or an external
scheduler: Render cron, GitHub Actions, or `npm run sec:ingest` on a VPS.

## MCP / programmatic use

No in-repo MCP server yet. Import from `@/lib/ingestion`:

```typescript
import { classifyDeal, parseItem201, runSecIngest } from "@/lib/ingestion";
```

Suggested future MCP tools: `sec_scan_acquisitions`, `sec_classify_deal`,
`sec_sync_deals`.

## Parsing limitations (honest)

- **Not XBRL** — regex/heuristics on HTML-stripped filing text only.
- **Item 2.01 boundaries** vary by filer; excerpts may bleed into adjacent
  items.
- **Target names** often buried in exhibits (EX-2.1) not parsed in v1.
- **Deal values** frequently undisclosed or in tables we do not parse.
- **False negatives** — non-healthcare acquirers acquiring femtech targets may
  be missed unless ticker is in scan list.
- **False positives** — generic healthcare keywords on non-women's-health deals.

All candidates require analyst review before promotion to the verified dataset.
