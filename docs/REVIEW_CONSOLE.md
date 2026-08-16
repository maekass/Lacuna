# Review Console — auth and audit (Phase E5)

Production configuration for `/deals#review`, staging dossiers, CSV import, and
funding panels.

## Auth models

| Mode                         | When                       | How                                                                 |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------- |
| **Local dev**                | `NODE_ENV !== production`  | Review APIs open (no sign-in)                                       |
| **GitHub OAuth** (preferred) | Production + OAuth env set | Allowlisted GitHub logins → signed session cookie                   |
| **API key**                  | Production fallback / CLI  | `LACUNA_REVIEW_API_KEY` or `CRON_SECRET` via Bearer or POST session |
| **Public review UI**         | Demo only                  | `LACUNA_REVIEW_UI_PUBLIC=true` — read-only browsing, no sign-in     |

Signed session cookie: `lacuna_review_session` (httpOnly, 12h). Legacy
`lacuna_review_token` (raw key) is cleared on sign-in.

## Environment matrix

| Variable                           | Required           | Purpose                                              |
| ---------------------------------- | ------------------ | ---------------------------------------------------- |
| `DATABASE_URL`                     | Yes (review APIs)  | Staging queue + audit log                            |
| `GITHUB_OAUTH_CLIENT_ID`           | For GitHub sign-in | OAuth app client ID                                  |
| `GITHUB_OAUTH_CLIENT_SECRET`       | For GitHub sign-in | OAuth app secret                                     |
| `LACUNA_REVIEW_GITHUB_ALLOWLIST`   | For GitHub sign-in | Comma-separated GitHub logins                        |
| `LACUNA_REVIEW_OAUTH_REDIRECT_URI` | Optional           | Default: `{origin}/api/deals/review/github/callback` |
| `LACUNA_REVIEW_SESSION_SECRET`     | Recommended        | HMAC session signing (falls back to `CRON_SECRET`)   |
| `LACUNA_REVIEW_API_KEY`            | Fallback           | API key for automation / emergency unlock            |
| `CRON_SECRET`                      | Optional           | Also accepted as API key + session secret fallback   |
| `LACUNA_REVIEW_UI_PUBLIC`          | Never in prod      | Read-only demo access (writes still return 403)      |

### GitHub OAuth app setup

1. GitHub → Settings → Developer settings → OAuth Apps → New
2. **Authorization callback URL:**
   `https://<your-vercel-domain>/api/deals/review/github/callback`
3. Set `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, and
   `LACUNA_REVIEW_GITHUB_ALLOWLIST=your-github-login` on Vercel Production

## Audit log

Table: `review_audit_log` (migration `009_review_audit_log.sql`)

| Action                          | When                                |
| ------------------------------- | ----------------------------------- |
| `session_start` / `session_end` | GitHub or API key sign-in/out       |
| `approve` / `reject`            | PATCH `/api/deals/pending/[dealId]` |
| `promote`                       | POST `.../promote`                  |
| `enrich`                        | POST `.../enrich`                   |
| `import`                        | POST `/api/deals/candidates/import` |

Query example:

```sql
SELECT created_at, action, actor_id, deal_id, metadata
FROM review_audit_log
ORDER BY created_at DESC
LIMIT 50;
```

## API routes

| Route                                       | Auth                                            |
| ------------------------------------------- | ----------------------------------------------- |
| `GET /api/deals/review/github`              | Public (starts OAuth)                           |
| `GET /api/deals/review/github/callback`     | Public (sets session)                           |
| `GET/POST/DELETE /api/deals/review/session` | Session probe (always 200) / API key / sign-out |
| `/api/deals/pending/*`                      | Signed session, Bearer, or legacy cookie        |

`GET /api/deals/review/session` returns `authenticated`, `readOnly`, and
`githubSignInAvailable` so the review gate can show GitHub sign-in before a
session exists. Public demo (`LACUNA_REVIEW_UI_PUBLIC=true`) is read-only until
a signed GitHub or API-key reviewer is present.

## Related docs

- [REVIEWER_PROMOTION_GUIDE.md](./REVIEWER_PROMOTION_GUIDE.md) — promote
  workflow
- [EPIC_REVIEW_CONSOLE.md](./EPIC_REVIEW_CONSOLE.md) — Phase E plan
- [DATA_BOUNDARIES.md](./DATA_BOUNDARIES.md) — staging vs verified tiers
