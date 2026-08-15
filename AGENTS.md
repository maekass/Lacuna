<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

<!-- END:nextjs-agent-rules -->

# Lacuna — agent conventions

Shared guidance for Cursor, Windsurf, and other AI assistants.

## Project context

Lacuna is an educational M&A intelligence demo for women's health. It visualizes
verified acquisition data, network relationships, health equity focus areas, and
descriptive analytics.

**Live demo:** https://lacuna-maekass.vercel.app

**Site split:** Product stays on **Vercel** (this repo). **Framer**
([framer.com](https://www.framer.com)) is for brand + narrative only (hero,
methodology story, hiring/portfolio), with one primary CTA into the live app —
not for hosting analytics. Build kit:
[framer/BUILD_GUIDE.md](framer/BUILD_GUIDE.md). See
[docs/SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md). (Do not confuse with
**Framer Motion** in `package.json`.)

This is portfolio/educational code. Be honest about data limits (curated static
dataset, partial price disclosure, methodology in `docs/`).

## Current stack

| Layer             | Technology                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| Framework         | Next.js **16**, React **19**                                                      |
| Language          | TypeScript (`strict: true`)                                                       |
| Styling           | **Tailwind CSS v4** + `globals.css` / `src/lib/theme/palette.ts`                  |
| Viz               | D3.js v7, Framer Motion                                                           |
| Server LLM        | Vercel AI Gateway via `src/lib/ai/inference.ts` (AI SDK); see `docs/INFERENCE.md` |
| Scoring / vectors | simple-statistics on **verified dataset only** — no invented fallbacks            |
| HTTP              | Native **`fetch`** (no axios)                                                     |
| Data              | `src/data/dataset.verified.json` via `getVerifiedDataset()`                       |
| Future DB         | `LACUNA_DATA_MODE=db` in `src/lib/data/datasetProvider.ts`                        |

## Roadmap (not built — do not invent without request)

PostgreSQL ingestion, SEC/ClinicalTrials/FDA/CMS connectors, Jest under
`__tests__/`. Framer marketing site (separate from this repo) per
[SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md).

## Layout

`src/app` pages + API routes · `src/components` (PascalCase files) · `src/lib`
logic · `src/data` JSON · `@/*` → `src/*`

## Code style

- Strict TS, no `any`; functional React + hooks
- Prefer `interface` for shared shapes; JSDoc on exported lib functions
- Components ~300 lines max; split when larger
- Tailwind styling; loading + error states for async UI

## API routes

`NextResponse` + `try/catch`; proper status codes. **No `async` without
`await`** (Deno CI fails).

## Data

Single source of truth: verified dataset + adapters. Do not reintroduce
synthetic `maDeals` data. Keep provenance honest (`DataCoverageCard`, docs).
Promotion must not invent sector, HQ, or founded year — see
[docs/DATA_BOUNDARIES.md](docs/DATA_BOUNDARIES.md).

**No invented numbers in production UI.** Do not add:

- Hardcoded TAM/SAM/SOM, payer-mix tables, or sector multiple fallbacks
- Legacy acquirer panels (`STRATEGIC_ACQUIRERS`) or keyword-derived risk scores
- `sampleSize: 0` editorial benchmarks merged into valuation outputs

When verified data is insufficient, show empty state / “insufficient disclosed
data” — never silently substitute PitchBook/Rock Health rule-of-thumb values.
Cited external research datasets (WEF, HLTH survey, payer benchmarks) must keep
`cited_*` provenance and stay separate from `dataset.verified.json`.

CI guard: `__tests__/lib/data/noSyntheticData.test.ts`.

## CI

`npm run lint` · `npm run validate:dataset` · `npm run deno:fmt:check` (Deno
**v2.1.4** via `npx`; Husky auto-formats on commit) · `npm run deno:lint` (fix
`require-await`, `no-unused-vars`) · Datadog needs `DD_API_KEY` / `DD_APP_KEY`
secrets

Use the **Deno** VS Code/Cursor formatter for `src/`, `scripts/`, and
`__tests__/` — not Prettier (CI enforces `deno fmt`).

Ops runbook: [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md). Uptime monitors:
`GET /api/health` only — [docs/MONITORING.md](docs/MONITORING.md). Local
Postgres: `docker compose up -d`. Deploy smoke: `GET /api/health/ready`.
`npm run infra:check`, `npm run monitor:liveness`.

## Commits

`feat:`, `fix:`, `chore:` — short, why-focused (e.g.
`feat: add verified dataset export API`).

## Security

No secrets in git; validate API inputs; parameterized queries when DB is added.

## Cursor Cloud specific instructions

Scope: the primary product is the **Next.js app at the repo root** (deployed to
Vercel). It runs standalone off the static verified dataset
(`LACUNA_DATA_MODE=static`, the default) — **no Postgres/ClickHouse/python-api/
dotnet-api needed** to develop, test, or run it. Everything under `services/`
and `ml/` is optional/self-hosted and out of scope for normal app work.

- **Node 24 is required** (`engines.node: 24.x`, `.nvmrc` = 24). The Cloud VM's
  default `node` on `PATH` (`/exec-daemon/node`) is v22 and must not be touched.
  The update script and `~/.bashrc` select Node 24 via `nvm use 24`; if a shell
  ever reports v22, run `nvm use 24` (it prepends Node 24 ahead of the daemon
  node). Confirm with `node --version` → `v24.x`.
- Run/lint/test/build (all standard, see `package.json`):
  - Dev server: `npm run dev` → http://localhost:3000 (Turbopack, ~fast start).
  - Lint: `npm run lint` · Types: `npm run typecheck`.
  - Deno (CI-parity, downloaded on demand via `npx deno@2.1.4`):
    `npm run deno:fmt:check` and `npm run deno:lint`.
  - Tests: `npm test` (Vitest; ~646 tests). No DB/network needed — external
    calls (SEC/ClinicalTrials.gov) are mocked; a logged `SEC API 403` line in
    test output is an expected mocked failure, not a real error.
  - Dataset guard: `npm run validate:dataset` (also runs inside `npm run build`;
    "Validation passed with warnings" is a pass).
- Build note: plain `npm run build` runs `validate:dataset` then `next build`.
  CI/Vercel and the Husky pre-push hook use `build:ci`/`start:ci` which pin
  `LACUNA_DATA_MODE=static` — prefer those to avoid db-mode `.env.local`
  surprises. Husky pre-commit auto-runs `deno fmt` and re-stages files.
- Optional integrations degrade gracefully: AI endpoints (`/api/ai/*`) return
  `503` without `AI_GATEWAY_API_KEY`/`OPENAI_API_KEY`; the live trials panel
  needs outbound internet. None of these block the core app.
