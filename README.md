# Lacuna

> *Network Intelligence Platform for Women's Health M&A*

⚠️ **EDUCATIONAL CODE PROJECT**: This repository contains demonstration code for portfolio and learning purposes. It is not a deployed live application or commercial product. Run locally with `npm run dev` to view the interactive dashboard. Data is compiled from public sources for educational visualization.

<p align="center">
  <img src="./public/social-preview.svg" alt="Lacuna - M&A Intelligence for Women's Health" width="100%">
</p>

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange?style=flat-square&logo=d3.js)](https://d3js.org)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.0-FF6F00?style=flat-square&logo=tensorflow)](https://tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square)](https://framer.com/motion)
[![License](https://img.shields.io/badge/License-BSL_1.1-purple?style=flat-square)](LICENSE)

**Tools & Stack:** Next.js 14 · TypeScript · D3.js (force simulation, hierarchy, scales) · TensorFlow.js · simple-statistics · ml-matrix · Framer Motion · Tailwind CSS · visx patterns

Lacuna maps the acquisition landscape across FemTech, digital health, and women's wellness sectors—visualizing strategic relationships, exit patterns, and market dynamics through sophisticated network analysis.

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

### Data Layer (`maDeals.ts`)
- **Type-safe interfaces**: Company, Acquisition with strict typing
- **Derived statistics**: Network nodes/links generation, sector distribution, deal value totals
- **Sample dataset**: 20 companies, 15 acquirers, 10 tracked deals, $2B+ disclosed value

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

## Technology Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Visualizations**: D3.js (force simulation, scales, shapes) + visx patterns
- **Machine Learning**: TensorFlow.js · simple-statistics · ml-matrix
- **Animation**: Framer Motion for orchestrated UI transitions
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data Layer**: Static TypeScript interfaces with derived statistical computations

## Key Features

- **Interactive Deal Network**: Drag, zoom, and explore acquisition relationships
- **Sector Color Coding**: Visual differentiation across 9 women's health verticals
- **Real-time Filtering**: Dynamic data slicing by stage, sector, deal type
- **Predictive Scoring**: ML-ready data structure for exit probability modeling
- **Responsive Design**: Optimized for institutional investor workflows

## Data Coverage

- **22 verified companies** across fertility, mental health, wearables, pelvic health
  - Includes Johns Hopkins FemTech startups: NovvaCup, Ovubrush
- **15 strategic acquirers** (Fortune 500 health, tech giants, specialized buyers)
- **10 tracked transactions** with deal values and strategic rationale
- **$2B+ in disclosed transaction value**
- **Every data point sourced**: Company websites, SEC filings, TechCrunch, Crunchbase, FDA.gov, press releases

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

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

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

Business Source License 1.1 © 2026 Lacuna Project Authors

The Licensed Work becomes available under Apache 2.0 four years from publication date. Commercial licensing available upon request.
