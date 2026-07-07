## Summary

Production reviewers sign in without pasting CRON secrets; promote actions are
audited.

## Tasks

- [ ] Pick auth model: GitHub OAuth allowlist | Clerk `reviewer` | Vercel
      password + flag
- [ ] Server-side session replaces raw-key cookie as primary path
- [ ] `ReviewAccessGate` → sign-in flow
- [ ] `review_audit_log` migration (deal_id, action, actor, at)
- [ ] `docs/REVIEW_CONSOLE.md` env matrix

## Acceptance criteria

- Reviewer signs in; approve/reject/promote logged
- Public app deploy stays read-only for review APIs

## PR

`feat/review-console-e5-auth` — see `docs/EPIC_REVIEW_CONSOLE.md` PR 6

**Depends on:** Phase E3 merged

## Estimate

3–4 days
