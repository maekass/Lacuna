<!--
SEO Meta Description: Lacuna — women's health M&A diligence stack. Verified deals (n=58), clinical trial search, genomics governance, cited analytics. Not live market data or predictive ML.
-->

<h1 align="center">Lacuna</h1>

<p align="center">
  <strong>Women's health M&A diligence stack — verified deals, genomics governance, cited analytics</strong>
</p>

<blockquote align="center">
  <p><strong>Curated dataset · n=51 med/biotech deals (default) + consumer health workspace · 150 companies total · Not live market data.</strong></p>
</blockquote>

<p align="center">
  The live app reads <code>src/data/dataset.verified.json</code> by default. Server-side LLM calls use <a href="docs/INFERENCE.md">Vercel AI Gateway</a> only. TensorFlow code is <a href="src/lib/ml/_quarantine/">quarantined</a> (not in the app). See <a href="docs/MODEL_CARD.md">MODEL_CARD.md</a> before citing any score.
</p>

<p align="center">
  <a href="https://lacuna-maekass.vercel.app">
    <img src="./public/social-preview.svg" alt="Lacuna — women's health M&A investment research stack with verified deal network visualization" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-C8A8E9?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-D4A5E0?style=flat-square&logo=react&logoColor=white" alt="React 19"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.0-E8B4D9?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://d3js.org"><img src="https://img.shields.io/badge/D3.js-v7-C9A0DC?style=flat-square&logo=d3.js&logoColor=white" alt="D3.js v7"></a>
  <a href="docs/MODEL_CARD.md"><img src="https://img.shields.io/badge/Data-verified_JSON-E8B4D9?style=flat-square" alt="Verified JSON dataset"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-B19CD9?style=flat-square" alt="BSL 1.1"></a>
  <a href="https://lacuna-maekass.vercel.app"><img src="https://img.shields.io/badge/Demo-Vercel-C8A2C8?style=flat-square&logo=vercel&logoColor=white" alt="Live demo"></a>
</p>

<div style="font-family: Didot, 'Bodoni MT', Georgia, 'Playfair Display', 'Times New Roman', serif;">

## Table of Contents

