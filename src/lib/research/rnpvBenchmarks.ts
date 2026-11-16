/**
 * rNPV benchmark reference layer.
 *
 * Analyst reference only. These figures help an analyst choose and defend
 * probability-of-success, timeline, and stage-value assumptions in an
 * external rNPV model. No Lacuna score, valuation, prediction, ranking, or
 * dashboard computes from them. `__tests__/lib/research/rnpvBenchmarks.test.ts`
 * fails if any other `src/` module imports this file, and ESLint blocks
 * imports from scoring, quant, valuation, biopharma, and ML code.
 *
 * The biopharma diligence model (`src/lib/biopharma/diligenceModel.ts`)
 * accepts PTRS only as a reviewed `analyst_assumption` with Statista
 * evidence. Benchmarks here do not satisfy that schema and must not be
 * wired into it without a separate governance decision.
 *
 * Rules:
 * - Every figure carries its source, edition, period, cut, locator, and
 *   verification status. Values are stored as published (fractions for
 *   rates, USD for money, years or months for durations).
 * - Figures from different publishers or editions are not interchangeable.
 *   Each publisher uses its own database, definitions, and deal scope.
 * - Figures backed by fewer than {@link MINIMUM_CITABLE_SAMPLE} observations
 *   are kept for transparency but excluded from {@link getCitableBenchmarks}.
 * - Licensed content (paywalled reports, subscription news) is not stored.
 *   See docs/RNPV_BENCHMARKS.md for excluded material.
 */

import { RESEARCH_SOURCE_IDS } from "@/lib/research/sourceRegistry";

export type BenchmarkAccess =
  | "public"
  | "public_registration"
  | "public_third_party_copy"
  | "secondary_coverage";

export type VerificationStatus =
  /** Read directly in the publisher's own document or page. */
  | "primary_verified"
  /** Read in the publisher's document, hosted by a third party. */
  | "primary_third_party_copy"
  /** Arithmetic on primary figures; the derivation is recorded. */
  | "derived_from_primary"
  /** Reported by secondary coverage; primary not accessible. */
  | "secondary_reported";

export type BenchmarkApprovedUse =
  | "analyst_reference"
  | "sensitivity_bound"
  | "source_cross_check";

export type BenchmarkProhibitedUse =
  | "lacuna_valuation_input"
  | "company_score"
  | "company_ranking"
  | "predictive_model_input"
  | "investment_recommendation"
  | "clinical_guidance";

export type Transition =
  | "phase1_to_phase2"
  | "phase2_to_phase3"
  | "phase3_to_submission"
  | "submission_to_approval"
  | "phase1_to_approval";

export type DealStage =
  | "platform_discovery"
  | "preclinical"
  | "phase1"
  | "phase2"
  | "phase3"
  | "approved";

export type FinancingRound = "series_a" | "series_b" | "series_c_plus";

export type BenchmarkMetric =
  | "phase_transition_success"
  | "likelihood_of_approval"
  | "composite_success_rate"
  | "phase_duration"
  | "total_development_duration"
  | "enrollment_duration"
  | "median_ma_upfront"
  | "median_licensing_upfront"
  | "licensing_upfront_share"
  | "median_pre_money"
  | "median_round_size"
  | "projected_pipeline_irr"
  | "average_cost_per_launch"
  | "average_peak_sales_per_asset"
  | "venture_funding_total"
  | "financing_graduation_rate";

export type BenchmarkUnit = "fraction" | "usd" | "years" | "months";

export interface BenchmarkSource {
  id: string;
  publisher: string;
  title: string;
  edition: string;
  publishedAt: string;
  dataCutoff?: string;
  sourceUrl: string;
  access: BenchmarkAccess;
  methodologySummary: string;
  limitations: string[];
  /** Matching id in the canonical research-source registry, if any. */
  registryId?: string;
  lastReviewedAt: string;
}

export interface RnpvBenchmark {
  id: string;
  sourceId: string;
  metric: BenchmarkMetric;
  value: number;
  unit: BenchmarkUnit;
  /** Population, sector, or class the figure describes. */
  cut: string;
  period: string;
  transition?: Transition;
  stage?: DealStage;
  round?: FinancingRound;
  /** Observations behind the figure, when the source reports them. */
  n?: number;
  /** Page, exhibit, or slide in the source. */
  locator: string;
  verification: VerificationStatus;
  /** Required when verification is `derived_from_primary`. */
  derivation?: string;
  caveats: string[];
  approvedUses: BenchmarkApprovedUse[];
  prohibitedUses: BenchmarkProhibitedUse[];
  lastReviewedAt: string;
}

export interface KnownSourceIssue {
  id: string;
  sourceId: string;
  issue: string;
  handling: string;
}

