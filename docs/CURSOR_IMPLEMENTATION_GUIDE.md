# Lacuna: Cursor IDE Implementation Guide

A practical guide for building Lacuna with Cursor as your AI pair programmer.

**Live demo:** https://lacuna-maekass.vercel.app\
**Repo:** https://github.com/maekass/Lacuna

---

## Table of Contents

1. [Where the project is today vs. the roadmap](#where-the-project-is-today-vs-the-roadmap)
2. [Setup](#setup)
3. [Agent rules (read this first)](#agent-rules-read-this-first)
4. [Actual project structure](#actual-project-structure)
5. [Cursor workflow patterns](#cursor-workflow-patterns)
6. [20 production-ready prompts](#20-production-ready-prompts)
7. [Implementation phases](#implementation-phases)
8. [Cursor command reference](#cursor-command-reference)
9. [Debugging, testing, and CI](#debugging-testing-and-ci)
10. [Git and deployment](#git-and-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Where the project is today vs. the roadmap

### Today (shipped in repo)

| Area              | Status                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Next.js dashboard | App Router, D3 network viz, ML demos, fairness/competitive views     |
| Verified dataset  | `src/data/dataset.verified.json` + `getVerifiedDataset()`            |
| Data coverage UI  | `DataCoverageCard`, methodology docs in `docs/`                      |
| Export API        | `/api/export/deals.csv`, `/api/dataset/verified`                     |
| DB mode seam      | `LACUNA_DATA_MODE=db` in `datasetProvider.ts` (falls back to static) |
| Deploy            | Vercel — https://lacuna-maekass.vercel.app                           |
| Styling           | Tailwind CSS v4 + `src/lib/theme/palette.ts`                         |

### Roadmap (your institutional vision — not built yet)

- Live ingestion: SEC EDGAR, ClinicalTrials.gov, FDA, CMS, news APIs
- PostgreSQL as system of record
- Anthropic-powered deal memos
- Cron sync jobs, alert system, Jest test suite
- MCP connectors → DB → UI pipeline

**Important for Cursor:** Ask agents to extend the verified-dataset architecture
first. Do not let them invent Postgres layers, axios clients, or live SEC
pipelines as if they already exist unless you are explicitly starting that
phase.

---

## Setup

### Prerequisites

```bash
node --version   # v18+ recommended (v20+ typical on macOS)
npm install
npm run dev      # http://localhost:3000
```

### Environment (optional today)

Most features work without env vars. When you add DB or external APIs:

```env
# Future — not required for current demo
DATABASE_URL="postgresql://..."
LACUNA_DATA_MODE="static"   # or "db" when Postgres is wired
ANTHROPIC_API_KEY="..."
```

Never commit `.env.local`. See `.gitignore`.

### Vercel

Project is linked to GitHub. Production URL:
**https://lacuna-maekass.vercel.app**

```bash
cd /Users/maekaess/CascadeProjects/lacuna
npx vercel --prod
```

---

## Agent rules (read this first)

Canonical conventions live in **`AGENTS.md`**. Cursor and Windsurf also load:

| File                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `AGENTS.md`                | Full stack, layout, data rules, CI, commits |
| `.cursor/rules/lacuna.mdc` | Cursor always-on rule                       |
| `.cursorrules`             | Cursor legacy pointer                       |
| `.windsurfrules`           | Windsurf pointer                            |

### Stack (use this — not outdated README badges)

- **Next.js 16**, React 19, TypeScript strict
- **Tailwind v4** (not styled-jsx)
- **fetch** in API routes (not axios unless you add it deliberately)
- **D3**, Framer Motion, TensorFlow.js, simple-statistics, ml-matrix
- **Data:** verified JSON + adapters (`src/lib/data/verifiedDatasetAdapters.ts`)

### Rules that differ from generic Next.js templates

- Components: **PascalCase** filenames in `src/components/`
- Path alias: `@/*` → `src/*`
- No synthetic `maDeals`-style fake arrays
- Deno CI: no `async` without `await`; fix `no-unused-vars`
- Commits: `feat:` / `fix:` / `chore:` with short why-focused descriptions

---

## Actual project structure

```
lacuna/
├── AGENTS.md
├── .cursorrules
├── .cursor/rules/lacuna.mdc
├── .windsurfrules
├── docs/                          # Methodology + this guide
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── clinical-trials/route.ts
│   │   │   ├── dataset/verified/route.ts
│   │   │   └── export/deals.csv/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                # PascalCase.tsx
│   ├── data/
│   │   ├── dataset.verified.json
│   │   └── verifiedData.ts
│   ├── hooks/
│   └── lib/
│       ├── competitive/
│       ├── data/                  # datasetProvider, types, adapters
│       ├── fairness/
│       ├── ml/
│       └── theme/palette.ts
├── .github/workflows/
│   ├── deno.yml
│   └── datadog-synthetics.yml
└── package.json
```

---

## Cursor workflow patterns

### 1. Composer / Agent for multi-file features

Good for: new API route + adapter + component + doc update.

Example prompt:

> Add a `/api/export/companies.csv` route that exports verified companies with
> the same fields as the dataset JSON. Use `getVerifiedDataset()`, match the
> deals CSV pattern, and add a download link to `DataCoverageCard`. Fix any Deno
> lint issues.

### 2. Inline edit (Cmd+K) for local fixes

Good for: lint fixes, copy tweaks, single-component refactors.

### 3. @-mentions for context

- `@AGENTS.md` — conventions
- `@src/data/dataset.verified.json` — schema
- `@docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md` — keep UI honest

### 4. Working in Cursor + Windsurf on the same repo

Both can open the same folder. Use **one primary editor per active branch**,
commit often, and keep `AGENTS.md` / `.windsurfrules` in sync with
`.cursorrules`.

### 5. Before applying agent output

1. TypeScript strict — no `any`
2. Matches verified data source (no new fake arrays)
3. Loading + error states for async UI
4. Deno lint clean (`require-await`, `no-unused-vars`)
5. Methodology doc updated if analytics claims change

---

## 20 production-ready prompts

Adapted for **current repo → institutional roadmap**.

### Phase 1 — Data foundation (current codebase)

1. **Expand verified dataset safely**
   > Add N new verified companies to `dataset.verified.json` with full
   > provenance fields. Update `DataCoverageCard` counts. Do not add undisclosed
   > deal values without `dealValueNote`.

2. **CSV export parity**
   > Ensure `/api/export/deals.csv` columns match `VerifiedAcquisition` in
   > `datasetTypes.ts`. Add unit-style validation in a small lib helper.

3. **Dataset API hardening**
   > Add error handling and cache headers to `/api/dataset/verified`. Document
   > response shape in a JSDoc block on the route.

4. **Adapter consolidation**
   > Audit components still importing legacy shapes; route them through
   > `verifiedDatasetAdapters.ts` only.

5. **Provenance UI**
   > Extend `DataCoverageCard` to show disclosed vs undisclosed deal counts and
   > last-updated date from JSON metadata.

### Phase 2 — Postgres seam (when ready)

6. **Schema design**
   > Design Postgres tables for companies, acquisitions, acquirers, and
   > provenance. Add migration SQL and wire `getFromDb()` in
   > `datasetProvider.ts` with parameterized queries.

7. **Ingestion script**
   > Create `scripts/import-verified-json.ts` to seed Postgres from
   > `dataset.verified.json`.

8. **Env toggle**
   > Document and test `LACUNA_DATA_MODE=db` locally with Neon/Vercel Postgres.

9. **API route DB reads**
   > Refactor export routes to use `getVerifiedDataset()` only (no direct JSON
   > imports).

10. **Index strategy**
    > Add indexes for acquirer, sector, and announcedDate queries; document in
    > `docs/DATA_MODEL.md`.

### Phase 3 — External APIs

11. **ClinicalTrials enrichment**
    > Extend `/api/clinical-trials` to cache responses and map results to
    > company names in the verified dataset.

12. **SEC EDGAR spike**
    > Create `src/lib/ingestion/secEdgarClient.ts` using `fetch` (respect SEC
    > user-agent policy). Parse one 8-K sample into typed interfaces — no DB
    > yet.

13. **FDA opendata**
    > Add lib client for device/drug search by company name; expose read-only
    > `/api/regulatory/[companyId]`.

14. **CMS CPT matcher**
    > Scaffold `cptCodeMatcher.ts` with typed interfaces and mock data; link to
    > reimbursement UI placeholder.

15. **Cron sync route**
    > Add `src/app/api/cron/sec-sync/route.ts` with Vercel cron auth header
    > check (design only, no secrets in repo).

### Phase 4 — Intelligence layer

16. **Deal memo generator**
    > Add server route that summarizes a verified acquisition using Anthropic
    > API; require `ANTHROPIC_API_KEY`; return structured JSON.

17. **Competitive analysis depth**
    > Extend `acquirerAnalysis.ts` with tests for portfolio overlap; sync
    > `docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md`.

18. **Similarity engine**
    > Refactor `CompanySimilarity.tsx` to document feature vectors and
    > limitations in UI copy.

19. **Alert scaffold**
    > Design `AcquisitionAlert` types and a read-only alert list fed from
    > verified dataset (no fake notifications).

20. **OpenClaw / MCP skill**
    > Add `openclaw/skills/lacuna/SKILL.md` and `/api/openclaw/summary` that
    > returns dataset stats + export links.

### Phase 5 — Quality & ops

Use after features land:

- Fix all Deno lint violations repo-wide
- Add Jest for `src/lib/**` when you add `npm test`
- Configure Datadog secrets (`DD_API_KEY`, `DD_APP_KEY`) or disable synthetics
  workflow on forks
- Run Lighthouse on Vercel preview; optimize ForceNetwork bundle

---

## Implementation phases

| Week | Focus                          | Exit criteria                                  |
| ---- | ------------------------------ | ---------------------------------------------- |
| 1    | Verified data + exports + docs | CSV/JSON APIs match UI; coverage card accurate |
| 2    | Postgres + import              | `LACUNA_DATA_MODE=db` works locally            |
| 3    | SEC + ClinicalTrials ingestion | One live connector writing to DB               |
| 4    | Memos + competitive depth      | Anthropic route behind env key                 |
| 5    | CI green + deploy              | Deno lint pass; Vercel prod promoted           |

---

## Cursor command reference

| Action              | Shortcut / command   |
| ------------------- | -------------------- |
| Agent / Composer    | Cmd+I or Agent panel |
| Inline edit         | Cmd+K                |
| Add file to context | `@filename`          |
| Terminal            | Ctrl+`               |
| Git commit (manual) | Source control panel |

Project-specific: read `AGENTS.md` at session start (`@AGENTS.md`).

---

## Debugging, testing, and CI

```bash
npm run dev          # local app
npm run lint         # ESLint
npm run build        # production build check
```

**GitHub Actions**

| Workflow                 | What it does                                     |
| ------------------------ | ------------------------------------------------ |
| `deno.yml`               | `deno lint` + `deno test` — fix lint before push |
| `datadog-synthetics.yml` | Requires `DD_API_KEY` / `DD_APP_KEY` secrets     |

Common Deno failures:

- `require-await` — remove `async` or add `await`
- `no-unused-vars` — prefix with `_` or delete import

---

## Git and deployment

```bash
git checkout -b feat/my-feature
# ... changes ...
git add <files>
git commit -m "feat: short description"
git push -u origin HEAD
```

Open PR to `main` on GitHub. Vercel creates preview deployments per branch.

**Do not force-push `main`.**

---

## Troubleshooting

| Problem                            | Fix                                                                  |
| ---------------------------------- | -------------------------------------------------------------------- |
| `ENOSPC` / disk full               | Clear `.next`, empty Trash, free system storage before `npm install` |
| Vercel deploy from wrong directory | `cd` into `lacuna` where `package.json` lives                        |
| Deno CI fails on unrelated files   | Lint runs whole repo — fix or narrow workflow intentionally          |
| Datadog CI fails                   | Add secrets or skip workflow on personal forks                       |
| Agent invents Postgres/axios       | Point it at `AGENTS.md` and this guide’s “today vs roadmap”          |
| Cursor vs Windsurf overwrite edits | One active editor per branch; commit before switching                |

---

## Related docs

- `AGENTS.md` — agent conventions (canonical)
- `docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md`
- `docs/FAIRNESS_AUDIT_METHODOLOGY.md`
- `docs/NETWORK_ANALYSIS_METHODOLOGY.md`
- `README.md` — product overview (some badges still say Next 14; trust
  `package.json` and `AGENTS.md`)
