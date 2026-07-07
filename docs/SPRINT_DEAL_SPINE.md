# Sprint: Deal spine v1 (interdisciplinary)

**Duration:** 12 working days (~2.5 weeks at 1 focused block/day)\
**Goal:** One traceable diligence path that serves corp VC, health equity,
engineering, and portfolio reviewers — without splitting the product.

**North star demo:** Hub → featured deal → `/deals/[id]` → sources → limitations
→ export brief.

---

## Where to start (Day 1)

Start with **`src/lib/deals/`** — not the hub UI.

| Why                      | Detail                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| Everything depends on it | Detail page, exports, permalinks, and hub CTAs all need `getDealById()` |
| Low UI risk              | Pure functions + types; easy to test with Vitest                        |
| Immediate payoff         | By Day 3 you have a shareable URL to show progress                      |

**Day 1 deliverable:** `getDealById`, `getFeaturedDeal`, `buildEvidenceLadder`,
Vitest for one known acquisition ID from `dataset.verified.json`.

---

## Shared primitives (build order)

```
dataset.verified.json
        ↓
  lib/deals/*          ← Day 1–2
        ↓
  EvidenceLadder.tsx   ← Day 2
        ↓
  /deals/[id]/page     ← Day 3–5
        ↓
  PipelineStatusStrip  ← Day 6 (hub + deals)
        ↓
  Hub triage CTAs      ← Day 7
        ↓
  exportDealBrief      ← Day 9–10
```

---

## Daily plan

### Day 1 — Deal record library ✅

**Audience:** Engineering (foundation); all others (blocked without this)

| Task                                                                   | Files                                   |
| ---------------------------------------------------------------------- | --------------------------------------- |
| `DealDetail` interface (acquisition + target + acquirer + comparables) | `src/lib/deals/dealTypes.ts`            |
| `getDealById(id)`                                                      | `src/lib/deals/getDealById.ts`          |
| `getFeaturedDeal()` — pinned `deal2` (Modern Fertility / Ro)           | `src/lib/deals/getFeaturedDeal.ts`      |
| `listComparableDeals(deal, limit)` — same sector, ±3 years             | `src/lib/deals/listComparableDeals.ts`  |
| Vitest fixtures using real IDs                                         | `__tests__/lib/deals/dealSpine.test.ts` |

**Done when:** `getDealById("…")` returns enriched deal from static dataset in a
test.

---

### Day 2 — Evidence ladder ✅

**Audience:** Health equity + VC (trust); recruiters (polish)

| Task                                                                     | Files                               |
| ------------------------------------------------------------------------ | ----------------------------------- |
| `EvidenceTier` enum: `filing`, `press`, `trial`, `heuristic`             | `src/lib/deals/evidenceLadder.ts`   |
| `buildEvidenceLadder(deal)` — map `source`, `valuationSource`, rationale | same                                |
| `EvidenceLadder` presentational component                                | `src/components/EvidenceLadder.tsx` |
| Story or Vitest snapshot for one deal                                    | tests                               |

**Done when:** Ladder renders tiers with URLs from acquisition `source` field.

---

### Day 3 — Deal detail route (shell) ✅

**Audience:** VC + recruiters (first shareable URL)

| Task                                                   | Files                                 |
| ------------------------------------------------------ | ------------------------------------- |
| `app/(product)/deals/[id]/page.tsx` — server component | new route                             |
| `generateStaticParams` for all acquisition IDs (ISR)   | same                                  |
| `notFound()` for bad IDs                               | same                                  |
| `DealDetailPage` section component                     | `src/app/sections/DealDetailPage.tsx` |
| Breadcrumb: Hub → Deals → {targetName}                 | component                             |

**Done when:** `/deals/{id}` loads for any verified acquisition; 404 for
garbage.

---

### Day 4 — Deal detail content (diligence core) ✅

**Audience:** Corp VC (primary)