/** Same floor Lacuna uses before reporting class-level catalyst hit rates. */
export const MINIMUM_CITABLE_SAMPLE = 5;

const REVIEWED_AT = "2026-10-20";

const PROHIBITED: readonly BenchmarkProhibitedUse[] = [
  "lacuna_valuation_input",
  "company_score",
  "company_ranking",
  "predictive_model_input",
  "investment_recommendation",
  "clinical_guidance",
];

const REFERENCE: readonly BenchmarkApprovedUse[] = [
  "analyst_reference",
  "sensitivity_bound",
  "source_cross_check",
];

export const BENCHMARK_SOURCE_IDS = {
  bio2021: "bio-clinical-success-rates-2011-2020",
  citeline2024: "citeline-success-rates-2024",
  iqvia2025: "iqvia-global-trends-rd-2025",
  iqvia2026: "iqvia-global-rd-trends-2026",
  deloitte2026: "deloitte-pharma-innovation-return-2026",
  jpmQ22026: "jpm-dealforma-biopharma-q2-2026",
  svbH22026: RESEARCH_SOURCE_IDS.svbH22026,
  svbWomensHealth2026: "svb-womens-health-2026",
} as const;

const S = BENCHMARK_SOURCE_IDS;

export const BENCHMARK_SOURCES: readonly BenchmarkSource[] = [
  {
    id: S.bio2021,
    publisher: "BIO, Informa Pharma Intelligence, QLS Advisors",
    title:
      "Clinical Development Success Rates and Contributing Factors 2011–2020",
    edition: "2021",
    publishedAt: "February 2021",
    dataCutoff: "November 30, 2020",
    sourceUrl:
      "https://www.bio.org/clinical-development-success-rates-and-contributing-factors-2011-2020",
    access: "public",
    methodologySummary:
      "12,728 phase transitions from 9,704 company-sponsored, FDA registration-enabling programs across 1,779 companies (Biomedtracker). Phase success = advanced ÷ (advanced + suspended). LOA = product of subsequent phase rates. Durations count successful transitions only.",
    limitations: [
      "Rates reflect commercial and portfolio decisions, not only safety or efficacy.",
      "No preclinical-to-Phase I rate; no 505(b)(2) or drug–device category.",
      "Dermatology, Obstetrics, Renal, ENT/Dental and Orthopedics are pooled in “Others.”",
      "Investigator-sponsored studies and generics are excluded.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.citeline2024,
    publisher: "Citeline (Norstella)",
    title: "Clinical development rates are falling – but it's not all bad news",
    edition: "2024",
    publishedAt: "July 18, 2024",
    sourceUrl:
      "https://pharmaphorum.com/rd/clinical-development-rates-are-falling-its-not-all-bad-news",
    access: "secondary_coverage",
    methodologySummary:
      "Overall likelihood of approval from Citeline's Biomedtracker, reported in pharmaphorum by Daniel Chancellor (Norstella). Primary dataset is proprietary.",
    limitations: [
      "Secondary coverage only; definitions and sample sizes not verified.",
      "Use as a downside sensitivity, not a base case.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.iqvia2025,
    publisher: "IQVIA Institute for Human Data Science",
    title:
      "Global Trends in R&D 2025: Progress in Recapturing Momentum in Biopharma Innovation",
    edition: "2025",
    publishedAt: "March 2025",
    dataCutoff: "2024",
    sourceUrl:
      "https://makingpharmaindustry.it/wp-content/uploads/2025/03/iqvia-institute-rd-trends-2025-forweb.pdf",
    access: "public_third_party_copy",
    methodologySummary:
      "Composite success = Phase I × Phase II × Phase III × regulatory submission success, from IQVIA's pipeline data. Latest edition with a public composite rate.",
    limitations: [
      "IQVIA's 2025 landing page now redirects to the 2026 edition; the PDF is a third-party-hosted copy.",
      "Locators give the printed page and the PDF page, which differ by two.",
      "Durations differ from the 2026 edition's restated values for the same years; do not mix editions.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.iqvia2026,
    publisher: "IQVIA Institute for Human Data Science",
    title:
      "Global R&D Trends 2026: Advancing Innovation in a Changing Landscape",
    edition: "2026",
    publishedAt: "March 25, 2026",
    dataCutoff: "2025",
    sourceUrl:
      "https://www.iqvia.com/insights/the-iqvia-institute/reports-and-publications/reports/global-r-and-d-trends-2026",
    access: "secondary_coverage",
    methodologySummary:
      "Full report is licensed. Figures here come only from IQVIA's public pages and blog, or from named trade-press coverage.",
    limitations: [
      "No public 2025 composite success rate. IQVIA states industry-wide rates were unchanged from the prior year.",
      "Report content beyond IQVIA's public pages is not stored here.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.deloitte2026,
    publisher: "Deloitte",
    title: "Measuring the Return from Pharmaceutical Innovation (16th edition)",
    edition: "2026",
    publishedAt: "May 4, 2026",
    dataCutoff: "2025",
    sourceUrl:
      "https://www.deloitte.com/uk/en/Industries/life-sciences-health-care/research/measuring-return-from-pharmaceutical-innovation.html",
    access: "public",
    methodologySummary:
      "Projected late-stage pipeline returns for a fixed cohort of 20 large biopharma companies, using Evaluate forecasts. Cost per launch includes the cost of failure.",
    limitations: [
      "Large-pharma cohort; not representative of small-biotech or device economics.",
      "Phase risk-adjustment rates are not published.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.jpmQ22026,
    publisher: "J.P. Morgan with DealForma",
    title: "Q2 2026 Biopharma Licensing and Venture Report",
    edition: "Q2 2026",
    publishedAt: "July 2026",
    dataCutoff: "June 30, 2026",
    sourceUrl:
      "https://www.jpmorgan.com/insights/markets-and-economy/outlook/biopharma-medtech-deal-reports",
    access: "public",
    methodologySummary:
      "DealForma database; disclosed figures only. Stage is the lead asset's stage at signing. M&A covers biopharma-to-biopharma deals, acquisition options and reverse mergers.",
    limitations: [
      "Medians of disclosed terms; undisclosed deals are excluded.",
      "Large-cap ($50B+) buyer cuts are not small-buyer or device comparables.",
      "DealForma's own quarterly reviews use a different scope; do not mix series.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.svbH22026,
    publisher: "Silicon Valley Bank (First Citizens Innovation Banking)",
    title: "Healthcare Investments and Exits H2 2026",
    edition: "H2 2026",
    publishedAt: "August 25, 2026",
    dataCutoff: "June 30, 2026",
    sourceUrl:
      "https://www.svb.com/trends-insights/reports/healthcare-investments-and-exits/",
    access: "public_registration",
    methodologySummary:
      "PitchBook and SVB proprietary data; US and Europe. Deals include institutional or corporate venture investment or are at least $2M. Valuation charts index 2020 medians to 1.0x.",
    limitations: [
      "Series A criteria changed from prior editions; values are not comparable across editions.",
      "Chart labels read from rendered pages; no underlying table is published.",
    ],
    registryId: RESEARCH_SOURCE_IDS.svbH22026,
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: S.svbWomensHealth2026,
    publisher: "Silicon Valley Bank (First Citizens Innovation Banking)",
    title: "Innovation in Women's Health 2026",
    edition: "2026",
    publishedAt: "June 2026",
    sourceUrl:
      "https://innovation.firstcitizens.com/trends-insights/reports/womens-health-report",
    access: "public_registration",
    methodologySummary:
      "PitchBook and SVB proprietary data on companies SVB identifies as women's health; US and Europe.",
    limitations: [
      "Publisher-defined women's-health universe; not comparable with Lacuna's curated sample or taxonomy.",
      "Funding totals vary across the report and its coverage depending on scope.",
    ],
    lastReviewedAt: REVIEWED_AT,
  },
];

type Draft =
  & Omit<
    RnpvBenchmark,
    "approvedUses" | "prohibitedUses" | "lastReviewedAt" | "caveats"
  >
  & { caveats?: string[] };

function benchmark(draft: Draft): RnpvBenchmark {
  return {
    ...draft,
    caveats: draft.caveats ?? [],
    approvedUses: [...REFERENCE],
    prohibitedUses: [...PROHIBITED],
    lastReviewedAt: REVIEWED_AT,
  };
}

const PHASES: readonly Transition[] = [
  "phase1_to_phase2",
  "phase2_to_phase3",
  "phase3_to_submission",
  "submission_to_approval",
  "phase1_to_approval",
];

const PHASE_ID: Record<Transition, string> = {
  phase1_to_phase2: "p1-p2",
  phase2_to_phase3: "p2-p3",
  phase3_to_submission: "p3-sub",
  submission_to_approval: "sub-appr",
  phase1_to_approval: "loa",
};

/** One BIO cut: four phase rates plus LOA, each with its own n. */
function bioCut(
  key: string,
  cut: string,
  locator: string,
  rows: readonly [number, number][],
  caveats: string[] = [],
): RnpvBenchmark[] {
  return rows.map(([value, n], i) => {
    const transition = PHASES[i];
    return benchmark({
      id: `bio-2011-2020-${key}-${PHASE_ID[transition]}`,
      sourceId: S.bio2021,
      metric: transition === "phase1_to_approval"
        ? "likelihood_of_approval"
        : "phase_transition_success",
      value,
      unit: "fraction",
      cut,
      period: "2011–2020",
      transition,
      n,
      locator,
      verification: "primary_verified",
      caveats,
    });
  });
}

const BIO: RnpvBenchmark[] = [
  ...bioCut("all", "All indications", "PDF pp. 6, 10–11 (Figure 1)", [
    [0.52, 4414],
    [0.289, 4933],
    [0.578, 1928],
    [0.906, 1453],
    [0.079, 12728],
  ]),
  ...bioCut("non-nme", "Non-NME", "PDF pp. 15–16 (Figure 9)", [
    [0.575, 395],
    [0.375, 523],
    [0.675, 471],
    [0.915, 495],
    [0.133, 1884],
  ], ["Closest public cut for reformulations of approved molecules."]),
  ...bioCut(
    "off-patent",
    "Off-patent (non-NME + biosimilar)",
    "PDF pp. 15–16 (Figure 9)",
    [
      [0.604, 455],
      [0.376, 527],
      [0.703, 552],
      [0.919, 627],
      [0.147, 2161],
    ],
  ),
  ...bioCut(
    "others",
    "Others (Dermatology, Renal, Obstetrics, non-autoimmune Rheumatology, ENT/Dental, Orthopedics)",
    "PDF pp. 7, 10–11",
    [
      [0.636, 154],
      [0.386, 228],
      [0.6, 90],
      [0.884, 69],
      [0.13, 541],
    ],
    ["Pooled category; no separate dermatology or obstetrics rate exists."],
  ),
  ...bioCut("oncology", "Oncology", "PDF pp. 7–11", [
    [0.488, 1628],
    [0.246, 1732],
    [0.477, 495],
    [0.92, 324],
    [0.053, 4179],
  ], [
    "Table reports Phase III 47.7%; narrative on PDF p. 9 states 47.5%. Table value stored.",
  ]),
  ...bioCut("small-molecule", "Small molecule", "PDF pp. 16–17 (Figure 10)", [
    [0.526, 2308],
    [0.28, 2896],
    [0.569, 1118],
    [0.895, 849],
    [0.075, 7171],
  ]),
  ...bioCut(
    "rare",
    "Rare disease (non-oncology)",
    "PDF pp. 13–14",
    [
      [0.674, 380],
      [0.446, 464],
      [0.604, 240],
      [0.936, 172],
      [0.17, 1256],
    ],
  ),
  ...bioCut(
    "biomarker",
    "Patient-preselection biomarker",
    "PDF pp. 17–18",
    [
      [0.524, 414],
      [0.463, 149],
      [0.682, 129],
      [0.96, 75],
      [0.159, 767],
    ],
  ),
  ...(
    [
      ["phase1", 2.3, 2296],
      ["phase2", 3.6, 1424],
      ["phase3", 3.3, 1115],
      ["submission", 1.3, 1316],
    ] as const
  ).map(([phase, value, n]) =>
    benchmark({
      id: `bio-2011-2020-all-duration-${phase}`,
      sourceId: S.bio2021,
      metric: "phase_duration",
      value,
      unit: "years",
      cut: `All indications, ${phase} phase`,
      period: "2011–2020",
      n,
      locator: "PDF pp. 24–25",
      verification: "primary_verified",
      caveats: [
        "Successful transitions only; measured between public disclosures, not trial dates.",
      ],
    })
  ),
  benchmark({
    id: "bio-2011-2020-all-duration-total",
    sourceId: S.bio2021,
    metric: "total_development_duration",
    value: 10.5,
    unit: "years",
    cut: "All indications, Phase I to approval",
    period: "2011–2020",
    locator: "PDF p. 24",
    verification: "primary_verified",
  }),
];

const CITELINE: RnpvBenchmark[] = [
  benchmark({
    id: "citeline-2024-all-loa",
    sourceId: S.citeline2024,
    metric: "likelihood_of_approval",
    value: 0.067,
    unit: "fraction",
    cut: "All indications",
    period: "As of 2024; dataset period not stated",
    transition: "phase1_to_approval",
    locator: "pharmaphorum, July 18, 2024",
    verification: "secondary_reported",
    caveats: [
      "Downside sensitivity only; primary dataset not accessible.",
      "Phase-by-phase Citeline rates circulating in summaries are not stated in this article and are not stored.",
    ],
  }),
];

const IQVIA_2025: RnpvBenchmark[] = [
  ...(
    [
      ["2024", 0.07],
      ["2023", 0.06],
      ["2020-2024", 0.07],
      ["2015-2019", 0.09],
    ] as const
  ).map(([period, value]) =>
    benchmark({
      id: `iqvia-2025-composite-${period}`,
      sourceId: S.iqvia2025,
      metric: "composite_success_rate",
      value,
      unit: "fraction",
      cut: "All indications",
      period: period.replace("-", "–"),
      transition: "phase1_to_approval",
      locator: "Exhibit 46, printed p. 55 (PDF p. 57)",
      verification: "primary_third_party_copy",
      caveats: [
        "Commonly misattributed to the 2026 report; cite the 2025 edition.",
      ],
    })
  ),
  ...(
    [
      ["phase1_to_phase2", 0.47],
      ["phase2_to_phase3", 0.25],
      ["phase3_to_submission", 0.59],
      ["submission_to_approval", 0.98],
    ] as const
  ).map(([transition, value]) =>
    benchmark({
      id: `iqvia-2025-2024-${PHASE_ID[transition]}`,
      sourceId: S.iqvia2025,
      metric: "phase_transition_success",
      value,
      unit: "fraction",
      cut: "All indications",
      period: "2024",
      transition,
      locator: "Exhibit 46, printed p. 55 (PDF p. 57)",
      verification: "primary_third_party_copy",
      caveats: [
        "Single-year rate; IQVIA's regulatory step is submission success, not BIO's NDA/BLA-to-approval.",
      ],
    })
  ),
  ...(
    [
      ["2022", 10.1],
      ["2023", 9.9],
      ["2024", 9.3],
    ] as const
  ).map(([period, value]) =>
    benchmark({
      id: `iqvia-2025-duration-${period}`,
      sourceId: S.iqvia2025,
      metric: "total_development_duration",
      value,
      unit: "years",
      cut: "Composite median program duration, Phase I start to approval",
      period,
      locator: "Exhibit 62, printed p. 71 (PDF p. 73)",
      verification: "primary_third_party_copy",
      caveats: ["2025-edition value; the 2026 edition restates these years."],
    })
  ),
];

const IQVIA_2026: RnpvBenchmark[] = [
  ...(
    [
      ["2023", 9.7],
      ["2024", 8.9],
      ["2025", 10.0],
    ] as const
  ).map(([period, value]) =>
    benchmark({
      id: `iqvia-2026-duration-${period}`,
      sourceId: S.iqvia2026,
      metric: "total_development_duration",
      value,
      unit: "years",
      cut: "End-to-end clinical development",
      period,
      locator:
        "Applied Clinical Trials, May 20, 2026 (https://www.appliedclinicaltrialsonline.com/view/clinical-trials-day-changing-equation-rd-success)",
      verification: "secondary_reported",
      caveats: [
        "2026-edition values as reported by trade press; differ from the 2025 edition for 2023 and 2024.",
      ],
    })
  ),
  ...(
    [
      ["2024", 14.9],
      ["2025", 16.3],
    ] as const
  ).map(([period, value]) =>
    benchmark({
      id: `iqvia-2026-enrollment-${period}`,
      sourceId: S.iqvia2026,
      metric: "enrollment_duration",
      value,
      unit: "months",
      cut: "Trial enrollment duration",
      period,
      locator:
        "Applied Clinical Trials, May 20, 2026 (https://www.appliedclinicaltrialsonline.com/view/clinical-trials-day-changing-equation-rd-success)",
      verification: "secondary_reported",
    })
  ),
  benchmark({
    id: "iqvia-2026-ai-enabled-phase1",
    sourceId: S.iqvia2026,
    metric: "phase_transition_success",
    value: 0.75,
    unit: "fraction",
    cut: "AI-enabled programs at emerging biopharma companies",
    period: "Latest three-year window",
    transition: "phase1_to_phase2",
    locator:
      "IQVIA blog, May 14, 2026 (https://www.iqvia.com/blogs/2026/05/iqvia-institutes-global-r-and-d-trends-2026-report-finds-credible-signal-on-ai-enabled-programs)",
    verification: "primary_verified",
    caveats: [
      "IQVIA describes the cohort as relatively small and reports no sample size.",
      "Phase II reported on par with non-AI peers; Phase III too few to analyze.",
      "Not applicable to programs that are not AI-enabled.",
    ],
  }),
];

const DELOITTE: RnpvBenchmark[] = [
  benchmark({
    id: "deloitte-2026-irr-2025",
    sourceId: S.deloitte2026,
    metric: "projected_pipeline_irr",
    value: 0.07,
    unit: "fraction",
    cut: "Top-20 biopharma late-stage pipeline",
    period: "2025",
    locator: "Report web page",
    verification: "primary_verified",
  }),
  benchmark({
    id: "deloitte-2026-irr-2025-ex-glp1",
    sourceId: S.deloitte2026,
    metric: "projected_pipeline_irr",
    value: 0.029,
    unit: "fraction",
    cut: "Top-20 biopharma late-stage pipeline, excluding GLP-1/GIP",
    period: "2025",
    locator: "Report web page",
    verification: "primary_verified",
  }),
  benchmark({
    id: "deloitte-2026-median-irr-2025",
    sourceId: S.deloitte2026,
    metric: "projected_pipeline_irr",
    value: 0.04,
    unit: "fraction",
    cut: "Top-20 biopharma, median company",
    period: "2025",
    locator: "Report web page",
    verification: "primary_verified",
  }),
  ...(
    [
      ["2025", 2_671_000_000],
      ["2024", 2_229_000_000],
    ] as const
  ).map(([period, value]) =>
    benchmark({
      id: `deloitte-2026-cost-per-launch-${period}`,
      sourceId: S.deloitte2026,
      metric: "average_cost_per_launch",
      value,
      unit: "usd",
      cut: "Top-20 biopharma, discovery to launch, including cost of failure",
      period,
      locator: "Report web page",
      verification: "primary_verified",
    })
  ),
  benchmark({
    id: "deloitte-2026-peak-sales-2025",
    sourceId: S.deloitte2026,
    metric: "average_peak_sales_per_asset",
    value: 598_000_000,
    unit: "usd",
    cut: "Top-20 biopharma late-stage assets",
    period: "2025",
    locator: "Report web page",
    verification: "primary_verified",
    caveats: ["About 53% of asset-indications are forecast below $250M peak."],
  }),
  benchmark({
    id: "deloitte-2026-peak-sales-2025-ex-glp1",
    sourceId: S.deloitte2026,
    metric: "average_peak_sales_per_asset",
    value: 353_000_000,
    unit: "usd",
    cut: "Top-20 biopharma late-stage assets, excluding GLP-1/GIP",
    period: "2025",
    locator: "Report web page",
    verification: "primary_verified",
  }),
];

const M = 1_000_000;
const B = 1_000_000_000;

const JPM_MA: RnpvBenchmark[] = (
  [
    ["platform_discovery", 226 * M],
    ["preclinical", 314 * M],
    ["phase1", 1.0 * B],
    ["phase2", 1.9 * B],
    ["phase3", 3.7 * B],
    ["approved", 7.3 * B],
  ] as const
).map(([stage, value]) =>
  benchmark({
    id: `jpm-q2-2026-ma-upfront-${stage}`,
    sourceId: S.jpmQ22026,
    metric: "median_ma_upfront",
    value,
    unit: "usd",
    cut: "Large-cap ($50B+) biopharma buyer; upfront cash and equity",
    period: "2021–H1 2026 pooled",
    stage,
    locator: "Slide 18",
    verification: "primary_verified",
    caveats: [
      "Pooled across 2021–H1 2026; not a time series.",
      "Medians compare different companies, not one asset over time.",
    ],
  })
);

/** [stage, 2024 value, 2024 n, 2025 value, 2025 n, H1 2026 value, H1 2026 n] */
const JPM_LICENSING_ROWS: readonly [
  DealStage,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  ["platform_discovery", 42 * M, 84, 45 * M, 71, 62 * M, 41],
  ["preclinical", 45 * M, 16, 75 * M, 16, 40 * M, 7],
  ["phase1", 168 * M, 6, 125 * M, 14, 180 * M, 2],
  ["phase2", 150 * M, 7, 180 * M, 8, 363 * M, 2],
  ["phase3", 90 * M, 8, 240 * M, 6, 700 * M, 2],
];

const JPM_LICENSING: RnpvBenchmark[] = JPM_LICENSING_ROWS.flatMap(
  ([stage, v24, n24, v25, n25, v26, n26]) =>
    (
      [
        ["2024", v24, n24],
        ["2025", v25, n25],
        ["H1 2026", v26, n26],
      ] as const
    ).map(([period, value, n]) =>
      benchmark({
        id: `jpm-q2-2026-licensing-upfront-${stage}-${
          period.replace(" ", "-").toLowerCase()
        }`,
        sourceId: S.jpmQ22026,
        metric: "median_licensing_upfront",
        value,
        unit: "usd",
        cut:
          "In-licensing by large-cap ($50B+) biopharma; upfront cash and equity",
        period,
        stage,
        n,
        locator: "Slide 12",
        verification: "primary_verified",
      })
    ),
);

const JPM_UPFRONT_SHARE: RnpvBenchmark[] = (
  [
    ["2017", 0.1],
    ["2018", 0.11],
    ["2019", 0.13],
    ["2020", 0.11],
    ["2021", 0.08],
    ["2022", 0.06],
    ["2023", 0.07],
    ["2024", 0.07],
    ["2025", 0.07],
    ["H1 2026", 0.06],
  ] as const
).map(([period, value]) =>
  benchmark({
    id: `jpm-q2-2026-upfront-share-${period.replace(" ", "-").toLowerCase()}`,
    sourceId: S.jpmQ22026,
    metric: "licensing_upfront_share",
    value,
    unit: "fraction",
    cut: "Biopharma R&D licensing; upfront cash ÷ announced deal value",
    period,
    locator: "Slide 10",
    verification: "primary_verified",
    caveats: ["Announced value is mostly contingent milestones."],
  })
);

/** [sector, round, 2026 pre-money, 2020 pre-money, 2026 median round size] */
const SVB_VALUATION_ROWS: readonly [
  "biopharma" | "device",
  FinancingRound,
  number,
  number,
  number,
][] = [
  ["biopharma", "series_a", 60 * M, 23 * M, 31 * M],
  ["biopharma", "series_b", 185 * M, 70 * M, 62 * M],
  ["biopharma", "series_c_plus", 409 * M, 166 * M, 75 * M],
  ["device", "series_a", 25 * M, 16 * M, 8 * M],
  ["device", "series_b", 59 * M, 30 * M, 25 * M],
  ["device", "series_c_plus", 192 * M, 80 * M, 50 * M],
];

const SVB_VALUATIONS: RnpvBenchmark[] = SVB_VALUATION_ROWS.flatMap(
  ([sector, round, pre2026, pre2020, size2026]) => {
    const locator = sector === "biopharma" ? "p. 11" : "p. 14";
    const cut = `${
      sector === "biopharma" ? "Biopharma" : "Device"
    }, US and Europe`;
    const caveats = [
      "Read from chart labels; 2020 indexed to 1.0x.",
    ];
    return [
      benchmark({
        id: `svb-h2-2026-${sector}-${round}-pre-money-2026`,
        sourceId: S.svbH22026,
        metric: "median_pre_money",
        value: pre2026,
        unit: "usd",
        cut,
        period: "2026 (through June 30)",
        round,
        locator,
        verification: "primary_verified",
        caveats,
      }),
      benchmark({
        id: `svb-h2-2026-${sector}-${round}-pre-money-2020`,
        sourceId: S.svbH22026,
        metric: "median_pre_money",
        value: pre2020,
        unit: "usd",
        cut,
        period: "2020",
        round,
        locator,
        verification: "primary_verified",
        caveats,
      }),
      benchmark({
        id: `svb-h2-2026-${sector}-${round}-round-size-2026`,
        sourceId: S.svbH22026,
        metric: "median_round_size",
        value: size2026,
        unit: "usd",
        cut,
        period: "2026 (through June 30)",
        round,
        locator,
        verification: "primary_verified",
        caveats,
      }),
    ];
  },
);

const SVB_WOMENS_HEALTH: RnpvBenchmark[] = [
  benchmark({
    id: "svb-wh-2026-pre-money-all-2025",
    sourceId: S.svbWomensHealth2026,
    metric: "median_pre_money",
    value: 12.3 * M,
    unit: "usd",
    cut: "All women's health companies (SVB universe)",
    period: "2025",
    locator: "p. 18",
    verification: "primary_verified",
    caveats: [
      "Comparator includes AI-enabled companies; it is not a non-AI cohort.",
    ],
  }),
  benchmark({
    id: "svb-wh-2026-pre-money-ai-2025",
    sourceId: S.svbWomensHealth2026,
    metric: "median_pre_money",
    value: 35.0 * M,
    unit: "usd",
    cut: "AI-enabled women's health companies (SVB universe)",
    period: "2025",
    locator: "p. 18",
    verification: "primary_verified",
  }),
  benchmark({
    id: "svb-wh-2026-vc-total-2024",
    sourceId: S.svbWomensHealth2026,
    metric: "venture_funding_total",
    value: 3_203_000_000,
    unit: "usd",
    cut: "Women's health VC, US and Europe, four sectors",
    period: "2024",
    locator: "p. 12",
    verification: "derived_from_primary",
    derivation:
      "Sum of chart segments: biopharma $1.3B + healthtech $991M + Dx/Tools $362M + device $550M.",
    caveats: ["Biopharma segment is labeled to one decimal ($1.3B)."],
  }),
  benchmark({
    id: "svb-wh-2026-vc-total-2025",
    sourceId: S.svbWomensHealth2026,
    metric: "venture_funding_total",
    value: 1_957_000_000,
    unit: "usd",
    cut: "Women's health VC, US and Europe, four sectors",
    period: "2025",
    locator: "p. 12",
    verification: "derived_from_primary",
    derivation:
      "Sum of chart segments: biopharma $610M + healthtech $513M + Dx/Tools $376M + device $458M.",
    caveats: [
      "p. 13 states 2025 funding of $1.4B without stating scope; the chart total is stored.",
    ],
  }),
  ...(
    [
      ["seed-to-a-2020", "Seed to Series A", "2020 cohort", 0.27],
      ["seed-to-a-2023", "Seed to Series A", "2023 cohort", 0.13],
      ["a-to-b-2019", "Series A to Series B", "2019 cohort", 0.4],
      ["a-to-b-2023", "Series A to Series B", "2023 cohort", 0.19],
    ] as const
  ).map(([key, cut, period, value]) =>
    benchmark({
      id: `svb-wh-2026-graduation-${key}`,
      sourceId: S.svbWomensHealth2026,
      metric: "financing_graduation_rate",
      value,
      unit: "fraction",
      cut: `Women's health companies, ${cut}`,
      period,
      locator: "p. 13",
      verification: "primary_verified",
      caveats: [
        "Financing risk, distinct from clinical success; recent cohorts have shorter observation windows.",
      ],
    })
  ),
];

export const RNPV_BENCHMARKS: readonly RnpvBenchmark[] = [
  ...BIO,
  ...CITELINE,
  ...IQVIA_2025,
  ...IQVIA_2026,
  ...DELOITTE,
  ...JPM_MA,
  ...JPM_LICENSING,
  ...JPM_UPFRONT_SHARE,
  ...SVB_VALUATIONS,
  ...SVB_WOMENS_HEALTH,
];

export const KNOWN_SOURCE_ISSUES: readonly KnownSourceIssue[] = [
  {
    id: "svb-h2-2026-device-exits-duplicate",
    sourceId: S.svbH22026,
    issue:
      "Device Exits (p. 19) repeats the Biopharma Exits chart values exactly, and its footnote refers to biopharma companies.",
    handling: "No device exit counts or values from this edition are stored.",
  },
  {
    id: "iqvia-duration-restatement",
    sourceId: S.iqvia2026,
    issue:
      "Trade-press figures for the 2026 edition give 9.7 and 8.9 years for 2023 and 2024; the 2025 edition gives 9.9 and 9.3.",
    handling:
      "Both stored under their own edition. Do not mix editions in one series.",
  },
  {
    id: "iqvia-2026-productivity-wording",
    sourceId: S.iqvia2026,
    issue:
      "Applied Clinical Trials says productivity improved in 2025; IQVIA's report page says improved productivity was not sustained.",
    handling: "No productivity figure stored; defer to IQVIA's wording.",
  },
  {
    id: "iqvia-composite-misattribution",
    sourceId: S.iqvia2025,
    issue:
      "Secondary posts cite the 7% (2024) composite as coming from the 2026 report.",
    handling: "Stored under the 2025 edition only.",
  },
  {
    id: "svb-wh-2026-funding-scope",
    sourceId: S.svbWomensHealth2026,
    issue:
      "2025 women's-health funding appears as about $2B (chart), $1.4B (p. 13 text), and $1.58B (secondary coverage).",
    handling: "Chart sum stored with its derivation; other figures not stored.",
  },
  {
    id: "bio-oncology-phase3-text-table",
    sourceId: S.bio2021,
    issue:
      "Oncology Phase III rate is 47.7% in the table and 47.5% in the narrative.",
    handling: "Table value stored.",
  },
];

export function getBenchmarkSourceById(
  id: string,
): BenchmarkSource | undefined {
  return BENCHMARK_SOURCES.find((source) => source.id === id);
}

export function getBenchmarksBySource(
  sourceId: string,
): readonly RnpvBenchmark[] {
  return RNPV_BENCHMARKS.filter((b) => b.sourceId === sourceId);
}

/**
 * Benchmarks an analyst may cite without a small-sample warning: reported
 * sample at or above {@link MINIMUM_CITABLE_SAMPLE}, or no sample reported.
 */
export function getCitableBenchmarks(): readonly RnpvBenchmark[] {
  return RNPV_BENCHMARKS.filter(
    (b) => b.n === undefined || b.n >= MINIMUM_CITABLE_SAMPLE,
  );
}

/**
 * rNPV step-up implied by clearing one phase: 1 ÷ that phase's success rate,
 * before time value and remaining cost. Returns undefined outside (0, 1].
 */
export function impliedStepUp(phaseSuccess: number): number | undefined {
  if (!Number.isFinite(phaseSuccess) || phaseSuccess <= 0 || phaseSuccess > 1) {
    return undefined;
  }
  return 1 / phaseSuccess;
}
