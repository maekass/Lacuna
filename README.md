<!--
SEO Meta Description: Lacuna — women's health M&A diligence stack. Verified deals (n=58), clinical trial search, genomics governance, cited analytics. Not live market data or predictive ML.
-->

<h1 align="center">Lacuna</h1>

<p align="center">
  <strong>Women's health M&A diligence stack — verified deals, genomics governance, cited analytics</strong>
</p>

<blockquote align="center">
  <p><strong>Curated dataset · n=58 verified deals · Not live market data · Scores are descriptive, not forecasts.</strong></p>
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

## Table of Contents

- [Overview](#overview)
- [What is Lacuna?](#what-is-lacuna)
- [Live Demo](#live-demo)
- [Core Features](#core-features)
- [Descriptive analytics](#descriptive-analytics-not-predictive-ml)
- [Health Equity context](#health-equity--black-womens-health)
- [Clinical Trials](#clinical-trials-integration)
- [Genomics variant store](#genomics-variant-store-optional)
- [Academic frameworks](#academic-frameworks)
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

| Claim                   | Reality                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Deal data               | Static `dataset.verified.json` (manual verification from SEC, press, filings)           |
| Scores & “predictors”   | Deterministic rules and small-_n_ statistics — [MODEL_CARD.md](docs/MODEL_CARD.md)      |
| “ML” / TensorFlow       | Quarantined under `src/lib/ml/_quarantine/` — **not** imported by the app               |
| Server LLM              | [INFERENCE.md](docs/INFERENCE.md) — Vercel AI Gateway (+ OpenAI fallback for local dev) |
| Clinical trials panel   | Live ClinicalTrials.gov search; **M&A panels** still use the curated dataset            |
| Production intelligence | **No** — not PitchBook, not a data SLA, not investment advice                           |

Open source under [BSL 1.1](LICENSE) for corp VC diligence workflows, portfolio
review, and self-hosted exploration. Commercial competitive products need a
separate license — [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu).

Portfolio project by [Mae Kass](https://github.com/maekass).

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

- **58 verified acquisitions** (fertility, oncology, diagnostics, menopause,
  pelvic health, precision medicine)
- Acquirers include Hologic, KKR, Pfizer, Gilead, Boston Scientific, and others
  named in sources
- Dataset v5 · updated per `provenance.lastUpdated` in JSON
- Sources: SEC EDGAR, press releases, investor relations (see
  [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md))

### Interactive network (`ForceNetwork.tsx`)

D3 force-directed graph: sector colors, deal-type edges, valuation-scaled nodes.
Methodology:
[NETWORK_ANALYSIS_METHODOLOGY.md](docs/NETWORK_ANALYSIS_METHODOLOGY.md).

### Deal flow (`DealFlowChart.tsx`)

Year-over-year counts from verified `announcedDate` — animated bars, no
synthetic deal generator.

### Valuation matrix (`ValuationMatrix.tsx`)

Sector × stage heatmap using disclosed values only; cells show company counts
and averages.

---

## Descriptive analytics (heuristics, not trained models)

> Curated dataset · n=58 verified deals · Not live market data · Scores are
> descriptive, not forecasts.

### Acquisition likelihood indicators (`ExitPredictor.tsx`)

Transparent factor scoring for **non-acquired** companies in the verified set.
Fixed weights, full disclosure in UI and [MODEL_CARD.md](docs/MODEL_CARD.md).
**Not** a predictive model; no TensorFlow.

### Company similarity (`CompanySimilarity.tsx`)

8-D feature vectors, inline cosine similarity — “companies like this” for
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

## Technology Stack

| Layer                                  | Used in production UI                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Next.js 16, React 19, Tailwind v4      | App shell                                                                    |
| D3.js v7, Framer Motion                | Visualization                                                                |
| simple-statistics                      | Descriptive stats / similarity                                               |
| Verified JSON (`getVerifiedDataset()`) | Default data path                                                            |
| PostgreSQL                             | Optional `LACUNA_DATA_MODE=db`                                               |
| ClickHouse + S3/local object storage   | Optional variant call-set catalog (`LACUNA_VARIANT_STORE=clickhouse`)        |
| Vercel AI Gateway + AI SDK             | Optional narratives + SEC classification ([INFERENCE.md](docs/INFERENCE.md)) |
| TensorFlow.js                          | Quarantined — devDependency for Vitest only                                  |

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

**[Mae Kass](https://github.com/maekass)** — open investment-research tools for
women's health data literacy and honest analytics.
