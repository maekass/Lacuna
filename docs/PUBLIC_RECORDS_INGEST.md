# Public records ingestion (Tiers 1 & 2)

Lacuna ingests **free government APIs** for clinical trials, M&A, private
funding, and company enrichment. Nothing auto-merges into
`dataset.verified.json` without human review.

## Tier 1 — REST APIs (automate daily/weekly)

| Source                | Command / endpoint                                     | Output                                         |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| ClinicalTrials.gov v2 | `npm run ml:ct:ingest -- --all-queries --max-pages 20` | `ml/clinical_trials/data/cached_training.json` |
| CT.gov live search    | `GET /api/clinical-trials?condition=endometriosis`     | JSON trials (User-Agent + `fields=`)           |
| SEC 8-K Item 2.01     | `npm run sec:ingest`                                   | `lacuna_deals` (Postgres)                      |
| SEC EFTS 8-K search   | `npm run sec:search-ma`                                | `staging/sec_ma_efts_hits.json`                |
| SEC Form D (Reg D)    | `npm run sec:ingest-form-d`                            | `lacuna_funding_events` (Postgres)             |
| Company enrichment    | `GET /api/enrichment/company?name=Hologic`             | CT.gov + openFDA + NIH RePORTER — **not** `/deals/[id]` until keyed to `targetId` with a public NCT/CPT citation |
| Free API batch        | `npm run download:free-apis`                           | `data/exports/free-apis/<timestamp>/`          |

### Environment

```bash
SEC_EDGAR_USER_AGENT="Lacuna Research you@example.edu"  # SEC fair access (required for SEC)
CTGOV_USER_AGENT="Lacuna-Research/1.0 (you@example.edu)"  # optional; reduces 403s
DATABASE_URL=...  # for sec:ingest and sec:ingest-form-d DB sync
```

### ClinicalTrials.gov tips

- Use `--fields` to trim payloads (`CTGOV_STUDY_FIELDS` in Python + TS)
- Paginate with `--max-pages` (100 studies/page, max 100/page)
- `--all-queries` runs all WH + negative condition queries
- Retrain after ingest: `npm run ml:ct:train`

### SEC Form D

Private placements under Regulation D — issuer name, offering size, industry
group. WH keyword classification only (no LLM required). Set
`SEC_FORM_D_SYNC_ALL=true` to store non-WH filings.

### SEC full-text (EFTS)

Discovers 8-K Item 2.01 filings across **all filers**, not just known acquirer
tickers. Staging JSON feeds manual review or future `parseItem201` batch.

## Tier 2 — Bulk downloads (monthly/weekly)

| Source                 | Command                                                 | Notes                                                                             |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AACT (CT.gov Postgres) | `AACT_USERNAME=… AACT_PASSWORD=… npm run download:aact` | Register at [aact.ctti-clinicaltrials.org](https://aact.ctti-clinicaltrials.org/) |
| SEC Form D daily index | `npm run sec:form-d-bulk -- --date 2025-06-01`          | Weekends/holidays may 404                                                         |
| CMS PUF catalog        | `npm run download:cms-bulk`                             | Probes data.cms.gov datasets                                                      |
| CMS CPT utilization    | `npx tsx scripts/fetch-cms-utilization.ts`              | Women's-health sector CPT volumes                                                 |

Outputs under `ml/clinical_trials/data/aact/`, `staging/`,
`data/exports/cms-bulk/` (gitignored).

## Database migrations

```bash
npm run db:migrate   # includes 007_lacuna_funding_events.sql
```

## Code layout

| Path                                          | Role                                |
| --------------------------------------------- | ----------------------------------- |
| `src/lib/ingestion/secFormDIngestPipeline.ts` | Form D EFTS → parse → classify → DB |
| `src/lib/ingestion/secFullTextSearch.ts`      | SEC EFTS wrapper                    |
| `src/lib/ingestion/secFormDConnector.ts`      | Form D XML parse                    |
| `src/lib/ingestion/companyEnrichment.ts`      | CT.gov + openFDA + NIH              |
| `src/lib/ingestion/publicRecords/`            | Shared WH terms + CT.gov client     |
| `ml/clinical_trials/scripts/ingest_ctgov.py`  | ML training cache ingest            |

## Citation

> Descriptive metadata from public U.S. government sources (ClinicalTrials.gov,
> SEC EDGAR, openFDA, NIH RePORTER, CMS). Educational use only — not investment
> or clinical advice.

See also [SEC_INGESTION.md](./SEC_INGESTION.md),
[ML_CLINICAL_TRIALS.md](./ML_CLINICAL_TRIALS.md),
[FREE_API_DOWNLOADS.md](./FREE_API_DOWNLOADS.md).
