## Summary

Machine proposes structured fields from 8-K text; human still attests. Never
auto-approve.

## Tasks

- [ ] `src/lib/ingestion/enrichPendingDeal.ts` — fetch 8-K when
      `parseQuality === keyword_only`
- [ ] Reuse `secEdgarConnector` parse for target, dates, consideration
- [ ] Duplicate detection vs verified JSON + pending queue
- [ ] `POST /api/deals/pending/[dealId]/enrich` — rate-limited
- [ ] "Enrich" button on staging dossier with before/after UI
- [ ] Optional `sec:ingest-efts --enrich` flag

## Acceptance criteria

- Enrichment never changes `status` to approved
- EFTS rows often get target name after one-click enrich
- Bounded requests (no unbounded crawl)

## PR

`feat/review-console-e4-enrich` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 5

**Depends on:** Phase E1 merged (can ship after E3)

## Estimate

7–10 days
