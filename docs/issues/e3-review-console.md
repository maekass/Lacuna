## Summary

One operator surface at `/deals#review` instead of scattered pipeline panels.

## Tasks

- [ ] Tabbed console: **M&A queue** | **Funding** | **Import** | **Pipeline**
- [ ] Move `DealReviewQueue`, `FundingEventsPanel`, `CandidateImportPanel`,
      `DataIngestPanel`
- [ ] `PipelineStatusStrip` as header; SLA chip (oldest pending age)
- [ ] `GET /api/deals/pending?source=efts|sec|manual` filter
- [ ] Hub CTAs link to `/deals#review`

## Acceptance criteria

- Single entry point for operators
- Funding tab does not offer promote-to-verified (Form D stays separate per
  DATA_BOUNDARIES)

## PR

`feat/review-console-e3-console` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 4

**Depends on:** Phase E2 merged

## Estimate

4–5 days
