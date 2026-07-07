## Summary

Stop promotion from inventing sector/HQ and document honest data boundaries for
agents and reviewers.

## Tasks

- [ ] `buildPromotionDraft.ts` — remove default `inferSector()` /
      `hq: "Unknown"`; return `missingFields[]`
- [ ] `promotionChecklist.ts` — block promote when required reviewer fields
      missing
- [ ] Add `docs/DATA_BOUNDARIES.md` (three tiers + five deferrals)
- [ ] Link from `AGENTS.md`, `NEW_DEAL_WORKFLOW.md`, `EPIC_DEAL_UNIVERSE.md`
- [ ] Tests: `__tests__/lib/ingestion/buildPromotionDraft.test.ts`

## Acceptance criteria

- Promoting a `keyword_only` row without manual fields fails with a clear error
- No verified JSON row gets sector/HQ from keyword inference alone
- CI green

## PR

`feat/review-console-e0-boundaries` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 1

## Estimate

2–3 days
