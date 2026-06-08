# Production setup checklist

Use this after deploying to Vercel (Hobby or Pro). Lacuna remains an educational demo; this checklist makes cron, Postgres, and CI behave like a maintained product.

## 1. Vercel environment variables

In the [Vercel project](https://vercel.com) → Settings → Environment Variables, set at least:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | For DB sync + ingest tracking | Postgres connection string (Neon/Vercel Postgres) |
| `CRON_SECRET` | For cron | Bearer token for `/api/cron/sec-ingest` |
| `SEC_EDGAR_USER_AGENT` | For SEC | Contact string per [SEC fair access](https://www.sec.gov/os/webmaster-faq#code-support) |
| `LACUNA_INGEST_RUN_TRACKING` | Recommended | `true` — persist ingest runs |
| `SEC_USE_DB_CURSOR` | Recommended | `true` — resume ingest across daily runs |
| `SENTRY_DSN` | Optional | Server error reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Client error reporting |
| `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` or `OPENAI_API_KEY` | Optional | Server inference per [INFERENCE.md](./INFERENCE.md) (SEC classification + UI narratives) |

Tuning (optional): `SEC_MAX_TICKERS_PER_RUN`, `SEC_MAX_PARSED_FILINGS_PER_RUN`.

Then locally:

```bash
vercel env pull .env.local
npm run db:migrate
```

See [SEC_INGESTION.md](./SEC_INGESTION.md) for ingest behavior and bounds.

## 2. Database migrations

`npm run db:migrate` applies `db/migrations/*.sql` once each, tracked in `lacuna_schema_migrations`.

## 3. GitHub branch protection

Require the **CI** workflow (`.github/workflows/deno.yml`) before merging to `main`:

```bash
./scripts/configure-branch-protection.sh
```

Requires `gh` CLI and admin access on `maekass/Lacuna`. Manual alternative: Repository → Settings → Branches → Add rule for `main` → Require status checks → select **ci**.

## 4. Uptime monitoring

Configure all recurring checks on **liveness only**:

```text
https://lacuna-maekass.vercel.app/api/health
```

Full provider examples: [MONITORING.md](./MONITORING.md). Local smoke: `npm run monitor:liveness`.

Do **not** point Datadog, UptimeRobot, or similar at `/api/health/ready` on an interval.

### Datadog synthetics (optional)

The Datadog workflow is **manual only** (`workflow_dispatch`) until you add `DD_API_KEY` and `DD_APP_KEY`. Tag synthetics `e2e-tests` and target `/api/health`, not `/ready`. Run from Actions when ready.

## 5. Verify

- `npm run lint && npm test && npm run build && npm run infra:check` locally
- Push a PR and confirm **CI** is green
- Uptime: `npm run monitor:liveness` (or `GET /api/health` → `ok: true`, `probe: "live"`)
- Post-deploy once: `GET /api/health/ready`
- After env vars: hit `/api/cron/sec-ingest/status` on production

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for the full ops map.
