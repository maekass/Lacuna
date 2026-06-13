# Data curation checklist

Use this before merging any row into `src/data/dataset.verified.json`. Staging
candidates live in `staging/deals_candidates.csv` (copy from
`staging/deals_candidates.template.csv`). **Never auto-merge** from SEC scans or
CSV imports.

## JSON schema — required fields

### `provenance`

| Field         | Required    | Rule                                             |
| ------------- | ----------- | ------------------------------------------------ |
| `lastUpdated` | Yes         | ISO date `YYYY-MM-DD`; bump on every release     |
| `purpose`     | Yes         | Educational scope statement                      |
| `disclaimer`  | Yes         | Independent verification warning                 |
| `sources[]`   | Yes         | Global source categories (SEC, press, etc.)      |
| `notes[]`     | Recommended | Effective n, boundary cases, methodology caveats |

### `companies[]`

| Field                | Required     | Rule                                                                         |
| -------------------- | ------------ | ---------------------------------------------------------------------------- |
| `id`                 | Yes          | Stable slug (`c1`, `c23`); never reuse after publish                         |
| `name`               | Yes          | Legal or brand name at time of curation                                      |
| `sector`             | Yes          | One of: Fertility, Mental Health, General Wellness, Wearables, Pelvic Health |
| `stage`              | Yes          | Verifiable label (funding round, acquired, public)                           |
| `founded`            | Yes          | Integer year                                                                 |
| `hq`                 | Yes          | City, region/country                                                         |
| `description`        | Yes          | One sentence from website or filing                                          |
| `sources[]`          | Yes          | **≥2 URLs or citations** per company                                         |
| `lastKnownValuation` | Optional     | Only with `valuationSource`                                                  |
| `valuationSource`    | If valuation | Round, merger, or market cap basis + date                                    |
| `totalFunding`       | Optional     | Crunchbase/press OK with `sources[]`                                         |

### `acquirers[]`

| Field          | Required | Rule                             |
| -------------- | -------- | -------------------------------- |
| `id`           | Yes      | Stable slug (`acquirer-teladoc`) |
| `name`         | Yes      |                                  |
| `ticker`       | Optional | For SEC scans                    |
| `sector`, `hq` | Yes      |                                  |

Corporate buyers that are also portfolio companies (e.g. Ro) may appear as
`companies.id` on `acquisitions.acquirerId`. Document in `dealValueNote` or
provenance `notes[]`.

### `acquisitions[]`

| Field                        | Required                | Rule                                                     |
| ---------------------------- | ----------------------- | -------------------------------------------------------- |
| `id`                         | Yes                     | Stable slug (`deal7`)                                    |
| `targetId`, `acquirerId`     | Yes                     | Must resolve to `companies` or `acquirers`               |
| `targetName`, `acquirerName` | Yes                     | Denormalized for export/display                          |
| `announcedDate`              | Yes                     | ISO date; match primary source                           |
| `closedDate`                 | Optional                | Omit if unknown                                          |
| `dealType`                   | Yes                     | `Acquisition` \| `Strategic Investment` \| `Partnership` |
| `source`                     | Yes                     | Best single citation (filing > PR > press)               |
| `strategicRationale`         | Yes                     | One sentence from primary source language                |
| `dealValue`                  | Optional                | **Only if disclosed** in A/B source                      |
| `dealValueNote`              | If no value or estimate | Required when `dealValue` omitted or estimated           |

## Evidence grades (internal)

| Grade | Source                           | Merge rule                        |
| ----- | -------------------------------- | --------------------------------- |
| A     | SEC 8-K / DEFM14A / 10-K note    | Price OK if in filing             |
| B     | Acquirer or target press release | Cross-check date with A or C      |
| C     | Tier-1 trade press               | Estimates need `dealValueNote`    |
| D     | Crunchbase / aggregator          | Discovery only; never sole source |
| E     | Social / unnamed                 | Reject                            |

**Dual-attestation:** primary + secondary URL before `status=approved` in
staging CSV.

## Pre-merge checklist

- [ ] Parties and `announcedDate` match primary source
- [ ] `targetId` exists; create company row first if needed
- [ ] `acquirerId` resolves; add acquirer row or document corporate buyer
- [ ] `dealValue` omitted OR cited with `dealValueNote`
- [ ] `sources[]` on new company rows have ≥2 entries
- [ ] Inclusion boundary documented (women's health or noted exception)
- [ ] Run `npm run validate:dataset` (0 errors)
- [ ] Run `npm test`
- [ ] Bump `provenance.lastUpdated`

## CLI

```bash
npm run validate:dataset          # FK checks, dual-source warnings, disclosure stats
npm run sec:scan                  # SEC 8-K candidates → staging/sec_candidates.csv
cp staging/deals_candidates.template.csv staging/deals_candidates.csv
```

Generated staging CSVs are gitignored; templates and this checklist are tracked.
