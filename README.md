# Lacuna

> *Network Intelligence Platform for Women's Health M&A*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange?style=flat-square&logo=d3.js)](https://d3js.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square)](https://framer.com/motion)
[![License](https://img.shields.io/badge/License-BSL_1.1-purple?style=flat-square)](LICENSE)

**Tools & Stack:** Next.js 14 · TypeScript · D3.js (force simulation, hierarchy, scales) · Framer Motion · Tailwind CSS · visx patterns

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

## Technology Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Visualizations**: D3.js (force simulation, scales, shapes) + visx patterns
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

- 20+ emerging companies across fertility, mental health, wearables, pelvic health
- 15 strategic acquirers (Fortune 500 health, tech giants, specialized buyers)
- 10 tracked transactions with deal values and strategic rationale
- $2B+ in disclosed transaction value

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

## License

Business Source License 1.1 © 2024 Lacuna Project Authors

The Licensed Work becomes available under Apache 2.0 four years from publication date. Commercial licensing available upon request.
