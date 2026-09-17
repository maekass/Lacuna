# Marketing surface decision — Framer stays, Webflow not adopted

**Status:** decided, 2026-09-13. Supersedes nothing; narrows
[SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md).

**Decision:** keep **Framer** ([framer.com](https://www.framer.com)) as the sole
marketing surface. Do **not** adopt Webflow. Do **not** move the weekly
biopharma briefs, catalyst watchlist, or any dataset-derived content into a
no-code CMS on either platform.

## Why this was asked

The request was framed as "which is more professional." That is the wrong axis.
Both platforms ship sites that read as professional; visitors cannot tell which
builder produced a marketing page. The axis that actually decides it is **where
the content pipeline lives**, because Lacuna already has a real one:
`intel/biopharma-weekly/` produces a brief and a validated CSV every Friday
through `scripts/sweep-watchlist.ts`, with schema enforcement, provenance
columns, and a PR gate.

## What was compared

Prices below are as published on 2026-09-13 and are the vendors' own monthly
figures.

| Dimension                    | Framer                                                                                                                                                                                                                                                                        | Webflow                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry paid tier              | Basic **$10/mo**, Pro **$30/mo** ([pricing](https://www.framer.com/pricing))                                                                                                                                                                                                  | Basic **$15/mo**, Premium **$25/mo** ([pricing](https://webflow.com/pricing))                                                                             |
| CMS at the cheap tier        | Basic includes **2 CMS collections**; Pro **10**; Pro with add-ons up to **40,000 items / 40 collections**                                                                                                                                                                    | Basic has **no CMS** — "for simple sites that don't need a CMS." A CMS-backed pipeline starts at Premium                                                  |
| Programmatic content writes  | **Server API** — "programmatic access from any server without having to open Framer," syncs CMS collections from external sources, triggered by AI agents, webhooks, or scheduled jobs; **free during open beta** ([announcement](https://www.framer.com/updates/server-api)) | **Data API** with full CRUD on collections and items ([docs](https://developers.webflow.com/data/docs/working-with-the-cms/manage-collections-and-items)) |
| Publish semantics for a sync | Server API can publish changes directly                                                                                                                                                                                                                                       | "To publish a collection or any collection items, **you'll need to publish the entire site**"                                                             |
| Cost of switching            | zero — already the documented surface                                                                                                                                                                                                                                         | a migration, a second vendor, and a second place brand copy can drift                                                                                     |

Webflow's Data API is the more mature of the two. That is not enough to justify
adopting it, because the thing it would be used for should not be built at all.

## Why briefs do not go in a no-code CMS

Webflow's own constraint makes the point: publishing one collection item
republishes the whole site. A weekly brief pipeline would therefore trigger a
full site publish every Friday, from a cron, against a surface whose only job is
brand copy.

The deeper objection is provenance. Every row in `catalysts.csv` carries
`source_url`, `date_basis`, `date_precision`, `last_verified`, and
`womens_health_relevant`, and the sweep script hard-fails on non-HTTPS sources,
unknown enum values, and `actual_date` set while `status=upcoming`. Copying that
content into a CMS creates a second store with none of those guarantees and no
review gate — the exact failure mode that let a fabricated advisory-committee
row into the watchlist in the 2026-09-04 cycle. Briefs render from this repo, or
they do not render.

## What Framer is for

Unchanged from [SITE_ARCHITECTURE.md](./SITE_ARCHITECTURE.md): brand, narrative
hero, methodology _story_, hiring and portfolio context, and **one** primary CTA
into the Vercel app. No dashboards, no embedded analytics, no deal data, no
scores, no "live" M&A claims.

## Revisit conditions

Reopen this decision only if one of these becomes true:

- Marketing needs more than **10 CMS collections** and the content is genuinely
  editorial rather than dataset-derived.
- A non-engineer needs to publish structured marketing content on a schedule
  without touching a PR.
- Framer's Server API leaves open beta on terms that make scheduled publishing
  unworkable.

Cost or aesthetics alone are not revisit conditions.
