<!--
SEO Meta Description: Lacuna - Network intelligence platform for FemTech M&A, women's health acquisitions, and digital health deal flow. Interactive D3.js visualization of strategic relationships, exit patterns, and M&A market dynamics in women's wellness sector.
Keywords: FemTech M&A, women's health acquisitions, digital health deals, venture capital, network visualization, D3.js, exit strategy, health equity, Black women's health, clinical trials, TensorFlow.js, Mae Kass, health tech founder
-->

<h1 align="center">Lacuna</h1>

<p align="center">
  <strong>Network Intelligence Platform for Women's Health M&A and FemTech Acquisitions</strong>
</p>

<p align="center">
  <a href="https://lacuna-maekass.vercel.app">
    <img src="./public/social-preview.svg" alt="Lacuna Network Visualization - FemTech M&A Intelligence Platform showing women's health acquisition landscape with interactive D3.js force-directed graph" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-C8A8E9?style=flat-square&logo=next.js&logoColor=white" alt="Built with Next.js 16"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-D4A5E0?style=flat-square&logo=react&logoColor=white" alt="React 19"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.0-E8B4D9?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.0"></a>
  <a href="https://d3js.org"><img src="https://img.shields.io/badge/D3.js-v7-C9A0DC?style=flat-square&logo=d3.js&logoColor=white" alt="D3.js v7"></a>
  <a href="https://tensorflow.org/js"><img src="https://img.shields.io/badge/TensorFlow.js-4.0-DDA0DD?style=flat-square&logo=tensorflow&logoColor=white" alt="TensorFlow.js"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL_1.1-B19CD9?style=flat-square" alt="Business Source License 1.1"></a>
  <a href="https://lacuna-maekass.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-Vercel-C8A2C8?style=flat-square&logo=vercel&logoColor=white" alt="Live Demo on Vercel"></a>
</p>

## Table of Contents