- [Overview](#overview)
- [What is Lacuna?](#what-is-lacuna)
- [Live Demo](#live-demo)
- [Core Features](#core-features)
- [Descriptive analytics](#descriptive-analytics-heuristics-not-predictive-ml)
- [AI & biotech diligence best practices](#ai--biotech-diligence-best-practices)
- [Health Equity context](#health-equity--black-womens-health)
- [Clinical Trials](#clinical-trials-integration)
- [Genomics variant store](#genomics-variant-store-optional)
- [Academic frameworks](#academic-frameworks)
- [Typography](#typography)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Data Curation](#data-curation)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

**Lacuna** is an **investment research stack** — a diligence infrastructure
prototype with a curated, source-linked snapshot of women's health M&A (58
verified deals), rendered as D3 network views and **descriptive** analytics with
published methodology.

| Claim                   | Reality                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deal data               | Static `dataset.verified.json` v8 — dual scope: medicine & biotech (default) + consumer health (`/consumer`); 150 companies, 59 deals full catalog |
| Scores & "predictors"   | Deterministic rules and small-_n_ statistics — [MODEL_CARD.md](docs/MODEL_CARD.md)                                                                 |
| "ML" / TensorFlow       | Quarantined under `src/lib/ml/_quarantine/` — **not** imported by the app                                                                          |
| Server LLM              | [INFERENCE.md](docs/INFERENCE.md) — Vercel AI Gateway (+ OpenAI fallback for local dev)                                                            |
| Clinical trials panel   | Live ClinicalTrials.gov search; **M&A panels** still use the curated dataset                                                                       |
| Production intelligence | **No** — not PitchBook, not a data SLA, not investment advice                                                                                      |

Open source under [BSL 1.1](LICENSE) for corp VC diligence workflows, portfolio
review, and self-hosted exploration. Commercial competitive products need a
separate license — [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu).

Portfolio project by [Mae Kass](https://github.com/maekass) (MS/MPH; PsyD
candidate; incoming MBA 2027) —
[signatory](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
to the G20 & G7 Health and Development Partnership
[H20 Call to Action](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
on global health diplomacy (Aug 2024).

**Deployment:** The analytics product runs on **Vercel** (this repo). A separate
**Framer** site is for brand and narrative only, with one primary CTA into the
live demo — see [SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md) and the
[framer/](framer/) build kit.

---

## What is Lacuna?

An open-source **diligence prototype** for corporate VC and healthcare investors
exploring verified women's health / FemTech M&A:

- **D3.js** force-directed acquirer–target graphs
- **Deal flow & valuation** charts (curated counts and disclosed values)
- **Descriptive scoring** (factor weights, cosine similarity, k-means — no
  trained forecast models in the UI)
- **ClinicalTrials.gov** lookup (live API; separate from deal JSON)
- **Health-equity context** with cited disparity statistics (descriptive, not
  allocation advice)

Every analytical panel in the app shows the provenance line above.

---

## Live Demo

**[lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app)**

| Resource        | Link                                                           |
| --------------- | -------------------------------------------------------------- |
| **Application** | [lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app) |
| **Repository**  | [github.com/maekass/Lacuna](https://github.com/maekass/Lacuna) |
| **Methodology** | [docs/MODEL_CARD.md](docs/MODEL_CARD.md)                       |
| **License**     | [BSL 1.1](LICENSE) → Apache 2.0 May 2030                       |

---

## Core Features

### Verified deal explorer

- **51 medicine & biotech acquisitions** (default Deals workspace) — fertility
  science, oncology, diagnostics, menopause therapeutics, medtech
- **8 consumer health acquisitions**
  ([`/consumer`](https://lacuna-maekass.vercel.app/consumer)) — wearables,
  wellness apps, consumer digital health
- **46 fund portfolio investments** (c90–c135) — overlays filter by workspace
  scope
- Acquirers include Hologic, KKR, Pfizer, Gilead, Boston Scientific, and others
  named in sources
- Dataset **v8** · `provenance.lastUpdated: 2026-07-06`
- Sources: SEC EDGAR, press releases, investor relations, fund portfolio listing
  (see [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md))

### Interactive network (`ForceNetwork.tsx`)

D3 force-directed graph: sector colors, deal-type edges, valuation-scaled nodes.
Three portfolio overlays are toggleable — **Foreground Capital (FG)**, **Amboy
Street Ventures (AS)**, and the **Fund Portfolio (FD)** — each with a distinct
color and pulse-ring badge on matching nodes. Methodology:
[NETWORK_ANALYSIS_METHODOLOGY.md](docs/NETWORK_ANALYSIS_METHODOLOGY.md).

### Deal flow (`DealFlowChart.tsx`)

Year-over-year counts from verified `announcedDate` — animated bars, no
synthetic deal generator.

### Valuation matrix (`ValuationMatrix.tsx`)

Sector × stage heatmap using disclosed values only; cells show company counts
and averages.

### Exit-likelihood leaderboard (`QuantValuationPanel.tsx`)

**New:** Heuristic valuation and exit-likelihood section with:

- **ValuationEngine** — bounded comparable multiples (EV/Revenue, EV/EBITDA)
  with uncertainty disclosures
- **AcquisitionPredictor** — sector-stage acquisition probability estimates
  (15/75 coverage noted)
- **HealthImpactModeler** — lives-saved modeling with Cohen's d bounds (not a
  rate)
- **PortfolioOptimizer** — stage-varying risk-adjusted ROI optimizer
- **Verified-fields-only adapter** — `adaptQuantCompany` uses only validated
  dataset fields; absent inputs remain undefined per provenance rules

See [MODEL_CARD.md](docs/MODEL_CARD.md) for methodology and caveats.

---

## Descriptive analytics (heuristics, not predictive ML)

> Curated dataset · n=59 verified deals · 135 companies · Not live market data ·
> Scores are descriptive, not forecasts.

### Acquisition likelihood indicators (`ExitPredictor.tsx`)

Transparent factor scoring for **non-acquired** companies in the verified set.
Fixed weights, full disclosure in UI and [MODEL_CARD.md](docs/MODEL_CARD.md).
**Not** a predictive model; no TensorFlow.

### Company similarity (`CompanySimilarity.tsx`)

8-D feature vectors, inline cosine similarity — "companies like this" for
exploration.

### Clustering (`ClusteringAnalysis.tsx`)

k-means on valuation × employees — descriptive segments (Emerging / Growth /
Late-stage labels).

### Optional server narratives ([INFERENCE.md](docs/INFERENCE.md))

- UI blurbs via `POST /api/ai/insights` → Vercel AI Gateway
  (`anthropic/claude-sonnet-4` slug).
- Exploratory copy only — heuristic scores on the curated dataset remain
  authoritative.

---

## AI & biotech diligence best practices

Python and AI in biotech investing emphasize **modular pipelines**, **source
tracing**, and **rigorous testing** — not black-box financial outputs. Lacuna
implements these principles for women's health M&A diligence
(TypeScript/Next.js, not Python, but the architecture mirrors the same
discipline).

### Architectural and data best practices

| Practice                            | Guidance                                                             | Lacuna implementation                                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modular agentic pipelines**       | Separate agents for trials, filings, news — not one black-box model  | SEC ingestion + deal classification (`dealClassificationEngine.ts`), optional UI narratives (`/api/ai/insights`), deterministic analytics (exit predictor, quant engine) — each with its own module and fallback path |
| **Data verification & permissions** | Document-level tracing; never trust AI summaries without sources     | `dataset.verified.json` with A–E evidence grades, dual-attestation in [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md), `DataProvenanceBanner`, source citations on every deal                           |
| **Alternative data integration**    | Patents, conference abstracts, physician sentiment for early signals | SEC EDGAR + press + fund portfolio listings today; patents and abstracts as **discovery-only** (grade D) per curation rules — never sole merge sources                                                                |

### Analytical best practices

| Practice                     | Guidance                                                  | Lacuna implementation                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Domain AI + general LLMs** | LLMs for synthesis; domain ML for sequences/structure     | LLMs for exploratory copy and SEC women's-health classification only; scoring uses `simple-statistics` heuristics on verified fields — see [MODEL_CARD.md](docs/MODEL_CARD.md) |
| **Clinical trial modeling**  | Historical trial data for recruitment, approval timelines | Live ClinicalTrials.gov search (`/api/clinical-trials`) — **separate** from curated M&A JSON; no outcome-prediction claims                                                     |
| **Cash runway & valuation**  | Deterministic pandas/numpy models for capital efficiency  | `ValuationEngine`, `QuantValuationPanel`, `adaptQuantCompany` — bounded multiples and disclosed values only; absent inputs stay undefined                                      |

### Investment risk management

| Practice                        | Guidance                                                         | Lacuna scope                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **The "30% rule"**              | AI handles ~70% of gathering/hypothesis; humans retain oversight | Staging CSV + manual merge; no auto-merge from SEC scans; heuristic scores are descriptive, not buy/sell signals              |
| **Platform vs. pipeline focus** | Beware broad "AI for drug discovery" without underlying biology  | Deal-centric women's health M&A — fertility, pelvic health, diagnostics, digital health — not general biotech equity research |
| **Options & volatility**        | Straddles/strangles around FDA/trial catalysts                   | **Out of scope** — Lacuna is diligence infrastructure, not a trading or portfolio-risk tool                                   |

### How Lacuna maps to common investor questions

| Question                                              | Lacuna answer                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Early-stage startups or large-cap clinical biopharma? | **Deal-centric**, not equity-stage-focused — verified M&A and strategic investments across women's health (digital health, medtech, therapeutics-adjacent) |
| What data sources?                                    | Curated JSON (SEC, press, IR, fund portfolios); live ClinicalTrials.gov search; optional SEC 8-K ingestion with AI-assisted classification                 |
| Financial fundamentals or genomic/clinical datasets?  | **M&A fundamentals** — disclosed deal values, acquirer patterns, sector clustering, evidence maturity — not genomic sequence analysis or trial-outcome ML  |

### On-brand extensions (roadmap, not built)

1. **Clinical trial enrichment** — Link portfolio companies to
   ClinicalTrials.gov NCT IDs (metadata only).
2. **Cash runway / milestone tracker** — For public acquirers or disclosed
   funding rounds already in the dataset.
3. **Modular ingestion agents** — Extend the SEC classifier pattern: filings,
   press, trial registry — each with provenance tags.
4. **Alternative data (careful)** — Conference abstracts or patents as discovery
   (grade D), never sole merge sources.

---

## Health Equity & Black Women's Health

Descriptive context on disease areas with documented disparities and public
market-size estimates — for learning, not buy/sell recommendations:

| Disease                | Disparity (cited in docs)  | Public market-size estimate |
| ---------------------- | -------------------------- | --------------------------- |
| Maternal Health        | Higher mortality disparity | $12B                        |
| Uterine Fibroids       | High prevalence            | $34B                        |
| Lupus                  | Higher prevalence          | $8B                         |
| Sickle Cell Disease    | Population concentration   | $5B                         |
| Cardiovascular Disease | Higher mortality           | $15B                        |

See [OAIS_METHODOLOGY.md](docs/OAIS_METHODOLOGY.md) for scoring limits.

---

## Clinical Trials Integration

- **Live**: `/api/clinical-trials` → ClinicalTrials.gov API v2 (search, batch
  lookup)
- **Curated M&A**: unchanged — still `dataset.verified.json`

Do not conflate live trial search volume with verified deal coverage.

---

## Genomics variant store (optional)

Large VCF/gVCF call sets use a **two-tier** layout (off by default on Vercel):

| Tier            | Technology                   | Contents                                       |
| --------------- | ---------------------------- | ---------------------------------------------- |
| Object storage  | Local `data/variants/` or S3 | Multi-GB raw VCF blobs                         |
| Variant catalog | ClickHouse                   | Callset metadata + queryable variant summaries |

- **Dashboard:** `VariantCallsetBrowser` — browse callsets, filter by gene,
  presigned S3 download when configured
- **APIs:** `/api/genomics/callsets`, `/api/genomics/variants`,
  `/api/genomics/callsets/{id}/object`
- **Ingest:** `npm run clickhouse:ingest-vcf` — stream parser → object storage →
  batch INSERT
- **Docs:** [GENOMICS_VARIANT_STORE.md](docs/GENOMICS_VARIANT_STORE.md)

```bash
docker compose up -d clickhouse
# .env.local: LACUNA_VARIANT_STORE=clickhouse, CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123
npm run clickhouse:migrate && npm run clickhouse:seed
npm run dev
```

Not clinical-grade genomics infrastructure — infrastructure demo with honest
provenance labels.

---

## Academic Frameworks

Six frameworks with **explicit small-_n_ limits** documented in `docs/` (causal
DAG, fairness audit, network concentration, etc.). We state what cannot be
claimed with n≈58 deals — see methodology files linked from the app.

---

## Typography

The live app loads **Playfair Display** (Didone serif) via `next/font/google`
and applies it app-wide — body copy, headings, and `font-mono` utilities share
the same family for a high-contrast editorial look.

**GitHub does not load custom web fonts.** This README uses a Didone fallback
stack (`Didot`, `Bodoni MT`, Georgia) so the page reads closer to the product on
github.com. Only the [live demo](https://lacuna-maekass.vercel.app) renders true
Playfair Display.

---

## Technology Stack

| Layer                                  | Used in production UI                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Playfair Display (`next/font/google`)  | App-wide Didone serif typography                                             |
| Next.js 16, React 19, Tailwind v4      | App shell                                                                    |
| D3.js v7, Framer Motion                | Visualization                                                                |
| simple-statistics                      | Descriptive stats / similarity / quant engine                                |
| Verified JSON (`getVerifiedDataset()`) | Default data path; static import for Vercel serverless                       |
| PostgreSQL                             | Optional `LACUNA_DATA_MODE=db`                                               |
| ClickHouse + S3/local object storage   | Optional variant call-set catalog (`LACUNA_VARIANT_STORE=clickhouse`)        |
| Vercel AI Gateway + AI SDK             | Optional narratives + SEC classification ([INFERENCE.md](docs/INFERENCE.md)) |
| TensorFlow.js                          | Quarantined — devDependency for Vitest only                                  |
| Deno (CI)                              | `deno fmt` and `deno lint` in GitHub Actions                                 |

**CI Status:** `deno fmt`, `deno lint`, `eslint`, `vitest` (297 tests),
`next build` + `tsc` all green on main (`c8f2361`).

---

## Quick Start

```bash
git clone https://github.com/maekass/Lacuna.git
cd Lacuna
npm install
npm run dev
npm run validate:dataset
npm run infra:check
npm test
```

Open `http://localhost:3000`. Data loads from `src/data/dataset.verified.json`
unless `LACUNA_DATA_MODE=db` is set **and** Postgres is provisioned.

**Optional local Postgres:** `docker compose up -d` → copy
[`.env.example`](.env.example) to `.env.local` →
`npm run db:migrate && npm run db:import`. See
[INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).

**Optional variant store:** `docker compose up -d clickhouse` → set
`LACUNA_VARIANT_STORE=clickhouse` →
`npm run clickhouse:migrate && npm run clickhouse:seed`. See
[GENOMICS_VARIANT_STORE.md](docs/GENOMICS_VARIANT_STORE.md).

---

## Data Curation

Manual verification — no synthetic `maDeals`. Workflow:
[DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md),
`npm run validate:dataset`, optional `npm run sec:scan`.

---

## Documentation

| Doc                                                                     | Purpose                                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| [MODEL_CARD.md](docs/MODEL_CARD.md)                                     | **Start here** — what each score is and is not              |
| [INFERENCE.md](docs/INFERENCE.md)                                       | Server-side LLM (AI Gateway)                                |
| [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md)           | Schema, validation, staging                                 |
| [NETWORK_ANALYSIS_METHODOLOGY.md](docs/NETWORK_ANALYSIS_METHODOLOGY.md) | Graph metrics, small-_n_                                    |
| [OAIS_METHODOLOGY.md](docs/OAIS_METHODOLOGY.md)                         | Health impact scoring limits                                |
| [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)                             | CI, Vercel, Postgres, cron, `/api/health`                   |
| [PERFORMANCE.md](docs/PERFORMANCE.md)                                   | Bundle, caching, probe split, fan-out limits                |
| [GENOMICS_VARIANT_STORE.md](docs/GENOMICS_VARIANT_STORE.md)             | ClickHouse + object storage for large VCF catalogs          |
| [MONITORING.md](docs/MONITORING.md)                                     | Uptime URL: `/api/health` only (not `/ready`)               |
| [PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)                         | Vercel env vars and migrations                              |
| [SEC_INGESTION.md](docs/SEC_INGESTION.md)                               | SEC EDGAR cron pipeline                                     |
| [SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md)                       | Vercel product vs Framer marketing (no analytics in Framer) |
| [framer/BUILD_GUIDE.md](framer/BUILD_GUIDE.md)                          | Framer marketing site — copy, tokens, HTML prototype        |
| [AGENTS.md](AGENTS.md)                                                  | Contributor conventions                                     |

---

## License

[BSL 1.1](LICENSE) — research/education production use allowed; **Competitive
Offerings** (commercial women's-health M&A intelligence products) require a
separate agreement. Converts to Apache 2.0 May 2030.

[mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) for commercial licensing.

---

## Author

**[Mae Kass](https://github.com/maekass)** — MS/MPH; PsyD candidate; incoming
MBA (2027). Open investment-research tools for women's health data literacy and
honest analytics.

Signatory to the
[G20 & G7 Health and Development Partnership H20 Call to Action](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
(_The Future of Global Health Diplomacy in a Changing World_, August 2024) —
advocating for women's, maternal, and child health on the G7/G20 agenda,
gender-specific health data, and innovative financing for women's health.

<p align="center">
  <sup>†</sup> <small>Deal counts and acquisition examples shown in-app — including Payer Ops VC signals — are computed from <code>src/data/dataset.verified.json</code> via <code>src/lib/payerOps/vcSignalModel.ts</code> and related model scripts; not synthetic deal data.</small>
</p>

</div>
