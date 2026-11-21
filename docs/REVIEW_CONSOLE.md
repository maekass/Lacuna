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

| Variable                             | Required           | Purpose                                              |
| ------------------------------------ | ------------------ | ---------------------------------------------------- |
| `DATABASE_URL`                       | Yes (review APIs)  | Staging queue + audit log                            |
| `GITHUB_OAUTH_CLIENT_ID`             | For GitHub sign-in | OAuth app client ID                                  |
| `GITHUB_OAUTH_CLIENT_SECRET`         | For GitHub sign-in | OAuth app secret                                     |
| `LACUNA_REVIEW_GITHUB_ALLOWLIST`     | For GitHub sign-in | Comma-separated GitHub logins                        |
| `LACUNA_REVIEW_OAUTH_REDIRECT_URI`   | Optional           | Default: `{origin}/api/deals/review/github/callback` |
| `LACUNA_REVIEW_SESSION_SECRET`       | Recommended        | HMAC session signing (falls back to `CRON_SECRET`)   |
| `LACUNA_REVIEW_API_KEY`              | Fallback           | API key for automation / emergency unlock            |
| `CRON_SECRET`                        | Optional           | Also accepted as API key + session secret fallback   |
| `LACUNA_REVIEW_UI_PUBLIC`            | Never in prod      | Read-only demo access (writes still return 403)      |
| `LACUNA_FIELD_ENCRYPTION_KEYS`       | Yes (audit writes) | `keyId:base64Key` pairs; encrypts audit `actor_id`   |
| `LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY` | With 2+ keys       | Key ID used for new writes                           |

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

### Reviewer identity encryption

`actor_id` (for example `github:<login>`) is encrypted at rest with AES-256-GCM
by `src/lib/infra/fieldEncryption.ts`. A raw SQL query returns
`enc:v1:<keyId>:…`; only `listReviewAuditForDeal` and the insert helpers in
`src/lib/ingestion/reviewAuditLog.ts` decrypt it. The GitHub login is no longer
copied into `metadata`.

- **Keys** live only in the environment. Generate one with
  `openssl rand -base64 32` and set `LACUNA_FIELD_ENCRYPTION_KEYS=k1:<key>`.
  Audit writes fail closed (no plaintext fallback) when the key is missing or
  malformed.
- **Binding:** the key ID and the column name are authenticated data, so a value
  cannot be decrypted under another key ID or moved to another column.
- **Rotation:** add the new key (`k1:<old>,k2:<new>`), set
  `LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY=k2`, run
  `npm run encryption:rotate -- --dry-run`, then `npm run encryption:rotate`.
  Remove `k1` once the dry run reports `would rotate 0`. The same command
  encrypts rows written before encryption existed; until it runs, those legacy
  plaintext rows are still readable.
- **In transit:** Postgres connections verify TLS certificates by default and
  refuse `PGSSLMODE=disable` for non-local hosts (`src/lib/data/pgSslPolicy.ts`,
  `resolvePgSslConfig` in `src/lib/data/dbClient.ts`). The site sends HSTS
  (`next.config.ts`).
- **Out of scope:** the public catalog is public-source and is not encrypted.
  `metadata` and `deal_id` stay plaintext.

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
