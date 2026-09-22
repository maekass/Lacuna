<!--
SEO Meta Description: Lacuna — public-source, evidence-aware women's-health M&A and commercialization diligence. Curated deals, trial and reimbursement context, disclosed-data limits. Not a live terminal, forecast, or clinical tool.
-->

<h1 align="center">Lacuna</h1>

<p align="center">
  <strong>Public-source diligence for women’s-health M&amp;A and commercialization</strong>
</p>

<blockquote align="center">
  <p><strong>Curated public-source sample · 59 verified deals · 150 companies · 38 acquirers · Not a census, a live terminal, or investment advice.</strong></p>
</blockquote>

<p align="center">
  <a href="https://lacuna-maekass.vercel.app">
    <img src="./public/social-preview.svg" alt="Lacuna — women's health M&A diligence with a source-linked deal network" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-C8A8E9?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-D4A5E0?style=flat-square&logo=react&logoColor=white" alt="React 19"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-E8B4D9?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-24-C8A8E9?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 24"></a>
  <a href="https://d3js.org"><img src="https://img.shields.io/badge/D3.js-v7-C9A0DC?style=flat-square&logo=d3.js&logoColor=white" alt="D3.js v7"></a>
  <a href="docs/MODEL_CARD.md"><img src="https://img.shields.io/badge/Scores-descriptive_only-E8B4D9?style=flat-square" alt="Descriptive scores only"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-B19CD9?style=flat-square" alt="BSL 1.1"></a>
  <a href="https://lacuna-maekass.vercel.app"><img src="https://img.shields.io/badge/Demo-Vercel-C8A2C8?style=flat-square&logo=vercel&logoColor=white" alt="Live demo"></a>
</p>

## What Lacuna is

Lacuna is a **public-source, evidence-aware women’s-health M&A and
commercialization diligence environment**. It helps a reader explore a curated
set of acquisition records, strategic buyer patterns, evidence maturity,
clinical-trial and research context, reimbursement and commercialization
questions, and the limits of those sources.

The product app runs on **Vercel** from this repository. A separate **Framer**
site is brand and narrative only, with one call to action into the app —
[SITE_ARCHITECTURE.md](docs/SITE_ARCHITECTURE.md).

**Live demo:** [lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app)

## Integrity boundaries

| Boundary                              | What that means here                                                                                                                                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not a live institutional terminal     | Default data is the committed file `src/data/dataset.verified.json` (dataset v9). It is a convenience sample with public citations, not PitchBook, a data SLA, or a census of women’s-health M&A.                                                                                 |
| Not advice                            | The app does not provide investment advice, clinical guidance, treatment recommendations, or patient-specific interpretation.                                                                                                                                                     |
| Scores stay descriptive               | Exit Similarity Explorer and the comparables panel are hand-weighted indexes on this catalog. They are not predictions, probabilities, forecasts, calibrated models, enterprise valuations, or expected returns. Read [MODEL_CARD.md](docs/MODEL_CARD.md) before citing a number. |
| No causal claims                      | `/methods` reports record quality, sector counts, and announcement timing. It does not identify causal effects, treatment effects, or Bayesian causal estimates.                                                                                                                  |
| Trial models withheld                 | Offline clinical-trial classifiers exist in the repo. Percentages stay off the public UI while `trainingSource` is `synthetic_seed`. Live trial **search** (ClinicalTrials.gov) is separate and is not a model score. See [ML_CLINICAL_TRIALS.md](docs/ML_CLINICAL_TRIALS.md).    |
| No synthetic rows in the deal product | Public deal counts, networks, and disclosed-value totals come from the verified JSON. Staging, seed files, and illustrative heuristics are not merged into those figures. See [DATA_BOUNDARIES.md](docs/DATA_BOUNDARIES.md).                                                      |

When a field is missing, panels show insufficient disclosed data. They do not
fill gaps with TAM/SAM, sector-multiple fallbacks, or editorial stage medians.

## What you can do in the app

| Workspace       | Route           | Role                                                                                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deals           | `/deals`        | Source-linked network, announced-year activity, disclosed-value matrix, acquirer patterns, comparable context, similarity bands                                   |
| Consumer health | `/consumer`     | Same catalog, filtered to wearables, wellness apps, and consumer digital health                                                                                   |
| Deal dossier    | `/deals/[id]`   | One verified transaction and its citations. Name-search trials, FDA, and CMS results are not attached unless a reviewer has keyed a public NCT or CPT citation    |
| Payer Ops       | `/payer-ops`    | Prior-authorization and claims-ops context plus venture signals computed from the verified catalog                                                                |
| Research        | `/research`     | Trial search, evidence-maturity and burden context, health-equity markers, optional genetics browser. Heuristics here are labeled and do not feed deal economics  |
| Intelligence    | `/intelligence` | Reimbursement questions, precedent maps, and dataset export. Fit scores are affinity, not premiums or comps                                                       |
| Methods         | `/methods`      | Record-quality grades, observed sector composition, and announcement timing on the verified set. This page does not publish causal effects or Bayesian posteriors |