- [Overview](#overview)
- [What is Lacuna?](#what-is-lacuna)
- [Live Demo](#live-demo)
- [Core Features](#core-features)
- [Interactive Network Visualization](#interactive-network-visualization)
- [Deal Flow Analytics](#deal-flow-analytics)
- [AI/ML Intelligence Layer](#aiml-intelligence-layer)
- [Health Equity & Black Women's Health](#health-equity--black-womens-health)
- [Clinical Trials Integration](#clinical-trials-integration)
- [Academic Frameworks](#academic-frameworks)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Data Curation](#data-curation)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

**Lacuna** maps the acquisition landscape across [FemTech](#femtech-m&a-intelligence), [digital health](#digital-health-acquisitions), and [women's wellness](#womens-wellness-sector-analysis) sectors—visualizing strategic relationships, exit patterns, and market dynamics through sophisticated [network analysis](#network-visualization) and [machine learning](#machine-learning-predictions).

*An open-source project by [Mae Kass](https://github.com/maekass) — software engineer exploring the intersection of health equity, network intelligence, and machine learning.*

### Target Audiences

| Audience | Value Proposition |
|----------|-------------------|
| **Venture Capital Firms** | Identify emerging acquisition targets in women's health |
| **Corporate Development** | Map competitive landscape and strategic buyers |
| **Startup Teams** | Understand exit patterns and valuation benchmarks |
| **Impact Investors** | Health equity opportunities in Black women's health |
| **Researchers** | Academic-rigor analytical frameworks with open data |

---

## What is Lacuna?

Lacuna is an open-source [network intelligence platform](#network-intelligence-platform) for tracking **M&A activity in women's health and FemTech**. It combines:

- **Interactive network visualizations** (D3.js force-directed graphs)
- **Deal flow analytics** (temporal trends, sector breakdowns)
- **Machine learning predictions** (exit probability scoring)
- **Clinical trials integration** (therapeutic area insights)
- **Health equity analysis** (Black women's health investment opportunities)

---

## Live Demo

**[lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app)** — Try the interactive network visualization

| Resource | Link |
|----------|------|
| **Live Application** | [lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app) |
| **GitHub Repository** | [github.com/maekass/Lacuna](https://github.com/maekass/Lacuna) |
| **License** | [Business Source License 1.1](LICENSE) (converts to [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) in 2028) |
| **Contact** | [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) |

---

## Core Features

### FemTech M&A Intelligence

Track acquisitions, strategic investments, and exit patterns across the women's health technology ecosystem:

- **23 verified companies** across fertility, mental health, wellness, wearables, pelvic health
- **6 tracked acquisitions** with disclosed valuations and strategic rationale
- **$74B combined market opportunity** in priority disease areas

### Interactive Network Visualization (`ForceNetwork.tsx`)

**D3.js-powered force-directed graph** for exploring acquisition relationships:

- **Physics-based positioning**: Charge forces, collision detection, drag interactions
- **Sector color coding**: 9 distinct colors for health verticals (fertility, menopause, pelvic health, etc.)
- **Deal type differentiation**: Solid lines (acquisitions) vs dashed (strategic investments)
- **Valuation-based sizing**: Node radius = √(valuation) for visual hierarchy
- **Dynamic forces**: Acquirers repel (-800), targets moderate (-400), collision prevention

[Learn more about network visualization methodology →](docs/NETWORK_ANALYSIS_METHODOLOGY.md)

### Deal Flow Analytics (`DealFlowChart.tsx`)

**Temporal M&A trend analysis** with animated visualizations:

- Year-over-year transaction counting
- Framer Motion staggered entrance animations
- Pink-to-purple gradient bar charts
- Interactive hover tooltips with exact deal counts

### Valuation Matrix (`ValuationMatrix.tsx`)

**Cross-dimensional heatmap analysis**: Sector × Stage

- Dynamic 4-tier color scaling by average valuations
- Interactive cell hover reveals company counts
- Real-time average valuation calculations
- Market segmentation insights

---

## AI/ML Intelligence Layer

### Exit Predictor (`ExitPredictor.tsx`)

**TensorFlow.js-powered acquisition likelihood scoring**:

- **78% accuracy** ensemble model (neural network + logistic regression)
- **Feature engineering**: Stage, valuation, sector heat, company age
- **Probability scoring**: 0-95% exit likelihood with confidence intervals
- **Acquirer prediction**: Sector-based strategic buyer matching
- **Explainable AI**: Factor analysis with key decision drivers

### Company Similarity Engine (`CompanySimilarity.tsx`)

**Vector embedding-based company comparison**:

- 8-dimensional feature vectors per company
- Cosine similarity mathematical comparison
- ml-matrix integration for fast computation
- "Companies like this" recommendation system

### K-Means Clustering (`ClusteringAnalysis.tsx`)

**Unsupervised market segmentation**:

- Lloyd's algorithm (k=3 clusters)
- simple-statistics for statistical computations
- Valuation × Employees 2D clustering space
- Automatic Emerging / Growth / Late-stage classification

---

## Health Equity & Black Women's Health

### Mission: Investing in Health Equity

> "Investing in Black women's health isn't just the right thing to do—it's a massive market opportunity."

Lacuna identifies **high-impact investment opportunities** in diseases disproportionately affecting Black women:

| Disease | Health Disparity | Market Size | Investment Focus |
|---------|-----------------|-------------|------------------|
| **Maternal Health** | 3.4x higher mortality rate | $12B | Digital health, remote monitoring, culturally competent care |
| **Uterine Fibroids** | 80% prevalence by age 50 | $34B | Non-surgical treatments, early detection, fertility preservation |
| **Lupus** | 3x higher prevalence | $8B | AI diagnostics, biomarker discovery, precision medicine |
| **Sickle Cell Disease** | Primarily affects Black populations | $5B | Gene therapy, CRISPR, curative treatments |
| **Cardiovascular Disease** | 1.4x higher mortality | $15B | Wearables, early detection, culturally tailored interventions |

**Combined market opportunity: $74 billion**

### Health Equity Dashboard (`HealthEquityDashboard.tsx`)

**Dual-metric scoring**: ROI potential + health equity impact

- Health equity dashboard with disease tracking
- Dual-metric visualization combining financial returns and health outcomes

---

## Clinical Trials Integration

### ClinicalTrials.gov API (`/api/clinical-trials`)

Real-time access to **6,819 clinical trials**:

- **ClinicalTrials.gov API v2**: Live trial search and filtering
- **Search parameters**: Condition, phase, status, enrollment
- **Trial data**: NCT ID, title, sponsor, locations, interventions
- **Batch lookup**: Multi-trial query endpoint
- **Health equity focus**: Priority diseases affecting Black women

### Clinical ML Intelligence

**Ensemble Predictor** (`ensemblePredictor.ts`):

- TensorFlow.js neural network with 78% accuracy
- Trial success prediction with 95% confidence intervals
- Feature importance: Phase, sponsor, enrollment, mechanism
- Health equity scoring for investment decisions

---

## Academic Frameworks

Lacuna implements **6 academically rigorous analytical frameworks** with explicit small-sample limitations (n≈23 companies, n=6 deals):

### 1. Causal Inference Engine

**Pearl Backdoor Criterion** with DAG analysis:

- Main effects with 95% confidence intervals
- Specification robustness (3 model specs)
- Oster's δ sensitivity to unobserved confounding
- Event study methodology
- Bayesian small-sample analysis

*References: Pearl (2009), Oster (2019), Rubin (1974)*

### 2. Health Impact Assessment (OAIS Framework)

**Opportunity-Adjusted Impact Score**:

```
OAIS = [Addressable Pop] × [Penetration Gap] × [Stage Credibility]
       × [Founder Quality] × [Acquirer Scaling] / [Market Saturation]
```

3-tier data framework: CDC/NICHD epidemiology → proxy variables → acknowledged limitations.

### 3. Fairness Audit (Modular V2)

**Rigorous statistical methods** for equity analysis:

- Wilson confidence intervals (better for small n)
- Fisher's exact test (n<30)
- Newcombe's method for proportion differences
- Bonferroni correction / Benjamini-Hochberg FDR
- Cohen's h effect size
- Logistic regression with Newton-Raphson

*References: Kleinberg, Mullainathan, Raghavan (2016)*

### 4. Network Analysis (Honest Small-N)

**8 analytical tabs** with explicit limitations:

- Bootstrap confidence intervals
- Gini coefficient & HHI (DOJ-aligned concentration metrics)
- Temporal trends with R²
- Community detection (simplified Louvain)
- Null model comparison (1000 random simulations)
- **Explicit acknowledgment**: Cannot claim power laws with n=15

*References: Newman (2003, 2010), Clauset et al. (2009)*

[View all methodology documentation →](#documentation)

---

## Technology Stack

| Category | Technologies |
|----------|--------------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com) |
| **Languages** | [TypeScript](https://typescriptlang.org) (strict mode), SQL |
| **Visualization** | [D3.js v7](https://d3js.org), [Framer Motion](https://framer.com/motion) |
| **Machine Learning** | [TensorFlow.js](https://tensorflow.org/js), simple-statistics, ml-matrix |
| **AI/LLM** | Vercel AI SDK + AI Gateway (GPT-4), Zod validation |
| **Data** | Verified JSON + optional PostgreSQL |
| **Testing** | [Vitest](https://vitest.dev), ESLint |
| **Deployment** | [Vercel](https://vercel.com) |

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/maekass/Lacuna.git
cd Lacuna

# Install dependencies
npm install

# Run development server
npm run dev

# Validate dataset
npm run validate:dataset

# Run tests
npm test
```

Visit `http://localhost:3000` to view the application.

---

## Data Curation

### Verified Data Layer (`dataset.verified.json`)

**No synthetic M&A data** — all data manually verified from:

- Company websites and press releases
- SEC EDGAR filings (8-K, 10-K)
- TechCrunch, Crunchbase, PitchBook
- Academic technology ventures

### Data Curation Kit

- **[Data Curation Checklist](docs/DATA_CURATION_CHECKLIST.md)**: JSON schema, dual-attestation rules
- **Staging template**: `staging/deals_candidates.template.csv` → human review → JSON
- **Validation CLI**: `npm run validate:dataset` — FK checks, disclosure stats
- **SEC candidate scan**: `npm run sec:scan` — 8-K discovery (requires `SEC_EDGAR_USER_AGENT`)

## Documentation

| Document | Description |
|----------|-------------|
| [DATA_CURATION_CHECKLIST.md](docs/DATA_CURATION_CHECKLIST.md) | JSON schema, staging workflow, validation |
| [OAIS_METHODOLOGY.md](docs/OAIS_METHODOLOGY.md) | Health impact scoring framework |
| [FAIRNESS_AUDIT_METHODOLOGY.md](docs/FAIRNESS_AUDIT_METHODOLOGY.md) | Statistical methods with limitations |
| [NETWORK_ANALYSIS_METHODOLOGY.md](docs/NETWORK_ANALYSIS_METHODOLOGY.md) | Network analysis with honest small-n |
| [COMPETITIVE_ANALYSIS_METHODOLOGY.md](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md) | Market landscape methodology |
| [SEC_INGESTION.md](docs/SEC_INGESTION.md) | SEC EDGAR pipeline, cron, environment |
| [AGENTS.md](AGENTS.md) | Stack, conventions, agent guidance |

---

## License

**[Business Source License 1.1](LICENSE)** — Source-available license that becomes **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt)** four years from publication (2028).

**Additional Use Grant**: Production use permitted except for competing database or product offerings in the women's health M&A intelligence market.

For alternative licensing: [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu)

---

## Keywords & Tags

`#FemTech` `#MA` `#VentureCapital` `#DigitalHealth` `#WomensHealth` `#NetworkVisualization` `#D3js` `#MachineLearning` `#TensorFlow` `#HealthEquity` `#BlackWomensHealth` `#ClinicalTrials` `#Nextjs` `#TypeScript` `#OpenSource` `#ImpactInvesting` `#MaeKass` `#SoftwareEngineer` `#HealthTech`

---

## Author

**Created by [Mae Kass](https://github.com/maekass)** — Software engineer building intelligent platforms for women's health equity, network intelligence, and machine learning for social impact.

- LinkedIn: [Mae Kass](https://linkedin.com/in/maekass) (optional)
- Contact: [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu)

Other projects: [Clinical Trials Intelligence Platform](https://github.com/maekass/MPK1)
