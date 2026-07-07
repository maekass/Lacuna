# Vercel settings runbook

Dashboard checklist for **lacuna-maekass** after code-side config in
`vercel.json`. Framer marketing is out of scope — see
[SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md).

## In the repo (automatic on deploy)

| Setting            | Location                                 | Value                                  |
| ------------------ | ---------------------------------------- | -------------------------------------- |
| Node.js            | `package.json` `engines.node` + `.nvmrc` | `24.x`                                 |
| Function region    | `vercel.json` `regions`                  | `iad1` (match Neon / US-East Postgres) |
| Ignored build step | `vercel.json` `ignoreCommand`            | `scripts/vercel-ignore-build.sh`       |
| Speed Insights     | `@vercel/speed-insights` in root layout  | Enable in dashboard once (below)       |
| SEC cron bounds    | `.env.example` / production env          | See [SEC bounds](#sec-cron-bounds)     |

## Dashboard checklist (one-time)

Open
[Vercel project settings](https://vercel.com/maekass/lacuna-maekass/settings).

### 1. Functions → Region

**Settings → Functions → Function Region**

Set to **Washington, D.C., USA (iad1)** — same region as typical Neon / Vercel
Postgres (`us-east-1`). Reduces latency for `/api/cron/sec-ingest` and db-mode
routes.

If your `DATABASE_URL` host is in another region (e.g. `eu-west-1`), pick the
matching Vercel region instead.

### 2. Deployment Protection → `/api/health`

**Settings → Deployment Protection**

External monitors must reach liveness without SSO. Pick one:

| Option                               | When                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Only protect preview deployments** | Production stays public; previews require auth (good for portfolio demo)           |
| **Protection Bypass for Automation** | Generate a secret; pass `x-vercel-protection-bypass: <secret>` on monitor requests |
| **Custom exemption**                 | If your plan supports route exemptions, exempt `GET /api/health`                   |

Verify:

```bash
curl -sf https://lacuna-maekass.vercel.app/api/health | jq -e '.ok == true and .probe == "live"'
```

See [MONITORING.md](./MONITORING.md).

### 3. Skew Protection

**Settings → General → Skew Protection** → **Enable**

Serves the same deployment version to a user across a session while a new
production deploy rolls out. Low cost safety net for long-lived tabs.

### 4. Speed Insights

**Settings → Speed Insights** → **Enable**

The app ships the `<SpeedInsights />` snippet in `src/app/layout.tsx`. After
enabling, check **Analytics → Speed Insights** after ~1 week of traffic for LCP
/ CLS / INP.

### 5. SEC cron bounds (production env)

**Settings → Environment Variables → Production**

Set if cron logs show slow runs or 504 timeouts (300s Fluid Compute cap):

| Variable                         | Recommended production value |
| -------------------------------- | ---------------------------- |
| `SEC_MAX_TICKERS_PER_RUN`        | `50`                         |
| `SEC_MAX_PARSED_FILINGS_PER_RUN` | `100`                        |
| `SEC_CLASSIFY_CONCURRENCY`       | `3`                          |
| `SEC_USE_DB_CURSOR`              | `true`                       |
| `LACUNA_INGEST_RUN_TRACKING`     | `true`                       |

With `SEC_USE_DB_CURSOR=true`, truncated runs resume on the next weekly cron.

Inspect runs: `GET /api/cron/sec-ingest/status` (requires `DATABASE_URL`).

### 6. Deployment Checks (couple Vercel to GitHub CI)

**Settings → Git → Deployment Checks**

Enable waiting for required GitHub commit checks before promoting a deployment
to **Production**. Add:

| Check name | Workflow job | Purpose                                                       |
| ---------- | ------------ | ------------------------------------------------------------- |
| `build`    | `build`      | `typecheck` + `next build` (catches Turbopack compile errors) |
| `ci`       | `ci`         | fmt, lint, dataset validation, tests                          |

Without this, Vercel still builds on every `main` push even when GitHub CI is
red. Deployment Checks keep the production alias on the last green deployment.

## Already configured (no action)

| Setting                   | Status                                |
| ------------------------- | ------------------------------------- |
| Fluid Compute             | On                                    |
| Node.js 24                | `engines` + `.nvmrc`                  |
| Production build priority | On                                    |
| Weekly crons              | `vercel.json` — Mon 06:00 / 06:30 UTC |
| `maxDuration` on crons    | 300s on both cron routes              |

## Optional (paid / later)

| Setting                     | When to consider                                    |
| --------------------------- | --------------------------------------------------- |
| On-Demand Concurrent Builds | Many queued preview builds                          |
| Elastic Build Machines      | Vercel build itself is fast; CI validates on GitHub |
| Cold Start Prevention (Pro) | Measurable API cold-start latency                   |
| Rolling Releases (Pro)      | Canary production deploys                           |
| Custom domain               | Portfolio branding                                  |

## Related

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) — env vars + migrations
- [MONITORING.md](./MONITORING.md) — liveness vs readiness
- [PERFORMANCE.md](./PERFORMANCE.md) — caching and bundle discipline
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — full ops map
