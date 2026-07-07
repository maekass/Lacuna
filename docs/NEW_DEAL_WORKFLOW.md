# New deal workflow

Step-by-step guide for promoting a candidate into **verified** data and
refreshing all quantitative models. Pair with
[DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) for field rules.

**Verified** = row in `src/data/dataset.verified.json` that passes
`npm run validate:dataset` and has dual-attested public sources. SEC ingest and
CSV staging never auto-merge.

---

## Pipeline overview

```
SEC cron / sec:ingest / sec:scan
        ↓
  lacuna_deals (Postgres)  OR  staging/deals_candidates.csv
        ↓
  Human review (dual sources, evidence grade A–C)
        ↓
  Edit dataset.verified.json
        ↓
  validate:dataset → compute:all → test → commit
        ↓
  Optional: db:import (LACUNA_DATA_MODE=db)
```

---

## Step 1 — Discover candidates

### Automated (staging only)

```bash
# Production: weekly Mon 06:00 UTC → /api/cron/sec-ingest
export SEC_EDGAR_USER_AGENT="Lacuna Research you@example.edu"
export DATABASE_URL="postgres://..."

npm run db:migrate
npm run sec:ingest              # full pipeline → lacuna_deals (status=pending)
npm run sec:scan                # lighter scan → staging/sec_candidates.csv (gitignored)
```

Check ingest health:

```bash
curl https://your-app.vercel.app/api/ingest/sec/status
```

### Manual

- Press release, 8-K, or trade press tip
- Copy `staging/deals_candidates.template.csv` → `staging/deals_candidates.csv`
- Fill one row per candidate (`status=pending`)

---

## Step 2 — Human review (required)

Before merge, every deal needs:

| Check            | Rule                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| Primary source   | SEC filing or acquirer/target press release (grade A–B)                      |
| Secondary source | Independent corroboration (different publisher or filing type)               |
| Parties          | Legal names match sources                                                    |
| Date             | `announcedDate` matches primary source (ISO `YYYY-MM-DD`)                    |
| Price            | `dealValue` **only** if disclosed in A/B source; else omit + `dealValueNote` |
| Inclusion        | Women's health scope or documented exception in `provenance.notes[]`         |
| Staging status   | `approved` in CSV or `lacuna_deals` before JSON merge                        |

**Reject** grade D–E (aggregator-only, social, unnamed sources).

---

## Step 3 — Add rows to `dataset.verified.json`

### 3a. New target company (if not already in `companies[]`)

```json
{
  "id": "c136",
  "name": "Example FemTech Co",
  "sector": "Fertility",
  "stage": "Series B",
  "founded": 2018,
  "hq": "Boston, MA",
  "description": "One sentence from website or filing.",
  "lastKnownValuation": 120,
  "valuationSource": "Series B press release, March 2024",
  "totalFunding": 85,
  "sources": [
    "https://www.sec.gov/Archives/edgar/data/.../example-8k.htm",
    "https://www.businesswire.com/news/home/example-press-release"
  ]
}
```

Rules: stable `id` (never reuse), **≥2 `sources[]`**, valuation only with
`valuationSource`.

### 3b. New acquirer (if not in `companies[]` or `acquirers[]`)

```json
{
  "id": "acquirer-example",
  "name": "Example Health Corp",
  "ticker": "EXMP",
  "sector": "Healthcare",
  "hq": "New York, NY"
}
```

Corporate buyers already in `companies[]` (e.g. Ro) can be `acquirerId` without
a separate acquirer row — document in `dealValueNote`.

### 3c. Acquisition row

```json
{
  "id": "deal60",
  "targetId": "c136",
  "acquirerId": "acquirer-example",
  "targetName": "Example FemTech Co",
  "acquirerName": "Example Health Corp",
  "announcedDate": "2025-11-14",
  "closedDate": "2026-01-30",
  "dealValue": 450,
  "dealValueNote": "Disclosed in 8-K Item 2.01; enterprise value per filing.",
  "dealType": "Acquisition",
  "source": "https://www.sec.gov/Archives/edgar/data/.../example-8k.htm",
  "strategicRationale": "One sentence from primary source language."
}
```

