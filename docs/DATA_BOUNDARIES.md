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
- **Allowed:** Company/deal page enrichment (grants, literature context) with
  disclaimer: _not M&A evidence_.

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

| Surface                     | Data tier                                     |
| --------------------------- | --------------------------------------------- |
| `/deals/[id]`               | Verified only                                 |
| `/deals/staging/[dealId]`   | Staging candidate                             |
| `/deals#review` M&A tab     | `lacuna_deals`                                |
| `/deals#review` Funding tab | `lacuna_funding_events`                       |
| Company enrichment panels   | Context only — does not increment deal counts |
