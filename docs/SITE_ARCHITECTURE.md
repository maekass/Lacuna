# Site architecture — Vercel app vs Framer marketing

Lacuna uses **two surfaces**. Do not merge them into one Framer site or
duplicate analytics in a no-code builder. Webflow was evaluated and rejected —
see [MARKETING_SURFACE_DECISION.md](./MARKETING_SURFACE_DECISION.md).

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

The in-app **hub** (`/`) is the **product** entry, not a replacement for the
Framer marketing site.

## Product routes (Vercel app)

| Route           | Workspace    | Purpose                                           |
| --------------- | ------------ | ------------------------------------------------- |
| `/`             | Hub          | Hero, provenance, headline stats, workspace cards |
| `/deals`        | Deals        | Network, deal flow, matrix, acquirer landscape    |
| `/research`     | Research     | Trials, evidence, genomics, health equity         |
| `/methods`      | Methods      | Causal framing, temporal, sensitivity, Bayesian   |
| `/intelligence` | Intelligence | Reimbursement, acquirer fit, Gamma export         |

Legacy monolith hash bookmarks (`/#network`, etc.) redirect to the matching
workspace route via `LegacyHashRedirect`.

Shared chrome: `AppShell` (workspace nav, global provenance bar, section TOC,
skip link, footer). Section modules live under `src/app/sections/`.

## Domains (optional, later)

A common pattern when a custom domain exists:

- Root or `www` → Framer (marketing)
- `app.` or `/demo` redirect → Vercel deployment

Configure DNS and redirects in Framer/Vercel when ready; no code change required
in this repo until then.

## Framer build kit

**There is no `framer/` directory in this repo.** Earlier revisions of this
file, `README.md`, and `AGENTS.md` linked to a `framer/BUILD_GUIDE.md` build kit
that was never committed; those links were dead and have been removed.

Marketing copy, tokens, and sections live in the Framer project itself. If a
build kit is wanted in-repo later, add it under `framer/` and re-link it from
this section — do not re-add the links before the files exist.

## For contributors and agents

- **Build product features** in `src/` (Vercel / Next.js only).
- **Build marketing** in the Framer editor — not new analytics routes for a
  public marketing site.
- **Do not** move briefs, catalysts, or any dataset-derived content into a
  no-code CMS on any platform, Framer included
  ([rationale](./MARKETING_SURFACE_DECISION.md)).
- **Do not** add Framer embeds of the Vercel app, Framer-hosted data viz, or
  full marketing clones under `src/app/`.
- When editing copy, keep product claims aligned with
  [MODEL_CARD.md](./MODEL_CARD.md) and the provenance line in
  `src/lib/constants/provenance.ts`.
