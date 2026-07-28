# Lacuna dataset limitations

Honest bounds on what Lacuna's verified deal set can and cannot support. Figures
below are **pinned to live** `liveDisclosedStats()` output — see
`__tests__/lib/data/lacunaDataset.limitationsDoc.test.ts`.

## Estimand

Public disclosed-value headlines use **`disclosed_only_observed_sum`**:

> Sum of observed `dealValue` (USD millions) over **completed** deals that
> disclosed a price, after scope / provenance filters.

This is a descriptive statistic on the disclosed subsample. It is **not** total
transacted value in women's-health M&A, and it does not impute undisclosed
deals. Non-disclosure is missing-not-at-random (MNAR).

## Live figures (women's-health, completed, disclosed-only)

<!-- LACUNA_LIVE_STATS_BEGIN -->

- Women's-health disclosed-only total: **$22.1B** (`22104` USD millions)
- Adjacency disclosed value excluded by `womensHealthOnly`: **$118.2B**
  (`118150` USD millions)
- SEC-filing share of WH disclosed value: **25.4%**
- Trade-press share of WH disclosed value: **57.1%**
- Completed WH deals in filter (disclosed count): **43** deals (**39** with
  disclosed price)

<!-- LACUNA_LIVE_STATS_END -->

Exact millions are asserted in tests against `liveDisclosedStats()` so this
document cannot silently drift by 20× again.

## Provenance tiers

Tiers (`sec_filing` → `trade_press` → `broker_advisory` → `market_research`)
stratify **censoring pattern**, not prestige. Higher tiers are not labeled "more
defensible" without evidence. Thresholds for concentration / adjacency warnings
and tier floors are **caller-supplied** and recorded on each result.

## Coverage

Coverage is an **observed ratio** against a named external reference (e.g. AOA
Dx 276 exits, 2000–2025), with the reference frame documented alongside.

**Do not use capture-recapture / Lincoln–Petersen.** Lacuna and AOA Dx share a
trade-press substrate (dependence) and are not reliably matchable at the record
level; independence fails and the estimator would manufacture false precision.

## Lifecycle

Terminated and unconfirmed deals are excluded from completed-exit aggregates via
the branded `CompletedDeal` type (compile-time), not a forgettable runtime
filter. Fixtures: Cook Medical RH / CooperSurgical (terminated); ART Fertility
(rumored / unconfirmed).

## What this dataset is

A curated educational convenience sample (`dataset.verified.json`), not a
census. See `LACUNA_VERIFIED_FRAME.knownExclusions` in
`src/lib/data/lacunaDataset/samplingFrame.ts`.
