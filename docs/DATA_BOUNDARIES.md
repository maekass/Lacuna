# Data boundaries

Honest rules for what may enter **verified** data vs **staging** vs **enrichment
only**. Pair with [DATA_CURATION_CHECKLIST.md](./DATA_CURATION_CHECKLIST.md) and
[NEW_DEAL_WORKFLOW.md](./NEW_DEAL_WORKFLOW.md).

---

## Three tiers

| Tier                     | Storage                           | Grows `acquisitions[]`?  |
| ------------------------ | --------------------------------- | ------------------------ |
| **Verified**             | `src/data/dataset.verified.json`  | Yes — human promote only |
| **Staging candidates**   | `lacuna_deals`, CSV import        | No — review queue        |
| **Context / enrichment** | APIs, side panels, export folders | **Never**                |

---

## Deferred capabilities (allowed patterns)

### Unbounded web crawl

- **Forbidden:** Spider the open web into deals or verified JSON.
- **Allowed:** Bounded SEC cron/EFTS (WH filter, rate caps), manual CSV, named
  public record connectors documented in
  [PUBLIC_RECORDS_INGEST.md](./PUBLIC_RECORDS_INGEST.md).

### Auto-promote on LLM classification alone

- **Forbidden:** Merge because a model classified “M&A” or “women’s health.”
- **Forbidden:** Replace `strategicRationale` with an LLM summary of the 8-K.
  That field is curated copy from primary source language and lands in
  `dataset.verified.json` as written.
- **Allowed:** LLM for triage and other field suggestions. Human submits
  promotion form; `LACUNA_AUTO_PROMOTE` only after explicit `approved` +
  checklist.

### NIH / PubMed as deal discovery

- **Forbidden:** Create acquisition rows from grants or papers.
- **Allowed:** Company/research enrichment (grants, literature, name-search
  trials) with disclaimer: _not M&A evidence_.
- **Forbidden on `/deals/[id]`:** Live ClinicalTrials.gov / openFDA / CMS search
  by company name. Those APIs are enrichment. Show them on a deal dossier only
  when a reviewer has keyed the row to `targetId` with a public NCT or CPT
  citation (`keyedRegulatoryCitationsForTarget`).

### ClinicalTrials / FDA / CMS on deal pages

- **Forbidden:** Hydrate `/deals/[id]` from `/api/enrichment/company`,
  `/api/clinical-trials`, `/api/evidence/clinical-trials`, or
  `/api/evidence/fda` using the target or acquirer name.
- **Allowed later:** A curated `KeyedRegulatoryCitation` with `targetId` + NCT
  (`clinicaltrials.gov/study/NCT…`) or CPT/HCPCS (`cms.gov` / `*.cms.gov`).
  Until that catalog has rows, the dossier omits the panel.

### Crunchbase as universe expansion

- **Forbidden:** Bulk Crunchbase → verified `companies[]` / `acquisitions[]`
  without SEC or press dual attestation.
- **Allowed:** Grade D discovery queue; optional `crunchbaseUrl` /
  `totalFunding` with `sources[]` after curation
  ([evidence grade D](./DATA_CURATION_CHECKLIST.md)).

### Form D → verified M&A merge

- **Forbidden:** Promote `lacuna_funding_events` into `acquisitions[]`.
- **Allowed:** Separate Funding tab in Review Console; read-only cross-link on
  verified company pages (“SEC Form D · funding, not acquisition”).

---

## Promotion gate

Only **`lacuna_deals`** rows (or human-approved CSV) with dual-attested sources
and passing `promotionChecklist` may merge into `dataset.verified.json`.

```text
New data source?
├─ M&A announcement (8-K, PR)?     → lacuna_deals → review → promote
├─ Form D / funding?               → lacuna_funding_events only
├─ Grant / trial / paper?          → enrichment on existing entity
├─ Crunchbase / aggregator?        → discovery queue OR link field only
└─ Unbounded crawl?                → out of scope; define bounds first
```

---

## UI surfaces

| Surface                              | Data tier                                         |
| ------------------------------------ | ------------------------------------------------- |
| `/deals/[id]`                        | Verified M&A + target-keyed citations only        |
| `/deals/staging/[dealId]`            | Staging candidate                                 |
| `/deals#review` M&A tab              | `lacuna_deals`                                    |
| `/deals#review` Funding tab          | `lacuna_funding_events`                           |
| `/research` trial / FDA / CMS panels | Name-search enrichment — not verified M&A         |
| `/research` cited / affinity panels  | `cited_*` / `affinity` heuristics — research only |
| `/intelligence` fit / reimbursement  | Affinity scores — not deal premiums or comps      |
| Company enrichment panels            | Context only — does not increment deal counts     |

---

## Research and intelligence heuristics

`/research` and `/intelligence` may keep heuristic joins (sector/keyword
affinity, acquirer-fit scores, commercialization readiness, evidence-maturity
scores) when every row is labeled **`cited_*`** or **`affinity`** (or honest
`illustrative_static` / `derived_static` context).

Those scores must **not** feed:

- Deal economics (`DealEconomicsCard`, premiums, disclosed value)
- Valuation peers (`listComparableDeals`)
- Dual-source badges (`buildEvidenceLadder.hasDualSource`)

**Also withheld (not synthetic substitutes):**

- Clinical-trial ML percentages while `trainingSource` is `synthetic_seed`
- TAM penetration / sector-multiple / R&D-cost valuation methods
- Uncalibrated 35% acquisition base rate
- Editorial Rock Health / PitchBook stage medians as deal prices
- Affinity-adjusted “fair value” and bidding-war premiums

Deal dossiers may show analyst-curated HLTH mappings (`curated` only). They must
not run the research pipeline's sector/keyword affinity join, and
research/affinity citation strings never count toward dual-source corroboration.
Burden–capital gap scores stay on `/research` — they do not decorate
deal-workspace valuation matrices or dossier comps. Dollar output on that panel
is the verified-dataset stage funding median only.
