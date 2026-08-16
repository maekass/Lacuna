## Summary

Production reviewers sign in without pasting CRON secrets; promote actions are
audited.

## Tasks

- [x] Pick auth model: GitHub OAuth allowlist (API key remains CLI fallback)
- [x] Server-side session replaces raw-key cookie as primary path
- [x] `ReviewAccessGate` → sign-in flow
- [x] `review_audit_log` migration (deal_id, action, actor, at)
- [x] `docs/REVIEW_CONSOLE.md` env matrix

## Acceptance criteria

- Reviewer signs in; approve/reject/promote logged
- Public app deploy stays read-only for review APIs

## PR

`feat/review-console-e5-auth` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 6

**Depends on:** Phase E3 merged

## Estimate

3–4 days
