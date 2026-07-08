## Summary

Honest verified vs candidate counts; post-promote lands on verified deal spine.

## Tasks

- [x] Extend `getDatasetChangelog()` — separate verified growth from candidate
      counts
- [x] Hub + Methods footnote: "N verified · M candidates" with definitions
- [x] Queue metrics API: approve/reject/pending, median age
- [x] Post-promote success → `/deals/[acquisitionId]` + network link
- [x] Optional: GitHub Action opens PR with dataset diff on promote

## Acceptance criteria

- Hub never conflates candidates with verified deals
- After promote, user sees verified deal page

## PR

`feat/review-console-e6-metrics` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 7

**Depends on:** Phase E2 merged

## Estimate

4–5 days
