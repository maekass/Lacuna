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
 * Title stays H2 2026. The public URL is the report hub; the hub may surface
 * a different edition over time.
 */
export const SVB_H2_2026_SOURCE = {
  source: "SVB",
  title: "Healthcare Investments and Exits H2 2026",
  publishedDate: "August 25, 2026",
  dataCutoff: "June 30, 2026",
  scope: "US and Europe healthcare venture and exit context",
  sourceType: "industry market report",
  sourceUrl:
    "https://www.svb.com/trends-insights/reports/healthcare-investments-and-exits/",
} as const;

export const SVB_H2_2026_METHODOLOGY_NOTE =
  "Lacuna’s cited H2 2026 analysis is based on the report published August 25, 2026, with data through June 30, 2026. The public SVB report hub may surface a different edition over time. This source is used only as time-bound sector context, not as a company score, valuation, probability of exit, or investment recommendation.";

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
