## Summary

Human attests every field that lands in verified JSON; preview shows exact diff
before merge.

## Tasks

- [ ] `PromotionForm` on staging dossier (sector, HQ, sources[], parties, dates,
      value)
- [ ] Pre-fill from staging/filing only — no keyword inference for required
      fields
- [ ] `GET /api/deals/pending/[dealId]/promote/preview` — draft + diff +
      validation errors
- [ ] `POST .../promote` accepts optional `draft` body (zod)
- [ ] `PromotionPreviewDiff` component
- [ ] Promote CTA from dossier only (queue → dossier → promote)
- [ ] API + lib tests

## Acceptance criteria

- Promote requires explicit sector + ≥2 sources
- Preview shows companies/acquirers/acquisitions diff before commit
- `npm run validate:dataset` passes on promoted output

## PR

`feat/review-console-e2-promote-preview` — see `docs/EPIC_REVIEW_CONSOLE.md` PR
3

**Depends on:** Phase E1 merged

## Estimate

5–7 days