| Pinned catalog fact                    | Role in the public app                  |
| -------------------------------------- | --------------------------------------- |
| **51 medicine & biotech acquisitions** | Default Deals scope                     |
| **8 consumer health acquisitions**     | `/consumer` filter of the same file     |
| **46 fund portfolio investments**      | Overlays, not extra closed acquisitions |
| 50 of 59 deals                         | Rows that disclose a price              |

## Deal evidence

- n=59 verified deals · 150 companies · 38 acquirers.
- `dataset.verified.json` v9 (`provenance.lastUpdated: 2026-09-20`).
- Sources are public: SEC filings, press releases, investor relations, and fund
  portfolio listings, graded in
  [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md). Promotion does
  not invent sector, headquarters, or founded year.
- Disclosed-value headlines are **sums of observed prices** on completed
  women’s-health deals that published a number. They are not total market
  volume. Current pinned figures and the sampling frame are in
  [LIMITATIONS.md](docs/LIMITATIONS.md). Coverage against an external exit list
  is an observed ratio, not a capture-recapture estimate.
- Acquirer panels report counts, sector mix, timing, and disclosed size. They do
  not infer strategy, synergies, or the next target. See
  [COMPETITIVE_ANALYSIS_METHODOLOGY.md](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md).

## Research and reimbursement context

**Clinical trials.** `/api/clinical-trials` searches ClinicalTrials.gov. That
volume is not deal coverage. Model-derived women’s-health relevance and
completion-proxy badges are withheld until training uses live registry labels
rather than the synthetic seed artifact.

**Reimbursement.** Source-traceable fee-schedule and coverage questions live
under `src/lib/reimbursement/` and ship only after review. Older multiple tables
(for example insurance-driven versus consumer-only “premiums”) are unsupported
rules of thumb and are not analytical output. See
[REIMBURSEMENT_INTELLIGENCE.md](docs/REIMBURSEMENT_INTELLIGENCE.md).

**Health equity.** Marker panels cite published disparity statistics (CDC, ACS,
and similar). They are context. They are not market sizing or allocation advice.

**Narratives.** Optional copy from `POST /api/ai/insights` uses Vercel AI
Gateway when a key is configured and returns 503 otherwise. Narrative text does
not override dataset fields or heuristic labels. See
[INFERENCE.md](docs/INFERENCE.md).

## Stack

| Layer                                             | In the public app                                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Next.js 16, React 19, TypeScript, Tailwind CSS v4 | App shell. Node **24** (`.nvmrc`)                                                                                     |
| D3.js v7, Framer Motion                           | Network and charts                                                                                                    |
| `getVerifiedDataset()`                            | Default path; static JSON on Vercel                                                                                   |
| simple-statistics                                 | Descriptive summaries, cosine similarity, k-means labels                                                              |
| PostgreSQL                                        | Optional `LACUNA_DATA_MODE=db` — not required to run the demo                                                         |
| ClickHouse variant catalog                        | Optional and off by default. Not clinical-grade genomics. [GENOMICS_VARIANT_STORE.md](docs/GENOMICS_VARIANT_STORE.md) |

**Checks:** `npm run lint` · `npm run typecheck` · `npm test` ·
`npm run deno:fmt:check` · `npm run deno:lint` · `npm run validate:dataset` ·
`npm run build:ci` (`LACUNA_DATA_MODE=static`).

## Quick start

```bash
git clone https://github.com/maekass/Lacuna.git
cd Lacuna
nvm use 24
npm install
npm run dev
```

Open `http://localhost:3000`. Optional Postgres and the variant store are
documented in [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md).

## Documentation

| Doc                                                                             | Use it for                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [MODEL_CARD.md](docs/MODEL_CARD.md)                                             | What each on-screen score is                         |
| [LIMITATIONS.md](docs/LIMITATIONS.md)                                           | Disclosed-value definition and live totals           |
| [DATA_BOUNDARIES.md](docs/DATA_BOUNDARIES.md)                                   | Verified vs staging vs enrichment                    |
| [COMPETITIVE_ANALYSIS_METHODOLOGY.md](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md) | Observable acquirer facts vs inferred intent         |
| [ML_CLINICAL_TRIALS.md](docs/ML_CLINICAL_TRIALS.md)                             | Why trial-model percentages are withheld             |
| [REIMBURSEMENT_INTELLIGENCE.md](docs/REIMBURSEMENT_INTELLIGENCE.md)             | What must not be published as reimbursement evidence |
| [INFERENCE.md](docs/INFERENCE.md)                                               | Optional server LLM                                  |
| [AGENTS.md](AGENTS.md)                                                          | Contributor conventions                              |

## License and author

[BSL 1.1](LICENSE). Research and education use is allowed. A commercial product
that competes as women’s-health M&A intelligence needs a separate license
([mps5cy@virginia.edu](mailto:mps5cy@virginia.edu)). The license converts to
Apache 2.0 in May 2030.

**[Mae Kass](https://github.com/maekass)** — MS/MPH; PsyD candidate; incoming
MBA (2027). Signatory to the
[G20 & G7 Health and Development Partnership H20 Call to Action](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
(August 2024).
