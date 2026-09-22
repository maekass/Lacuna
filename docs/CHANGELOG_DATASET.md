# Dataset changelog

Human-readable notes when verified acquisitions are promoted from staging.

## Current snapshot baseline

Compared against `src/data/computed-dataset-summary.json`:

| Field           | Baseline value |
| --------------- | -------------- |
| Verified deals  | 59             |
| Last updated    | 2026-09-20     |
| Dataset version | v9             |

2026-09-20 — Teladoc/Livongo (`deal1`) announcement corrected to 2020-08-05
(Teladoc 8-K + IR). Close stays 2020-10-30. Hologic/Biotheranostics (`deal7`)
acquisition `source` now includes the 8-K so dual-source is not inferred from
`preDealValuationSource`. Appended 19 identity-checked SEC accession URLs from
source backfill. Portfolio `Diagnostic` renamed to `Diagnostic (portfolio)`. No
new deals.

2026-09-05 — pre-deal valuation as-of backfill: impossible mark dates reset to
the announced year, year-only sources forced to `YYYY-01-01` +
`preDealValuationDatePrecision: "year"`, and rounding-grid annotations where the
cited mark is a round $100M increment. No new deals.

Live count comes from `dataset.verified.json` → `provenance.lastUpdated`.

2026-09-20 — citation and taxonomy repair (no new deals): 19 identity-checked
SEC accession URLs appended from `staging/source-backfill`; Teladoc/Livongo
announcement date corrected to 2020-08-05; Hologic/Biotheranostics 8-K added to
the deal source; portfolio sector `Diagnostic` renamed `Diagnostic (portfolio)`
so it is not merged with acquired Diagnostics.

## Hub strip

`getDatasetChangelog()` in `src/lib/data/getDatasetChangelog.ts` diffs current
JSON vs computed snapshot. Hub and Methods use `DatasetCoverageFootnote` to show
**N verified · M staging candidates** (M from `GET /api/deals/pending/metrics`).
When deals are added and `npm run compute:all` has not yet refreshed the
snapshot, hub shows **"+N verified deals since …"**.

## After promoting new deals

1. Run `npm run compute:all` to refresh headline stats and snapshot.
2. Update this file with date, deal IDs, and primary sources.
3. Optional PR template snippet:

```markdown
## Dataset

- [ ] `npm run validate:dataset` passes
- [ ] `docs/CHANGELOG_DATASET.md` updated if acquisitions changed
- [ ] Promotion checklist completed for each new deal (dual-source gates)
```

## Candidate vs verified

| Layer    | Location                | Visible in charts?                   |
| -------- | ----------------------- | ------------------------------------ |
| Verified | `dataset.verified.json` | Yes                                  |
| Staging  | Postgres `lacuna_deals` | No — review queue on `/deals#review` |
