# Lacuna performance & production discipline

Engineering notes from a production readiness pass — treat the demo like
software that ships, not a slide deck with a build step.

## Principles

1. **One copy of truth** — verified JSON is loaded on the server and passed
   through `VerifiedDatasetProvider`. Never import `dataset.verified.json` from
   `'use client'` modules.
2. **Split probes** — `/api/health` is liveness (cheap); `/api/health/ready` is
   readiness (heavier). Point uptime monitors at liveness only.
3. **Bound fan-out** — SEC classification uses `SEC_CLASSIFY_CONCURRENCY`
   (default 3). Evidence enrichment caps at 20 companies per click and
   prioritizes genomics/diagnostics targets first.
4. **Code-split the dashboard** — below-the-fold sections load via
   `next/dynamic` in `src/app/lazyDashboard.tsx`.
5. **Fail closed** — production cron requires `CRON_SECRET`; missing secret does
   not open `/api/cron/sec-ingest`.

## Caching

| Layer                | Mechanism                                              |
| -------------------- | ------------------------------------------------------ |
| Static dataset (RSC) | `unstable_cache` in `cachedDataset.ts`, 24h revalidate |
| Home page            | `export const revalidate = 86400` on `page.tsx`        |
| Dataset API          | `Cache-Control: public, max-age=3600`                  |

## Bundle hygiene

- Quarantined TensorFlow tests run only when `RUN_QUARANTINE_ML=1`.
- Removed unused `ml-matrix` dependency (cosine similarity is inline in
  `CompanySimilarity`).
- D3 force graph debounces resize (150ms) before restarting simulation.

## Genomics-scale data (metadata, not raw VCF)

Lacuna does **not** host variant call sets or BAM/FASTA files. Genomics
scalability here means large **catalogs of diagnostics companies, trials, and
deal metadata**:

| Pattern               | Where                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Paginated dataset API | `GET /api/dataset/verified?resource=companies&limit=50&offset=0&genomics=true`   |
| DB `LIMIT/OFFSET`     | `loadCompaniesPage` / `loadAcquisitionsPage` when `LACUNA_DATA_MODE=db`          |
| Upstream caps         | Clinical trials `limit` ≤ 100; evidence CTG `limit` ≤ 100; batch NCT lookup ≤ 25 |
| Sector index          | `db/migrations/004_genomics_query_indexes.sql`                                   |

Multi-GB VCF blobs: object storage + ClickHouse variant catalog — see
[GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md). Disabled by default on
Vercel (`LACUNA_VARIANT_STORE=off`).

## Related

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — ops runbook
- [SEC_INGESTION.md](./SEC_INGESTION.md) — ingest bounds
