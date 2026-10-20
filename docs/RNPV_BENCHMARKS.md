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

## Excluded material

- Licensed subscription content, including Mergermarket and anything from the
  IQVIA 2026 report beyond IQVIA's public pages.
- Unverified secondary figures: Citeline phase-by-phase rates circulating in
  summaries, and Substack figures that could not be traced to a primary source.
- Individual transactions. New deals enter the verified dataset only through the
  promotion workflow in `docs/NEW_DEAL_WORKFLOW.md`.
