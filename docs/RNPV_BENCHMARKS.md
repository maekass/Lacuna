# rNPV Benchmark Reference Layer

`src/lib/research/rnpvBenchmarks.ts` holds published success rates, development
timelines, deal values and venture valuations. Analysts use them to choose and
defend assumptions in an rNPV model built outside Lacuna.

## Boundary

- **Reference only.** No Lacuna score, valuation, prediction, ranking or
  dashboard computes from these figures. Every entry carries
  `lacuna_valuation_input`, `company_score`, `company_ranking`,
  `predictive_model_input` and `investment_recommendation` as prohibited uses.
- **Isolated.** A test fails if any other `src/` module imports the file. ESLint
  also blocks imports from `src/lib/{scoring,quant,valuation,biopharma,ml}`.
  Surfacing benchmarks in the product requires changing that test on purpose.
- **Separate from the claim registry.** The claim registry bans numbers and
  valuation use for report-derived claims. This layer stores numbers and does
  not change those rules.
- **Separate from the biopharma diligence model.** That model accepts PTRS only
  as a reviewed `analyst_assumption` with Statista evidence. Benchmarks here do
  not satisfy that schema.
- **Outside the data tiers.** The layer holds aggregate published figures, not
  deals or companies. The withheld items in
  [DATA_BOUNDARIES.md](DATA_BOUNDARIES.md) still apply: stage medians are not
  deal prices or comps, cost-per-launch figures do not reinstate R&D-cost
  valuation, and success rates do not replace withheld trial-model percentages.
- **Not the ML benchmark.**
  [ML_BENCHMARK_GOVERNANCE.md](ML_BENCHMARK_GOVERNANCE.md) governs a held-out
  model evaluation in `ml/clinical_trials/`. It is unrelated to this layer.

## What each entry records

Source and edition, period, population cut, observations (`n`) when reported,
page or slide locator, verification status, caveats, and the derivation for any
computed figure.

Verification statuses:

| Status                     | Meaning                                                   |
| -------------------------- | --------------------------------------------------------- |
| `primary_verified`         | Read in the publisher's own document or page              |
| `primary_third_party_copy` | Publisher's document, hosted by a third party             |
| `derived_from_primary`     | Arithmetic on primary figures; derivation recorded        |
| `secondary_reported`       | Trade-press or secondary coverage; primary not accessible |

`getCitableBenchmarks()` excludes figures with fewer than five reported
observations, the same floor Lacuna applies before reporting class-level
catalyst hit rates. For example, H1 2026 large-cap Phase I–III licensing medians
rest on two deals each and are excluded.

## Sources

| Source                                                        | Edition              | Coverage                                                                                                                                 |
| ------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| BIO / Informa / QLS                                           | 2011–2020 (Feb 2021) | Phase rates and LOA for all indications, non-NME, off-patent, Others, oncology, small molecule, rare disease, biomarker; phase durations |
| Citeline (pharmaphorum)                                       | July 2024            | Overall LOA only (downside sensitivity)                                                                                                  |
| IQVIA Global Trends in R&D                                    | 2025                 | Composite success rate (2023, 2024, 2015–19, 2020–24); 2024 phase rates; durations                                                       |
| IQVIA Global R&D Trends                                       | 2026                 | Durations and enrollment (trade press); AI-enabled Phase I rate (IQVIA blog)                                                             |
| Deloitte, Measuring the Return from Pharmaceutical Innovation | 16th (2026)          | IRR, cost per launch, peak sales per asset                                                                                               |
| J.P. Morgan / DealForma                                       | Q2 2026              | M&A medians by stage; licensing medians by stage and year; upfront share of deal value                                                   |
| SVB Healthcare Investments and Exits                          | H2 2026              | Median pre-money and round size by series, biopharma and device                                                                          |
| SVB Innovation in Women's Health                              | 2026                 | Median pre-money (all vs AI-enabled); funding totals; financing graduation rates                                                         |

## Comparability

- BIO, Citeline and IQVIA use different databases and phase definitions. Do not
  multiply one publisher's phase rates with another's.
- IQVIA's 2026 edition restates 2023 and 2024 durations from the 2025 edition.
  Each value is stored under its own edition.