| Task                | Content                                                  |
| ------------------- | -------------------------------------------------------- |
| Header              | Target, acquirer, announced/closed dates, deal type      |
| Valuation block     | Disclosed value OR `dealValueNote` honest gap            |
| Strategic rationale | From dataset                                             |
| Evidence ladder     | Day 2 component                                          |
| Limitations callout | Reuse pattern from `DataCoverageCard` / model provenance |

**Done when:** A reviewer can read the page and list cited sources without
opening DevTools.

---

### Day 5 — Comparables + acquirer context ✅

**Audience:** VC + methods

| Task              | Detail                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| Comparables table | 3–5 deals via `listComparableDeals`                                        |
| Acquirer card     | Other acquisitions by same `acquirerId`                                    |
| Link to network   | `/deals#network` with query `?highlight={targetId}` (wire Day 8 if needed) |

**Done when:** Deal page answers "what else looks like this?" and "who is this
buyer?".

---

### Day 6 — Pipeline freshness strip (real data) ✅

**Audience:** Engineering + VC

Replace mocked timings in `DataPipelineStatus` for hub use — new lightweight
strip:

| Task                                                                                                       | Files                                    |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PipelineStatusStrip` — client fetch                                                                       | `src/components/PipelineStatusStrip.tsx` |
| Data: `provenance.lastUpdated`, `GET /api/health` (`buildSha`), optional `GET /api/cron/sec-ingest/status` | component                                |
| Mount on hub + deal detail footer                                                                          | `HubPage.tsx`, `DealDetailPage.tsx`      |

**Done when:** Strip shows dataset date + build SHA; SEC last run when
`DATABASE_URL` configured.

---

### Day 7 — Hub triage (three ramps) ✅

**Audience:** All — interdisciplinary entry

| CTA                   | Route                                                                      | Copy angle      |
| --------------------- | -------------------------------------------------------------------------- | --------------- |
| **Start diligence**   | `/deals/{featuredId}`                                                      | VC walkthrough  |
| **Evidence & equity** | `/research#health-equity`                                                  | Policy / equity |
| **How it's built**    | `/methods#causal-dag` or new `#ops` anchor + link `docs/INFRASTRUCTURE.md` | Engineering     |

Refactor hub: move Payer Ops featured card below triage or keep as fourth
"spotlight".

**Done when:** Hub has three equal primary CTAs above workspace grid.

---

### Day 8 — Permalinks + network highlight ✅

**Audience:** Recruiters (shareable demos); VC

| Task                                 | Detail                                          |
| ------------------------------------ | ----------------------------------------------- |
| `?highlight={companyId}` on `/deals` | `ForceNetwork` or deals page reads searchParams |
| Deal page "View in network" button   | links with highlight param                      |
| Copy link button on deal detail      | `navigator.clipboard` + toast                   |

**Done when:** Pasting URL opens network with target node emphasized.

---

### Day 9 — Deal brief export (lib) ✅

**Audience:** VC + equity (export); intelligence workspace reuse

| Task                                                                     | Files                              |
| ------------------------------------------------------------------------ | ---------------------------------- |
| `formatDealBrief(deal)` — Markdown sections                              | `src/lib/gamma/formatDealBrief.ts` |
| Sections: summary, evidence ladder text, comparables, limitations footer | same                               |
| Vitest: output contains source URL                                       | test                               |

Extend `formatLacunaForGamma` later; keep deal brief separate for clarity.

**Done when:** Function returns paste-ready Markdown for Gamma/manual export.

---

### Day 10 — Export UI + polish ✅

**Audience:** Recruiters + VC

| Task                                    | Detail                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| "Export brief" on deal detail           | copy Markdown or hook existing `ExportToGamma` with `deal-only` scope |
| Open Graph / metadata for `/deals/[id]` | `generateMetadata`                                                    |
| Mobile pass on deal detail              | scroll, typography                                                    |

**Done when:** One click copies or sends deal brief with citations.

---

### Day 11 — Cross-workspace bridges (minimal) ✅

