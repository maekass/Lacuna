# Dataset changelog

Human-readable notes when verified acquisitions are promoted from staging.

## Current snapshot baseline

Compared against `src/data/computed-dataset-summary.json`:

| Field           | Baseline value |
| --------------- | -------------- |
| Verified deals  | 61             |
| Last updated    | 2026-10-19     |
| Dataset version | v11            |

2026-10-19 — v11. Added `deal61` Labcorp / BioReference Health select assets
(announced **2024-03-28**; Asset Purchase Agreement dated 2024-03-27; closed
**2024-09-16**; `dealValue` 237.5, cash) on new catalog row `c152`. Scope:
clinical diagnostics and reproductive and women's health testing outside New
York and New Jersey; oncology, urology and NY/NJ excluded. Primary: OPKO 8-K
Item 1.01
https://www.sec.gov/Archives/edgar/data/944809/000143774924009695/opk20240311_8k.htm
and Item 2.01
https://www.sec.gov/Archives/edgar/data/944809/000143774924029310/opk20240903_8k.htm.
Acquirer releases:
https://ir.labcorp.com/news-releases/news-release-details/labcorp-announces-acquisition-select-assets-bioreference-healths
and
https://ir.labcorp.com/news-releases/news-release-details/labcorp-completes-acquisition-select-assets-bioreference-healths.
Independent: MedTech Dive
https://www.medtechdive.com/news/labcorp-buys-bioreference-reproductive-women-health-assets/711713/.

Modeling: asset carve-outs are separate catalog rows named for the business
sold, with the seller's HQ (precedents c34, c54, c67). `c152` is the 2024
bundle; `c151` is renamed to the 2026 bundle (`deal60`). Every target keeps one
deal. `deal61` is annotated `scope: adjacency` because its price is not
allocated between general clinical diagnostics and women's health, the same rule
used for `deal60`, so the WH-only total stays $22.1B. Companies 151 → 152;
missing founded years 48 → 49 (open `c152` ledger row).
`observedCatalogComposition` now counts acquired companies rather than deals (a
guard; no number changes under one-deal-per-target). Follow-ups from the PR #287
review: asset-scoped names, a `pending_regulatory` transition on `deal60`, and
`c151.hq` re-sourced to explicit headquarters statements.

2026-10-17 — v10. Added `deal60` Labcorp / BioReference Health select assets
(announced 2026-10-15; Asset Purchase Agreement dated 2026-10-14) and target
company `c151`. Primary: OPKO Health 8-K Item 1.01
https://www.sec.gov/Archives/edgar/data/944809/000119312526422877/opk-20261014.htm.
Acquirer release:
https://ir.labcorp.com/news-releases/news-release-details/labcorp-enters-agreement-opko-health-acquire-select-assets.
Independent: CLP Magazine
https://clpmag.com/lab-management/company-news/labcorp-acquires-bioreference-health-assets-4kscore-test/.
`dealValue` 722 is cash at closing, subject to a revenue-based adjustment;
earnout up to $150M on 4Kscore revenue. Pending HSR clearance (outside date
2027-04-14), so no `closedDate`. Annotated `scope: adjacency` (mixed clinical,
women's health, urology, corrections and prostate-test carve-out), so it is
excluded from women's-health-only totals and, while pending, from
completed-lifecycle totals. Founding year left blank with an open ledger row.

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
