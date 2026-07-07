## Summary

Every staging candidate gets a shareable dossier page with evidence ladder and
blockers — same trust UX as verified deals, clearly labeled **Candidate · not
verified**.

## Tasks

- [ ] `GET /api/deals/pending/[dealId]` — single `PendingDealRecord`
- [ ] `src/app/deals/staging/[dealId]/page.tsx` with candidate banner
- [ ] Reuse `EvidenceLadder` for filing URL, excerpt, review notes
- [ ] Parse quality + blocker panel (missing target, no secondary,
      `keyword_only`)
- [ ] `DealReviewQueue` — "Open dossier" link per card
- [ ] Optional: OG image with CANDIDATE watermark

## Acceptance criteria

- Reviewer can share `/deals/staging/sec-…` without Postgres admin tools
- Page never appears in verified deal counts or hub changelog

## PR

`feat/review-console-e1-staging-dossier` — see `docs/EPIC_REVIEW_CONSOLE.md` PR
2

**Depends on:** Phase E0 merged

## Estimate

5–7 days
