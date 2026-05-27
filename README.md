# Lacuna

> *Network Intelligence Platform for Women's Health M&A*

Lacuna maps the acquisition landscape across FemTech, digital health, and women's wellness sectors—visualizing strategic relationships, exit patterns, and market dynamics through sophisticated network analysis.

## Architecture

- **Force-Directed Network Graph**: D3.js-powered interactive visualization of acquirer-target relationships with physics-based clustering by sector and deal velocity
- **Temporal Deal Flow Analysis**: Animated Sankey-style flow showing capital movement across time periods
- **Multi-Dimensional Valuation Matrix**: Cross-filterable heatmap analyzing valuation multiples by sector × stage × acquirer type
- **Network Embeddings**: Company similarity scoring using deal history and sector proximity

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
