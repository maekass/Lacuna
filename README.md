# Lacuna

> *Network Intelligence Platform for Women's Health M&A*

Lacuna maps the acquisition landscape across FemTech, digital health, and women's wellness sectors—visualizing strategic relationships, exit patterns, and market dynamics through sophisticated network analysis.

## Project links

| | |
|---|---|
| **Live demo** | [lacuna-maekass.vercel.app](https://lacuna-maekass.vercel.app) |
| **GitHub** | [github.com/maekass/Lacuna](https://github.com/maekass/Lacuna) |
| **License** | [Business Source License 1.1](LICENSE) (BSL 1.1) — becomes [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) four years from publication |
| **Licensing inquiries** | [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) |

## Methodology & documentation

| Document | Description |
|----------|-------------|
| [`docs/DATA_CURATION_CHECKLIST.md`](docs/DATA_CURATION_CHECKLIST.md) | JSON schema, staging workflow, validation commands |
| [`docs/OAIS_METHODOLOGY.md`](docs/OAIS_METHODOLOGY.md) | Health impact (OAIS) framework |
| [`docs/FAIRNESS_AUDIT_METHODOLOGY.md`](docs/FAIRNESS_AUDIT_METHODOLOGY.md) | Fairness audit with explicit limitations |
| [`docs/NETWORK_ANALYSIS_METHODOLOGY.md`](docs/NETWORK_ANALYSIS_METHODOLOGY.md) | Network analysis with language guidelines |
| [`docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md`](docs/COMPETITIVE_ANALYSIS_METHODOLOGY.md) | Competitive landscape methodology |
| [`docs/SEC_INGESTION.md`](docs/SEC_INGESTION.md) | SEC EDGAR ingest pipeline, cron, and env vars |
| [`AGENTS.md`](AGENTS.md) | Stack, conventions, and agent guidance |

## Languages, libraries & tools

| Category | Technologies |
|----------|----------------|
| **Languages** | TypeScript (strict), SQL |
| **Framework & UI** | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| **Visualization** | D3.js v7, Framer Motion |
| **ML & statistics** | TensorFlow.js, simple-statistics, ml-matrix |
| **AI (ingest)** | Vercel AI SDK, OpenAI provider, Zod |
| **Data** | Verified JSON (`dataset.verified.json`); optional PostgreSQL (`pg`, `LACUNA_DATA_MODE=db`) |
| **HTTP & APIs** | Native `fetch`, Next.js Route Handlers, ClinicalTrials.gov API |
| **Testing & quality** | Vitest, ESLint, Deno lint (CI) |
| **Tooling & deploy** | tsx, npm, Vercel |

⚠️ **EDUCATIONAL CODE PROJECT**: Demonstration code for portfolio and learning—not a commercial product. Data is compiled from public sources for educational visualization. Run locally with `npm run dev` or use the [live demo](https://lacuna-maekass.vercel.app).

<p align="center">
  <img src="./public/social-preview.svg" alt="Lacuna - M&A Intelligence for Women's Health" width="100%">
</p>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange?style=flat-square&logo=d3.js)](https://d3js.org)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.0-FF6F00?style=flat-square&logo=tensorflow)](https://tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square)](https://framer.com/motion)
[![License](https://img.shields.io/badge/License-BSL_1.1-purple?style=flat-square)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://lacuna-maekass.vercel.app)

## Core Functionality

### Interactive Network Visualization (`ForceNetwork.tsx`)
- **D3.js force simulation** with physics-based node positioning
- **Dynamic charge forces**: Acquirers repel strongly (-800), targets moderately (-400)
- **Collision detection**: Prevents node overlap based on valuation size
- **Interactive controls**: Drag nodes, zoom canvas, click for details
- **Sector color coding**: 9 distinct colors for health verticals
- **Deal type differentiation**: Solid lines (acquisitions) vs dashed (strategic investments)
- **Responsive sizing**: Node radius = √(valuation) for visual hierarchy

### Deal Flow Analytics (`DealFlowChart.tsx`)
- **Temporal analysis**: Year-over-year transaction counting
- **Animated bar chart**: Framer Motion staggered entrance
- **Gradient visualization**: Pink-to-purple gradient bars
- **Hover tooltips**: Exact deal counts per year

### Valuation Matrix (`ValuationMatrix.tsx`)
- **Cross-dimensional analysis**: Sector × Stage heatmap
- **Dynamic color scaling**: 4-tier intensity based on average valuations
- **Interactive cells**: Hover reveals company counts and deal activity
- **Matrix computation**: Real-time average valuation calculations

### Verified Data Layer (`dataset.verified.json`)
- **Single source of truth**: Curated JSON at `src/data/dataset.verified.json` via `getVerifiedDataset()`
- **Optional Postgres path**: Set `LACUNA_DATA_MODE=db` with migrations in `db/migrations/`
- **Type-safe adapters**: Company, acquirer, and acquisition rows mapped for UI and API routes
- **Provenance dashboard**: `DataCoverageCard` — sector/year breakdowns, disclosure rates, effective-n badges per module
- **No synthetic M&A data**: Staging and SEC scans never auto-merge into the verified file

### Data Curation Kit
- **Checklist**: `docs/DATA_CURATION_CHECKLIST.md` — JSON schema, dual-attestation rules, pre-merge steps
- **Staging template**: `staging/deals_candidates.template.csv` → human review → manual JSON edit
- **Validation CLI**: `npm run validate:dataset` — FK checks, dual-source warnings, disclosure stats
- **SEC candidate scan**: `npm run sec:scan` — 8-K discovery → `staging/sec_candidates.csv` only (requires `SEC_EDGAR_USER_AGENT`)

### AI/ML Intelligence Layer

#### Exit Predictor (`ExitPredictor.tsx`)
- **TensorFlow.js integration**: Client-side ML model inference
- **Feature engineering**: Stage, valuation, sector heat, company age
- **Probability scoring**: 0-95% exit likelihood with confidence intervals
- **Acquirer prediction**: Sector-based strategic buyer matching
- **Factor analysis**: Explainable ML with key decision drivers

#### Company Similarity Engine (`CompanySimilarity.tsx`)
- **Vector embeddings**: 8-dimensional feature vectors per company
- **Cosine similarity**: Mathematical company comparison metric
- **ml-matrix integration**: Fast matrix operations for similarity computation
- **Shared factor detection**: Automatically identifies common attributes
- **Recommendation system**: "Companies like this" discovery

#### K-Means Clustering (`ClusteringAnalysis.tsx`)
- **Unsupervised ML**: Lloyd's algorithm (k=3 clusters)
- **simple-statistics**: Statistical computations (mean, standard deviation)
- **Valuation × Employees**: 2D clustering space
- **Market segmentation**: Emerging / Growth / Late-stage classification
- **Automatic categorization**: Dynamic cluster assignment

### Clinical ML Intelligence (Ported from windsurf-project)

#### Ensemble Predictor (`ensemblePredictor.ts`)
- **TensorFlow.js neural network**: 78% accuracy pattern (simulated)
- **Multi-model ensemble**: Neural network + logistic regression
- **Trial success prediction**: Phase transition probability with 95% confidence intervals
- **Feature importance**: Phase, sponsor, enrollment, mechanism analysis
- **Health equity scoring**: Dual-metric ROI + equity impact for Black women's health

#### Data Certification System (`dataCertification.ts`)
- **5-layer validation**: Schema, Completeness, Consistency, Provenance, Quality
- **SHA256 cryptographic hashing**: Tamper-evident data verification
- **Quality scoring**: 0-100 scale with letter grades (A+, A, B+, etc.)
- **Source tracking**: Per-record provenance with verified citations
- **Daily certification**: Automated quality assurance

### Health Equity Dashboard (`HealthEquityDashboard.tsx`)

**Mission:** Investing in Black women's health isn't just the right thing to do—it's a massive market opportunity.

#### Priority Diseases (Disproportionately Affecting Black Women)

| Disease | Disparity | Market Size | Investment Thesis |
|---------|-----------|-------------|-------------------|
| **Maternal Health** | 3.4x higher mortality | $12B | Digital health, remote monitoring, culturally competent care |
| **Uterine Fibroids** | 80% prevalence by age 50 | $34B | Non-surgical treatments, early detection, fertility preservation |
| **Lupus** | 3x higher prevalence | $8B | AI diagnostics, biomarker discovery, precision medicine |
| **Sickle Cell Disease** | Primarily affects Black populations | $5B | Gene therapy, CRISPR, curative treatments |
| **Cardiovascular Disease** | 1.4x higher mortality | $15B | Wearables, early detection, culturally tailored interventions |

**Combined market opportunity: $74B**

#### Development Roadmap
- **Phase 7** (Implemented): Health Equity Dashboard with dual-metric scoring
- **Phase 8** (Planned): Trial Diversity Tracker with geographic mapping
- **Phase 9** (Planned): Impact Investment Scorecard (ROI + equity combined)
- **Phase 10** (Planned): Underserved Disease Analyzer
- **Phase 11** (Planned): Community Impact Predictor (lives saved per $1M invested)

### Clinical Trials Integration (`/api/clinical-trials`)
- **ClinicalTrials.gov API v2**: Real-time trial search and filtering
- **Search parameters**: Condition, phase, status, enrollment
- **Trial data**: NCT ID, title, sponsor, locations, interventions
- **Fallback data**: Curated trials for development/testing
- **Batch lookup**: Multi-trial query endpoint

### Wearables Ecosystem Tracker (`WearablesTracker.tsx`)
- **Women's health wearables**: Oura, Whoop, Apple Watch, Natural Cycles
- **Feature analysis**: Menstrual tracking, fertility prediction, holistic health
- **Investment thesis**: Market gaps, innovation opportunities
- **Integration patterns**: How wearables connect to broader health ecosystem

## Academic-Rigor Analytical Frameworks

Lacuna implements **6 academically rigorous frameworks** with explicit acknowledgment of small-sample limitations (n≈23 companies, n=6 deals). Every framework follows the principle: *be honest about what you can and cannot reliably claim*.

### 1. Causal Inference Engine
**Files:** `CausalDAG.tsx`, `CausalInferenceEngine.tsx`, `TemporalValidation.tsx`, `SensitivityAnalysis.tsx`, `BayesianCausalAnalysis.tsx`

- **Pearl Backdoor Criterion**: DAG with measured + unmeasured confounders
- **Main effects with 95% CIs**: NOT point estimates alone
- **Specification robustness**: 3 model specs compared
- **Oster's δ**: Sensitivity to unobserved confounding
- **Rotnitzky bounds**: Bounds under maximum confounding
- **Event study methodology**: Pre/post temporal validation
- **Bayesian small-sample**: Pre-registered hypotheses with credible intervals

**Reference**: Pearl (2009), Oster (2019), Rubin (1974)

### 2. Health Impact Assessment (OAIS Framework)
**Files:** `oaisCalculator.ts`, `ImpactOpportunityCard.tsx`, `ValidationTracker.tsx`, `ConfidenceLevelIndicator.tsx`

**Opportunity-Adjusted Impact Score (OAIS):**
```
OAIS = [Addressable Pop] × [Penetration Gap] × [Stage Credibility]
       × [Founder Quality] × [Acquirer Scaling] / [Market Saturation]
```

**3-Tier Data Framework:**
- **Tier 1 (Measured)**: CDC/NICHD epidemiology with 95% CIs
- **Tier 2 (Proxy)**: Stage, founder LinkedIn, acquirer track record
- **Tier 3 (Cannot Measure)**: Patient volume, clinical efficacy, outcomes

**Why NOT DALYs?**: Requires patient volume + efficacy data we don't have. OAIS measures opportunity magnitude only.

### 3. Fairness Audit (Modular V2)
**Files:** `FairnessAuditV2.tsx`, `GenderInferenceQuality.tsx`, `FounderCharacteristics.tsx`, `FairnessLimitations.tsx`, `statisticalMethods.ts`

**Rigorous statistical methods:**
- **Wilson confidence intervals** (better than normal approximation for small n)
- **Fisher's exact test** (preferred over chi-square for n<30)
- **Newcombe's method** for proportion differences
- **Bonferroni correction** for multiple testing
- **Benjamini-Hochberg FDR** for less conservative alternative
- **Cohen's h** for proper effect size
- **Logistic regression** with Newton-Raphson + Wald tests

**Single fairness metric (Demographic Parity)** chosen per Kleinberg et al. (2016) — three fairness metrics mathematically incompatible.

**Reference**: Kleinberg, Mullainathan, Raghavan (2016), Hardt et al. (2016)

### 4. Network Analysis (Honest Small-N)
**Files:** `NetworkAnalysisHonest.tsx`, `StrategicPositioningMap.tsx`, `networkStatistics.ts`

**8 analytical tabs:**

| Tab | Method |
|-----|--------|
| **Descriptives + CIs** | Bootstrap CIs, median + IQR (not mean ± SD) |
| **Buyer Concentration** | Gini coefficient, Herfindahl-Hirschman Index (DOJ-aligned) |
| **Temporal Analysis** | Yearly trends with R² + confidence tiers |
| **Community Detection** | Simplified Louvain with stability assessment (10 random perturbations) |
| **Strategic Positioning** | 2D map: Sector breadth × Deal velocity (qualitative quadrants) |
| **Stability Analysis** | 100 bootstrap simulations, finding reliability rankings |
| **Null Model Comparison** | 1000 random simulations for baseline comparison |
| **What We Cannot Claim** | Explicit limitations (no power laws, no preferential attachment) |

**Why NOT power laws?**: Requires n>100 (Clauset et al., 2009). With n=15, use Gini/HHI instead.

**Reference**: Newman (2003, 2010), Clauset et al. (2009), Blondel et al. (2008)

See **[Methodology & documentation](#methodology--documentation)** at the top of this README for full doc links.

### Common Principles

All frameworks follow these academic standards:

✅ **DO:**
- Report confidence intervals (not point estimates alone)
- Use bootstrap for small samples (no distributional assumptions)
- Apply multiple testing corrections
- Acknowledge selection bias explicitly
- Use language: "exploratory", "preliminary", "with n=6 deals we cannot..."
- Document all data sources

❌ **DO NOT:**
- Claim causal effects without addressing endogeneity
- Estimate heterogeneous treatment effects with n<50
- Fit power laws with n<100
- Use chi-square for small samples (use Fisher's exact)
- Treat proxies as measurements
- Make policy recommendations from exploratory analysis

## Key Features

- **Interactive Deal Network**: Drag, zoom, and explore acquisition relationships
- **Sector Color Coding**: Visual differentiation across 9 women's health verticals
- **Real-time Filtering**: Dynamic data slicing by stage, sector, deal type
- **Predictive Scoring**: ML-ready data structure for exit probability modeling
- **Responsive Design**: Optimized for institutional investor workflows

## Data Coverage

Curated verified sample (see **Data coverage & provenance** card in the app for live stats):

- **23 verified companies** across fertility, mental health, general wellness, wearables, pelvic health
  - Includes Johns Hopkins FemTech startups: NovvaCup, Ovubrush
- **6 tracked acquisitions** with strategic rationale and source citations
- **3 disclosed deal prices** (50% disclosure rate; undisclosed deals carry `dealValueNote`)
- **13 companies** with last-known valuation and documented `valuationSource`
- **Every data point sourced**: Company websites, SEC filings, TechCrunch, Crunchbase, press releases

### Johns Hopkins FemTech Innovation
**Verified academic startups from JHTV (Johns Hopkins Technology Ventures):**

| Company | Founders | Focus | Achievement |
|---------|----------|-------|-------------|
| **NovvaCup** | Danielle Nicklas (PhD), Alexis Lowe, Clarissa Ren (MD) | Multiphasic menstrual cup | $10K Pitch It On! winner (2022), FastForward U Fuel Accelerator |
| **Ovubrush** | Janis Iourovitski (CBID) | Saliva-based ovulation tracker | Johns Hopkins Center for Bioengineering Innovation and Design |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Validate verified dataset (FK checks, disclosure stats)
npm run validate:dataset

# Run tests
npm test

# Build for production
npm run build

# Deploy to Vercel (or push to main for auto-deploy)
vercel --prod
```

### Optional: SEC staging scan

Requires a SEC-compliant User-Agent string ([fair access policy](https://www.sec.gov/os/webmaster-faq#code-support)):

```bash
SEC_EDGAR_USER_AGENT="Lacuna Research you@example.com" npm run sec:scan
```

Output: `staging/sec_candidates.csv` — review manually; **do not** auto-merge into `dataset.verified.json`.

## Design System

### 2026 Typography: Avant-Garde Summer Trends

Following **Vogue 2026 summer typography trends** — extreme contrast, experimental tracking, compressed forms:

| Element | Font | Weight | Tracking | Style |
|---------|------|--------|----------|-------|
| **Logo** | Compressed Display (Impact/Arial Narrow) | 700 | -3px | Condensed, bold |
| **Title** | High-Contrast Serif (Bodoni/Didot) | 300 | -2px | All caps, elegant |
| **Tagline** | Condensed Sans (Arial Narrow) | 500 | +6px | All caps, wide |
| **Subtitle** | Technical Mono (Courier New) | 400 | +1.5px | All caps, precise |
| **Footer** | Compressed Sans | 500 | +4px | All caps, minimal |

**Philosophy:** *Legibility secondary to expression* — 2026 design embraces typography as visual art. Tight tracking on display type creates tension; extreme letter-spacing on condensed forms creates runway-inspired sophistication.

### 2026 Pantone Spring/Summer Color Palette

The visual identity uses the **Pantone Spring/Summer 2026** color trend forecast:

| Color | Pantone Name | Hex | Usage |
|-------|--------------|-----|-------|
| ![#E8B4B8](https://via.placeholder.com/15/E8B4B8/E8B4B8.png) | **Transcendent Pink** | `#E8B4B8` | Gradient start — ethereal, soft |
| ![#B8A9C9](https://via.placeholder.com/15/B8A9C9/B8A9C9.png) | Soft Lavender | `#B8A9C9` | Bridge transition |
| ![#4A5D8A](https://via.placeholder.com/15/4A5D8A/4A5D8A.png) | **Cosmic Blue** | `#4A5D8A` | Gradient middle — celestial depth |
| ![#5D4E6D](https://via.placeholder.com/15/5D4E6D/5D4E6D.png) | **Deep Plum** | `#5D4E6D` | Gradient end — rich, elegant |

**Philosophy:** Ethereal opening (Transcendent Pink) flowing through cosmic depth (Cosmic Blue) to grounded sophistication (Deep Plum) — reflecting the journey from early-stage innovation to mature market leadership.

## Data Provenance

All data in this repository is compiled from **publicly available sources only**:

### Sources
- **SEC EDGAR filings** — Verified M&A transactions (e.g., Teladoc/Livongo $13.9B merger)
- **Crunchbase** — Funding rounds and total raised (where publicly reported)
- **Company press releases** — Strategic investments and partnerships
- **Verified press coverage** — TechCrunch, Fierce Healthcare, Bloomberg (cross-referenced)
- **Company websites** — Descriptions, founding dates, headquarters

### What We Include
- ✅ Publicly disclosed acquisition values (SEC filings, press releases)
- ✅ Last known funding round valuations (from Crunchbase/press)
- ✅ Total funding raised (publicly reported)
- ✅ Company founding dates and locations (public record)
- ✅ Strategic partnerships (press-reported, financial terms often undisclosed)

### What We Omit
- ❌ Employee counts — Not reliably verifiable across private companies
- ❌ Estimated/reconstructed valuations — Only publicly disclosed figures
- ❌ Projected/revenue multiples — Unless officially reported
- ❌ Synthetic transactions — All M&A data is verified real deals

### Important Notes
- Private company valuations reflect **last disclosed funding rounds** and may not represent current market value
- Some acquisition values are **press estimates** where official terms weren't disclosed (clearly marked)
- **Strategic investments** often have undisclosed financial terms (marked as such)
- Public company valuations (e.g., Talkspace) fluctuate with market prices

**Purpose**: Educational visualization of M&A trends in women's health. Not for commercial investment decisions. Verify independently.

## License

Business Source License 1.1 © 2026 Lacuna Project Authors — see [Project links](#project-links) above for terms summary and [LICENSE](LICENSE) for full text. Licensing inquiries: [mps5cy@virginia.edu](mailto:mps5cy@virginia.edu).