If price is **undisclosed**:

```json
"dealValueNote": "Terms not disclosed per joint press release; strategic tuck-in."
```

Omit `dealValue` entirely.

### 3d. Bump provenance

```json
"provenance": {
  "lastUpdated": "2026-07-02",
  "datasetVersion": "v8",
  ...
}
```

Bump `lastUpdated` on every release; bump `datasetVersion` when shipping a
curated release.

---

## Step 3b — Auto-promote approved deals (optional)

| Path       | How                                                          |
| ---------- | ------------------------------------------------------------ |
| **UI**     | `/deals#data-pipelines` → **Approve & add to verified**      |
| **CLI**    | `npm run deals:promote-approved`                             |
| **GitHub** | Weekly workflow `promote-approved-deals.yml` → commits JSON  |
| **Vercel** | Cron `/api/cron/promote-approved` when `LACUNA_DATA_MODE=db` |

Set `LACUNA_AUTO_PROMOTE=true` to promote on Approve via the review API.
Auto-promote still requires **reviewer-attested** profile fields (sector, HQ,
founded year, secondary source) — see
[DATA_BOUNDARIES.md](./DATA_BOUNDARIES.md). Keyword or LLM classification alone
never satisfies promotion gates.

---

## Step 4 — Validate and refresh models

```bash
npm run validate:dataset    # 0 errors required
npm run compute:all         # refreshes all quantitative artifacts (see below)
npm test
npm run build               # optional local smoke
```

`compute:all` regenerates:

| Artifact                             | Model / script                                   |
| ------------------------------------ | ------------------------------------------------ |
| `computed-benchmarks.json`           | Sector valuation multiples (dealValue / funding) |
| `computed-growth-rates.json`         | CAGR estimates per company                       |
| `computed-acquirer-premiums.json`    | Buyer premium heuristics                         |
| `computed-sector-correlations.json`  | Reimbursement × valuation correlations           |
| `computed-data-quality-scores.json`  | Per-entity provenance grades (A–F)               |
| `computed-confidence-intervals.json` | Bootstrap CIs on benchmarks                      |
| `computed-dataset-summary.json`      | Hub headline stats (`computeHeadlineStats/v1`)   |

CI runs `compute:all` + `verify:computed` on every PR — commit the updated JSON
files with your dataset change.

### What updates in the app automatically

After deploy, these read live from the verified dataset (no separate artifact):

- Hub stat tiles (`useDashboardData` → `computeHeadlineStats`)
- `GET /api/dataset/summary`
- Empirical priors, quant engine, exit indicator, similarity, clustering
- Network graph, valuation matrix, fairness audit

---

## Step 5 — Optional Postgres sync

```bash
npm run db:import
```

Sets `LACUNA_DATA_MODE=db` in production to serve from Postgres. JSON remains
source of truth; import is one-way.

---

## Step 6 — Commit checklist

- [ ] `dataset.verified.json` — new/updated rows + provenance bump
- [ ] All 7 `computed-*.json` files from `compute:all` (if dataset changed)
- [ ] `npm run validate:dataset` — 0 errors
- [ ] `npm test` — green
- [ ] Staging CSV row marked `merged` (local only; gitignored)
- [ ] `lacuna_deals` status → `approved` in Postgres (if using DB staging)

Suggested commit message:

```
feat: add deal60 Example FemTech → Example Health (8-K verified)
```

---

## Quick reference

```bash
# Full release workflow after editing JSON
npm run validate:dataset && npm run compute:all && npm test

# Individual models
npm run compute:benchmarks
npm run compute:data-quality

# Check CI will pass
npm run verify:computed
```

## Related docs

- [DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) — field schema +
  evidence grades
- [SEC_INGESTION.md](./SEC_INGESTION.md) — weekly SEC cron + env vars
- [MODEL_CARD.md](./MODEL_CARD.md) — what the quant layer does (and does not do)
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — CI, cron, Postgres
