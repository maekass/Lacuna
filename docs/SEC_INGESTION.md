# SEC EDGAR ingestion

Live M&A candidate pipeline from SEC 8-K Item 2.01 filings. Candidates land in `lacuna_deals` with `status=pending` for human review — **never** auto-merged into `dataset.verified.json`.

## Architecture

| Module | Role |
| --- | --- |
| `src/lib/ingestion/secEdgarConnector.ts` | SEC submissions + archives fetch, Item 2.01 heuristic parse |
| `src/lib/ingestion/dealClassificationEngine.ts` | Women's health keyword classification + confidence |
| `src/lib/ingestion/databaseSync.ts` | PostgreSQL upsert into `lacuna_deals` |
| `src/lib/ingestion/monitoringAlerts.ts` | Structured JSON logs (API failures, new deals) |
| `src/lib/ingestion/secIngestPipeline.ts` | Orchestration (scan → classify → sync) |
| `src/lib/ingestion/index.ts` | Public exports for CLI, cron, future MCP server |

Legacy keyword scan (no Item 2.01 parse): `secEdgarClient.ts` + `npm run sec:scan`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SEC_EDGAR_USER_AGENT` | **Yes** | SEC fair-access User-Agent, e.g. `Lacuna Research you@example.com` |
| `DATABASE_URL` | For DB sync | PostgreSQL connection string |
| `CRON_SECRET` | Production cron | Bearer token for `/api/cron/sec-ingest` |
| `SEC_SCAN_SINCE` | No | ISO date floor (default: Jan 1 prior year) |
| `SEC_LIMIT_PER_TICKER` | No | Max 8-K filings per ticker (default: 15) |
| `SEC_EXTRA_TICKERS` | No | Comma-separated extra tickers |
| `SEC_HEALTHCARE_SIC_ONLY` | No | `true` to skip non-283x/384x SIC companies |
| `PGSSLMODE` | No | Set `disable` for local Postgres |

## Database

```bash
npm run db:migrate   # applies 001_verified_dataset.sql + 002_lacuna_deals.sql
```

Table `lacuna_deals` — unique on `sec_accession`. Status flow: `pending` / `pending_review` → manual `approved` / `rejected`.

## Run ingest

```bash
export SEC_EDGAR_USER_AGENT="Lacuna Research you@example.com"
export DATABASE_URL="postgresql://..."

npm run sec:ingest           # full pipeline
npm run sec:ingest -- --dry-run   # scan + classify, no DB writes
```

## Scheduled runs

Vercel Cron is configured in `vercel.json` (`0 6 * * *` — once daily at 06:00 UTC → `/api/cron/sec-ingest`). This schedule fits **Hobby** plans (max one run per day; actual invocation may drift by up to ~59 minutes). Set `CRON_SECRET` in Vercel env; Vercel sends `Authorization: Bearer <CRON_SECRET>`.

For more frequent polling (e.g. every 6 hours), use **Pro** cron or an external scheduler: Render cron, GitHub Actions, or `npm run sec:ingest` on a VPS.

## MCP / programmatic use

No in-repo MCP server yet. Import from `@/lib/ingestion`:

```typescript
import { runSecIngest, parseItem201, classifyDeal } from '@/lib/ingestion';
```

Suggested future MCP tools: `sec_scan_acquisitions`, `sec_classify_deal`, `sec_sync_deals`.

## Parsing limitations (honest)

- **Not XBRL** — regex/heuristics on HTML-stripped filing text only.
- **Item 2.01 boundaries** vary by filer; excerpts may bleed into adjacent items.
- **Target names** often buried in exhibits (EX-2.1) not parsed in v1.
- **Deal values** frequently undisclosed or in tables we do not parse.
- **False negatives** — non-healthcare acquirers acquiring femtech targets may be missed unless ticker is in scan list.
- **False positives** — generic healthcare keywords on non-women's-health deals.

All candidates require analyst review before promotion to the verified dataset.
