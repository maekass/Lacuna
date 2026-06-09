# Site architecture — Vercel app vs Framer marketing

Lacuna uses **two surfaces**. Do not merge them into one Framer site or
duplicate analytics in a no-code builder.

> **Naming:** This repo uses **Framer Motion** (React animation). **Framer**
> below means [framer.com](https://www.framer.com) — the separate marketing
> site.

## Split

| Surface       | Host                          | Purpose                                                                                  |
| ------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Product**   | **Vercel** (this repo)        | Live demo: D3 graphs, dashboards, API routes, curated dataset, methodology panels in-app |
| **Marketing** | **Framer** (separate project) | Brand, narrative hero, methodology _story_, hiring / portfolio context                   |

**Live product URL (canonical CTA target):** https://lacuna-maekass.vercel.app

## Framer — in scope

- Visual identity and copy-led storytelling
- Hero and positioning (educational demo, curated data, honest limits)
- Methodology narrative (link to `docs/` or in-app anchors — not reimplemented
  charts)
- Hiring, about, portfolio / contact
- **One primary CTA** into the Vercel app (e.g. “Open the demo” / “Explore the
  data”)

Secondary links (GitHub, docs, email) are fine; avoid competing primary CTAs.

## Framer — out of scope

- Hosting or embedding the analytics product (no iframes of dashboards, no
  recreated D3/network views)
- Duplicate deal data, scores, or “live” M&A claims
- API routes, cron, dataset validation, or anything that belongs in this Next.js
  repo

## Vercel app — in scope

Everything under `src/` today: verified JSON, visualizations, descriptive
analytics, optional LLM narratives, clinical-trials panel, provenance banners.

The in-app `HomePage` hero is the **product** entry, not a replacement for the
Framer marketing site.

## Domains (optional, later)

A common pattern when a custom domain exists:

- Root or `www` → Framer (marketing)
- `app.` or `/demo` redirect → Vercel deployment

Configure DNS and redirects in Framer/Vercel when ready; no code change required
in this repo until then.

## Framer build kit (in this repo)

Marketing content and a paste-ready HTML prototype live under **`framer/`** —
see [framer/BUILD_GUIDE.md](../framer/BUILD_GUIDE.md). That folder does **not**
replace publishing on Framer.com; it speeds up copy, tokens, and section import.

## For contributors and agents

- **Build product features** in `src/` (Vercel / Next.js only).
- **Build marketing** using `framer/` + Framer editor — not new analytics routes
  for a public marketing site.
- **Do not** add Framer embeds of the Vercel app, Framer-hosted data viz, or
  full marketing clones under `src/app/`.
- When editing copy, keep product claims aligned with
  [MODEL_CARD.md](./MODEL_CARD.md) and the provenance line in
  `src/lib/constants/provenance.ts`.