**Audience:** Interdisciplinary glue

| Bridge              | Scope (MVP)                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| Deal → Research     | Link to `/research#clinical-trials` with prefilled search = target sector keyword |
| Deal → Methods      | Link to limitations / Bayesian panel with `?context=deal` (optional copy only)    |
| Deal → Intelligence | Link to reimbursement section if sector matches                                   |

No new APIs required for MVP — deep links only.

**Done when:** Deal detail has "Related workspaces" row with 2–3 links.

---

### Day 12 — Demo scripts + QA ✅

**Audience:** Recruiters + all

| Task                                            | Output                                        |
| ----------------------------------------------- | --------------------------------------------- |
| Write `docs/DEMO_SCRIPTS.md`                    | 90s, 3min × 4 audience voiceovers (same deal) |
| Run `npm run lint && npm test && npm run build` | CI green                                      |
| Production smoke                                | `/api/health`, one `/deals/[id]`, hub CTAs    |
| Optional Loom                                   | Record 90s "Start diligence" path             |

**Done when:** You can send one link + one doc to any audience.

---

## Out of scope for this sprint (Phase 2+)

See **[EPIC_DEAL_UNIVERSE.md](./EPIC_DEAL_UNIVERSE.md)** for the full phased
plan:

- **Phase A:** SEC pending review queue UI + API
- **Phase B:** Promote workflow (approved → JSON via PR, never auto-merge)
- **Phase C:** Hub changelog (“+N verified since …”)
- **Phase D:** Bounded extra candidate streams (EFTS, CSV — not “entire web”)

Also later: production `LACUNA_DATA_MODE=db`, Framer marketing site,
`/companies/[id]`, live trial API from deal page (deep link only in this
sprint).

---

## Definition of done (sprint)

- [x] `/deals/[id]` works for all verified acquisitions
- [x] Hub has three triage CTAs + pipeline strip
- [x] Evidence ladder on every deal detail
- [x] Export brief with citations + limitations footer
- [x] Permalink + network highlight for featured deal
- [x] `docs/DEMO_SCRIPTS.md` written
- [x] CI green

**Shipped:** 2026-07-06 (`f563d03` deal spine, `65d0afb` heuristic cleanup,
`7607d96` dual-scope workspaces).

### Post-sprint (not in original 12 days)

| Item                                                  | Status                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| Per-deal OG images (`deals/[id]/opengraph-image.tsx`) | Done                                                          |
| Mobile pass on deal detail                            | Done                                                          |
| Phase B3 promotion checklist                          | Done (epic overlap)                                           |
| Phase C hub changelog                                 | Done (epic overlap)                                           |
| Heuristic / invented data removal                     | Done (`65d0afb`) — no TAM fallbacks, no `STRATEGIC_ACQUIRERS` |
| Phase D (EFTS, CSV, Form D panel)                     | ✅ — see [EPIC_DEAL_UNIVERSE.md](./EPIC_DEAL_UNIVERSE.md)     |

---

## Suggested featured deal

**Pinned:** `deal2` — Modern Fertility / Ro (2021), `FEATURED_DEAL_ID` in
`src/lib/deals/dealTypes.ts`. Fertility sector, disclosed estimate, press +
valuation sources — used in tests and future hub CTA.

---

## Time budget (realistic)

| Day   | Hours (focused)    |
| ----- | ------------------ |
| 1–2   | 2–3h (lib + tests) |
| 3–5   | 3–4h (UI-heavy)    |
| 6–8   | 2–3h               |
| 9–10  | 2–3h               |
| 11–12 | 2h + QA            |

**Total:** ~30–35 focused hours over 12 days.

---

## Related docs

- [SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md) — product vs Framer
- [MODEL_CARD.md](./MODEL_CARD.md) — scoring limits on deal pages
- [MONITORING.md](./MONITORING.md) — pipeline strip health checks
- [VERCEL_SETTINGS.md](./VERCEL_SETTINGS.md) — deploy tuning
