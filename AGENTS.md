<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lacuna — agent conventions

Shared guidance for Cursor, Windsurf, and other AI assistants.

## Project context

Lacuna is an educational M&A intelligence demo for women's health. It visualizes verified acquisition data, network relationships, health equity focus areas, and descriptive analytics.

**Live demo:** https://lacuna-maekass.vercel.app

**Site split:** Product stays on **Vercel** (this repo). **Framer** ([framer.com](https://www.framer.com)) is for brand + narrative only (hero, methodology story, hiring/portfolio), with one primary CTA into the live app — not for hosting analytics. Build kit: [framer/BUILD_GUIDE.md](framer/BUILD_GUIDE.md). See [docs/SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md). (Do not confuse with **Framer Motion** in `package.json`.)

This is portfolio/educational code. Be honest about data limits (curated static dataset, partial price disclosure, methodology in `docs/`).

## Current stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js **16**, React **19** |
| Language | TypeScript (`strict: true`) |
| Styling | **Tailwind CSS v4** + `globals.css` / `src/lib/theme/palette.ts` |
| Viz | D3.js v7, Framer Motion |
| Server LLM | Vercel AI Gateway via `src/lib/ai/inference.ts` (AI SDK); see `docs/INFERENCE.md` |
| Scoring / vectors | simple-statistics (heuristics — not trained models) |
| HTTP | Native **`fetch`** (no axios) |
| Data | `src/data/dataset.verified.json` via `getVerifiedDataset()` |
| Future DB | `LACUNA_DATA_MODE=db` in `src/lib/data/datasetProvider.ts` |

## Roadmap (not built — do not invent without request)

PostgreSQL ingestion, SEC/ClinicalTrials/FDA/CMS connectors, Jest under `__tests__/`. Framer marketing site (separate from this repo) per [SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md).

## Layout

`src/app` pages + API routes · `src/components` (PascalCase files) · `src/lib` logic · `src/data` JSON · `@/*` → `src/*`

## Code style

- Strict TS, no `any`; functional React + hooks
- Prefer `interface` for shared shapes; JSDoc on exported lib functions
- Components ~300 lines max; split when larger
- Tailwind styling; loading + error states for async UI

## API routes

`NextResponse` + `try/catch`; proper status codes. **No `async` without `await`** (Deno CI fails).

## Data

Single source of truth: verified dataset + adapters. Do not reintroduce synthetic `maDeals` data. Keep provenance honest (`DataCoverageCard`, docs).

## CI

`npm run lint` · `npm run validate:dataset` · `deno lint` (fix `require-await`, `no-unused-vars`) · Datadog needs `DD_API_KEY` / `DD_APP_KEY` secrets

Ops runbook: [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md). Local Postgres: `docker compose up -d`. Readiness: `GET /api/health`, `npm run infra:check`.

## Commits

`feat:`, `fix:`, `chore:` — short, why-focused (e.g. `feat: add verified dataset export API`).

## Security

No secrets in git; validate API inputs; parameterized queries when DB is added.
