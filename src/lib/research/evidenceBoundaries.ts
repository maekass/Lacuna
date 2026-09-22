/**
 * Exact user-visible boundary copy for evidence-scope panels.
 * Calculations and deal records stay unchanged; these strings only frame use.
 */

/** Shown beside exit-similarity and acquirer-fit outputs. */
export const DETERMINISTIC_COMPARISON_BOUNDARY =
  "These outputs are deterministic, descriptive comparisons built from a curated public-source sample. They are not fitted predictive models, calibrated acquisition probabilities, company valuations, or investment recommendations.";

/** Shown on burden–capital opportunity context views. */
export const BURDEN_CAPITAL_OPPORTUNITY_DISCLOSURE =
  "This view compares sourced population-level burden and historical funding context. It is a transparent research heuristic for identifying diligence questions; it does not estimate enterprise value, clinical benefit, commercial success, investment returns, or probability of exit.";

/** Shown where AOA Dx, SVB, and Lacuna are placed side by side. */
export const COMPLEMENTARY_SOURCE_UNIVERSE_NOTE =
  "These sources are complementary context sets and are not directly comparable as counts, values, returns, or coverage universes.";

/** Sector-level diagnostics and tools note. Not a company assessment. */
export const DIAGNOSTICS_TOOLS_SECTOR_CONTEXT =
  "Diagnostics and tools can address high-value clinical gaps, but reimbursement, adoption, clinical utility, and commercialization evidence remain key diligence considerations.";

/**
 * SVB sector-context fields.
 * The required report title stays H2 2026 with a June 30, 2026 cutoff.
 * The public Healthcare Investments and Exits landing page currently
 * published is the H1 2026 edition; State of the Markets H2 2026 is the
 * page that documents the June 30, 2026 cutoff.
 */
export const SVB_H2_2026_SOURCE = {
  source: "SVB",
  title: "Healthcare Investments and Exits H2 2026",
  publishedDate: "H2 2026",
  dataCutoff: "June 30, 2026",
  scope:
    "current sector-level healthcare funding and exit context, time-bound to H1 2026 data",
  sourceType: "cited sector report",
  sourceUrl:
    "https://www.svb.com/trends-insights/reports/healthcare-investments-and-exits/h1-2026/",
} as const;

export const SVB_STATE_OF_THE_MARKETS_H2_2026_URL =
  "https://www.svb.com/trends-insights/reports/state-of-the-markets-report/";

export const SVB_H2_2026_METHODOLOGY_NOTE =
  "The public SVB Healthcare Investments and Exits landing page currently published is the H1 2026 edition. The June 30, 2026 data cutoff is documented on SVB's State of the Markets H2 2026 page. Those pages are complementary SVB context, not interchangeable counts or coverage universes.";

export const WEF_BCG_SOURCE = {
  source: "World Economic Forum and Boston Consulting Group",
  title: "Women's Health Investment Outlook 2026",
  publishedDate: "2026",
  scope: "women's-health funding and burden context",
  sourceType: "cited external research report",
  lacunaUse: "descriptive research context",
  prohibitedUses: [
    "enterprise valuation",
    "return forecasts",
    "predictive model inputs",
  ],
  sourceUrl:
    "https://reports.weforum.org/docs/WEF_Womens_Health_Investment_Outlook_2026.pdf",
} as const;

export const AOA_DX_EXITS_SOURCE = {
  source: "AOA Dx",
  title: "Follow the Exits",
  publishedDate: "January 2026",
  scope:
    "broad historical women's-health exit research universe with its own definitions and methods",
  sourceType: "cited exit research",
} as const;

export const LACUNA_CURATED_SAMPLE_SOURCE = {
  source: "Lacuna",
  title: "Curated public-source dataset",
  scope: "curated public-source M&A sample, not a census",
  sourceType: "curated public-source sample",
} as const;
