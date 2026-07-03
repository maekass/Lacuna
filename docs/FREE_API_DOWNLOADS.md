# Free public API batch downloads

Lacuna can enrich verified-dataset entities from **free** government and open
sources — no PitchBook/CapIQ license required.

## Quick start

```bash
cp .env.example .env.local
# SEC_EDGAR_USER_AGENT and NCBI_TOOL_EMAIL are pre-filled in .env.example

npm run download:free-apis              # full run
npm run download:free-apis -- --limit 5 # smoke test
```

Output: `data/exports/free-apis/<timestamp>/` (gitignored).

## Sources

| Source                      | Flag                  | Requires                         |
| --------------------------- | --------------------- | -------------------------------- |
| SEC submissions             | `sec_submissions`     | Ticker + `SEC_EDGAR_USER_AGENT`  |
| SEC company facts (XBRL)    | `sec_company_facts`   | Ticker + `SEC_EDGAR_USER_AGENT`  |
| ClinicalTrials.gov          | `clinical_trials_gov` | —                                |
| openFDA                     | `openfda`             | —                                |
| NIH RePORTER                | `nih_reporter`        | —                                |
| PubMed                      | `pubmed`              | `NCBI_TOOL_EMAIL` (recommended)  |
| PatentsView                 | `patentsview`         | `PATENTSVIEW_API_KEY` (optional) |
| Wikidata                    | `wikidata`            | —                                |
| EU Clinical Trials Register | `eu_clinical_trials`  | —                                |

CMS bulk files are **not** automated — download from
[data.cms.gov](https://data.cms.gov).

## In the app

- **Deals workspace** → **Data pipelines** panel shows SEC ingest status and
  latest free-API export metadata.
- `GET /api/ingest/sec/status` — latest SEC cron run (needs Postgres).
- `GET /api/ingest/free-apis/status` — latest on-disk export manifest.
- `GET /api/enrichment/company?name=…` — on-demand CT.gov + openFDA + NIH RePORTER.

See [PUBLIC_RECORDS_INGEST.md](./PUBLIC_RECORDS_INGEST.md) for Form D, EFTS, AACT, and CMS bulk scripts.

## Code layout

| Path                                     | Role                         |
| ---------------------------------------- | ---------------------------- |
| `scripts/download-free-apis.ts`          | CLI entry                    |
| `src/lib/ingestion/freeApi/`             | Fetch clients + orchestrator |
| `src/lib/ingestion/secIngestPipeline.ts` | SEC 8-K ingest (cron + CLI)  |

See also [SEC_INGESTION.md](./SEC_INGESTION.md) and
[INFRASTRUCTURE.md](./INFRASTRUCTURE.md).
