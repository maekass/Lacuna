# Restore Postgres

Use when production shows `getaddrinfo ENOTFOUND` on `/api/health/ready`, or
after creating a new Neon / Vercel Postgres database.

## One-command restore (from this repo)

```bash
# Neon: copy pooled string from Dashboard → Connect (pooling ON)
npm run db:restore -- --url "postgresql://user:pass@ep-xxx-pooler....neon.tech/neondb?sslmode=require"

# Local Docker
docker compose up -d postgres
npm run db:restore
```

What `db:restore` does:

1. Saves `DATABASE_URL` to `.env.local` (with `--url`) or uses existing env
2. Pings Postgres (fails fast on dead hosts like stale Neon endpoints)
3. `npm run db:migrate` — applies `db/migrations/*.sql`
4. `npm run db:import` — loads `dataset.verified.json`

### Flags

| Flag               | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `--check`          | Ping only — no migrate/import                     |
| `--skip-import`    | Migrate schema without truncating verified tables |
| `--seed-research`  | Also run `db:seed-research`                       |
| `--url "<string>"` | Write Neon URL to `.env.local` then restore       |

## Sync Vercel + GitHub

After `db:restore` succeeds against Neon:

1. **Vercel** → Settings → Environment Variables → **Production** →
   `DATABASE_URL` (same pooled string as `.env.local`)
2. **GitHub** → repo Secrets → `DATABASE_URL` (weekly deal pipeline)
3. **Redeploy** Vercel
4. Verify:

```bash
curl -s https://lacuna-maekass.vercel.app/api/health/ready | jq '.checks.database'
curl -s https://lacuna-maekass.vercel.app/api/ingest/sec/status | jq '.ok'
```

## What is not restored

| Lost on new DB               | How to refill                         |
| ---------------------------- | ------------------------------------- |
| `lacuna_deals` staging queue | Next SEC cron or `npm run sec:ingest` |
| `lacuna_ingest_runs` history | New runs after cron                   |
| Form D events                | `npm run sec:ingest-form-d`           |

Verified M&A universe is restored by `db:import`.

## Related

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) — full Vercel env checklist
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — ops map
- [SEC_INGESTION.md](./SEC_INGESTION.md) — cron behavior
