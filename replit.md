# Lacuna — Women's Health M&A Diligence Stack

A prototype investment-research environment with verified deal provenance, clinical trial search, genomics governance, and cited analytics from public sources.

## Run & Operate

- `pnpm --filter @workspace/lacuna run dev` — run the frontend (port assigned by Replit)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `DATABASE_URL` — Postgres connection string (optional; app runs in static mode without it)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/lacuna/`), wouter routing, Tailwind CSS v4, Playfair Display font
- API: Express 5 (`artifacts/api-server/`), pino logging
- DB: PostgreSQL + Drizzle ORM (optional — app falls back to static JSON data)
- Charts: d3, simple-statistics, recharts

## Where things live

- `artifacts/lacuna/src/app/` — page components (hub, deals, research, methods, intelligence)
- `artifacts/lacuna/src/components/` — shared UI components
- `artifacts/lacuna/src/data/dataset.verified.json` — static verified M&A dataset (n=59 deals)
- `artifacts/lacuna/src/lib/` — utilities (analytics, research catalog, infra, compliance)
- `artifacts/api-server/src/routes/` — Express routes (clinical-trials, research, dataset, stubs)
- `artifacts/lacuna/vite.config.ts` — Vite config with `/api` proxy to Express (port 8080)

## Architecture decisions

- **Static-first data**: The frontend loads `dataset.verified.json` synchronously at startup. No DB required for the core deal/analytics views. The Express API serves the same data for external consumers.
- **Vite proxy for `/api`**: The Vite dev server proxies all `/api/*` requests to `localhost:8080` (Express). In production, an nginx/reverse-proxy layer must forward `/api` to the API server.
- **Next.js → Vite migration**: All Next.js patterns (App Router, `next/link`, `next/dynamic`, `unstable_cache`, `NextResponse`) were converted to Vite/React equivalents. API routes moved to Express.
- **Genomics/Gamma/AI as stubs**: Variant store (ClickHouse), Gamma export, and AI insights require external config (`LACUNA_VARIANT_STORE`, `OPENAI_API_KEY`, etc.) and return graceful 503s without them.
- **Clinical trials as live proxy**: `/api/clinical-trials` proxies ClinicalTrials.gov v2 API at request time; no caching layer beyond Vite's default.

## Product

- **Hub** — overview stats (89 companies, 59 deals, $139.4B disclosed value), sector insights
- **Deals** — M&A workspace with coverage, pipelines, network graph, acquirer matrix, and analysis
- **Research** — clinical trial tracker (live ClinicalTrials.gov), domestic study catalog (NIH/Harvard/MIT), genetics, markers
- **Methods** — causal DAG, timeline, sensitivity analysis, Bayesian small-n
- **Intelligence** — reimbursement context, fit scores, data export, system health monitoring

## Gotchas

- API server must be running for `/api/*` requests; the Vite proxy forwards to `localhost:8080`.
- The app runs cleanly without `DATABASE_URL` — all main views use static JSON data.
- `LACUNA_VARIANT_STORE=clickhouse` + `CLICKHOUSE_URL` required to enable genomics callset browser.
- Next.js API route files still exist in `artifacts/lacuna/src/app/api/` but are dead code (not imported by any component); they can be deleted in a cleanup pass.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Dataset source of truth: `artifacts/lacuna/src/data/dataset.verified.json`
- Theme tokens: `artifacts/lacuna/src/app/globals.css` and `artifacts/lacuna/src/lib/theme/tokens.json`