- J.P. Morgan M&A stage medians pool 2021–H1 2026. They support stage step-up
  checks, not year-over-year roll-forward.
- SVB valuation charts index 2020 to 1.0x and changed Series A criteria from
  earlier editions.

`KNOWN_SOURCE_ISSUES` lists documented errors and conflicts, including SVB H2
2026's duplicated device-exit chart, which is why no device exit figures are
stored.

## Using the layer

Read the figures in a script, test or notebook. App code cannot import them.

```ts
import {
  getBenchmarksBySource,
  getCitableBenchmarks,
  impliedStepUp,
  KNOWN_SOURCE_ISSUES,
} from "@/lib/research/rnpvBenchmarks";

const bioNonNme = getCitableBenchmarks().filter((b) =>
  b.id.startsWith("bio-2011-2020-non-nme-")
);
const jpm = getBenchmarksBySource("jpm-dealforma-biopharma-q2-2026");
const stepUp = impliedStepUp(0.52); // ≈1.92x for clearing Phase I
```

- Start from `getCitableBenchmarks()`. Use `RNPV_BENCHMARKS` only when you
  intend to show small-sample figures with their `n`.
- Keep each assumption to one publisher and edition. Mixing BIO phase rates with
  IQVIA or Citeline rates produces a composite neither source reports.
- Check `KNOWN_SOURCE_ISSUES` for the source before citing it.
- `impliedStepUp` is a stage check: 1 ÷ phase success, before time value and
  remaining cost. It is not a valuation.

## Citing a benchmark

Cite the publisher, title, edition, figure, period, cut and locator. Add the
verification status whenever it is not `primary_verified`.

> BIO / Informa / QLS, Clinical Development Success Rates 2011–2020 (2021):
> non-NME likelihood of approval from Phase I, 13.3% (n = 1,884), PDF pp. 15–16.

> IQVIA, Global Trends in R&D 2025: composite success rate 7% in 2024, Exhibit
> 46, printed p. 55 (third-party-hosted copy).

Do not cite IQVIA's 7% composite to the 2026 report. Do not cite J.P. Morgan's
pooled 2021–H1 2026 M&A medians as a single year.

## Adding or updating figures

1. Read the figure in the primary document. If only secondary coverage is
   available, use `secondary_reported` and name the outlet in the locator.
2. Add the source to `BENCHMARK_SOURCES` with edition, publication date, data
   cutoff, access type, methodology and limitations. If the source is also in
   the canonical research-source registry, set `registryId`. The tests require
   matching dates and URLs.
3. Add each figure with its period, cut, locator, and `n` when reported. Store
   rates as fractions and money in USD. For any computed figure, use
   `derived_from_primary` and record the arithmetic in `derivation`.
4. Store a new edition alongside the old one. Do not overwrite it: editions
   restate prior years.
5. Log contradictions, chart errors and text-versus-table differences in
   `KNOWN_SOURCE_ISSUES`, and say what was stored.
6. Add or extend an integrity test when a source publishes figures that should
   reconcile. For example, phase rates should multiply to the reported LOA.
7. Do not store licensed text, paywalled report content, or anything an analyst
   could not cite publicly.

## Excluded material

- Licensed subscription content, including Mergermarket and anything from the
  IQVIA 2026 report beyond IQVIA's public pages.
- Unverified secondary figures: Citeline phase-by-phase rates circulating in
  summaries, and Substack figures that could not be traced to a primary source.
  Checked October 2026:
  - Aurelion Research, "Bottleneck Opportunity in a New Healthcare Era" (May 14,
    2026): paywalled. The public portion shows none of the funding, R&D or M&A
    figures attributed to it, and names IQVIA only as a CRO stock.
  - The Century of Biology, "AI Versus Eroom's Law" (Apr 12, 2026): its
    emerging-biopharma share of Phase I submissions cites IQVIA Pipeline
    Intelligence (Dec 2022) and IQVIA Institute (Jan 2023), not the 2026 report.
    Its claim that AI biotechs show greater clinical success has no cited
    source.
- Individual transactions. New deals enter the verified dataset only through the
  promotion workflow in `docs/NEW_DEAL_WORKFLOW.md`.
