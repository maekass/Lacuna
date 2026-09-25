/**
 * Qualitative ecosystem-readiness diligence questions.
 *
 * Camber Collective / Innovation Equity Forum (IEF) Opportunity Map 2023,
 * WHAM, and SVB supply context for what to ask. This module does not score,
 * rank, value, or classify companies, acquirers, or verified deals.
 */

import { SVB_H2_2026_SOURCE } from "@/lib/research/evidenceBoundaries";
import { WHAM_BUSINESS_CASE_SOURCE } from "@/lib/research/womensHealthScope";

/** Qualitative diligence state. The union order is not a scale. */
export type ReadinessStatus =
  | "supported"
  | "emerging"
  | "fragmented"
  | "unknown"
  | "not-applicable";

export type EcosystemReadinessDimension =
  | "clinical_burden_evidence"
  | "sex_gender_intentional_evidence"
  | "data_infrastructure"
  | "regulatory_pathway"
  | "reimbursement_and_access"
  | "product_maturity"
  | "market_pathway"
  | "ecosystem_coordination";

export type EcosystemReadinessSourceId =
  | "camber-ief-opportunity-map-2023"
  | "wham-business-case-january-2026"
  | "svb-healthcare-investments-exits-h2-2026";

export interface EcosystemReadinessDefinition {
  id: EcosystemReadinessDimension;
  label: string;
  question: string;
  description: string;
  evidenceExamples: string[];
  prohibitedInterpretations: string[];
  sourceIds: EcosystemReadinessSourceId[];
}

export interface EcosystemReadinessSource {
  id: EcosystemReadinessSourceId;
  label: string;
  url: string;
  /** Themes this source may inform. Not a weight or coverage claim. */
  supports: readonly string[];
  prohibitedUses: readonly string[];
}

/** Sentence required on every dimension. */
export const DILIGENCE_FRAMEWORK_NOTE =
  "This dimension is a diligence framework, not a score.";

/**
 * Status identifiers for iteration. Sequence is stable storage order,
 * not quality, priority, or rank.
 */
export const READINESS_STATUSES = [
  "supported",
  "emerging",
  "fragmented",
  "unknown",
  "not-applicable",
] as const satisfies readonly ReadinessStatus[];

const READINESS_STATUS_LABELS: Record<ReadinessStatus, string> = {
  supported: "Supported",
  emerging: "Emerging",
  fragmented: "Fragmented",
  unknown: "Unknown",
  "not-applicable": "Not applicable",
};

export const ECOSYSTEM_READINESS_DIMENSIONS = [
  "clinical_burden_evidence",
  "sex_gender_intentional_evidence",
  "data_infrastructure",
  "regulatory_pathway",
  "reimbursement_and_access",
  "product_maturity",
  "market_pathway",
  "ecosystem_coordination",
] as const satisfies readonly EcosystemReadinessDimension[];

const NOT_APPLIED =
  "Not applied to Lacuna companies, acquirers, or verified deals in this release.";

const SHARED_PROHIBITIONS = [
  "Reading the dimension as a numeric score, weight, letter grade, star rating, or color-coded investor recommendation.",
  "Combining dimensions into a composite result or ordering contexts from strongest to weakest.",
  "Inferring that a status causes clinical benefit, adoption, funding, valuation, or scale.",
] as const;

export const ECOSYSTEM_READINESS_SOURCES: Record<
  EcosystemReadinessSourceId,
  EcosystemReadinessSource
> = {
  "camber-ief-opportunity-map-2023": {
    id: "camber-ief-opportunity-map-2023",
    label:
      "Innovation Equity Forum, Women's Health Innovation Opportunity Map 2023, prepared with support from Camber Collective for the Bill & Melinda Gates Foundation and the National Institutes of Health",
    url:
      "https://orwh.od.nih.gov/sites/orwh/files/docs/womens-health-rnd-opportunity-map_2023_508.pdf",
    supports: [
      "data infrastructure",
      "innovation introduction",
      "market pathway",
      "social and structural determinants of health",
      "ecosystem coordination",
    ],
    prohibitedUses: [
      "Reusing the Opportunity Map prioritization exercise as a Lacuna score.",
      "Treating a listed opportunity as measured evidence for a specific company or product.",
    ],
  },
  "wham-business-case-january-2026": {
    id: "wham-business-case-january-2026",
    label: WHAM_BUSINESS_CASE_SOURCE.label,
    url: WHAM_BUSINESS_CASE_SOURCE.url ?? "",
    supports: [
      "sex-specific evidence",
      "research gaps",
    ],
    prohibitedUses: [
      "Using WHAM context as a company classification, valuation input, or deal-economics field.",
    ],
  },
  "svb-healthcare-investments-exits-h2-2026": {
    id: "svb-healthcare-investments-exits-h2-2026",
    label: `${SVB_H2_2026_SOURCE.source}, ${SVB_H2_2026_SOURCE.title}`,
    url: SVB_H2_2026_SOURCE.sourceUrl,
    supports: [
      "commercialization context",
      "sector market context",
    ],
    prohibitedUses: [
      "Treating sector funding or exit context as coverage, approval, or a company valuation.",
      "Comparing SVB counts directly with Lacuna's curated sample.",
    ],
  },
};

function definition(
  id: EcosystemReadinessDimension,
  label: string,
  question: string,
  description: string,
  evidenceExamples: string[],
  prohibitedInterpretations: string[],
  sourceIds: EcosystemReadinessSourceId[],
): EcosystemReadinessDefinition {
  return {
    id,
    label,
    question,
    description: `${description} ${DILIGENCE_FRAMEWORK_NOTE} ${NOT_APPLIED}`,
    evidenceExamples,
    prohibitedInterpretations: [
      ...SHARED_PROHIBITIONS,
      ...prohibitedInterpretations,
    ],
    sourceIds,
  };
}

export const ECOSYSTEM_READINESS_DEFINITIONS: Record<
  EcosystemReadinessDimension,
  EcosystemReadinessDefinition
> = {
  clinical_burden_evidence: definition(
    "clinical_burden_evidence",
    "Clinical burden evidence",
    "Is there reliable evidence of disease burden, diagnostic delay, or unmet need for the population and context in question?",
    "Asks whether cited sources document burden, diagnostic delay, or unmet need for a stated population and context. Camber/IEF data-and-modeling and social-and-structural-determinant topics frame burden metrics and the conditions in which need is experienced. WHAM frames sex-specific evidence and research gaps around that question.",
    [
      "A cited epidemiology or burden review that names the population, geography, and condition.",
      "A public source describing diagnostic delay or a care-pathway gap for that context.",
      "A sourced statement of unmet need that does not substitute a market-size figure.",
    ],
    [
      "Estimating burden, market size, or return from the status.",
      "Filling a missing burden figure with a modeled or rule-of-thumb value.",
    ],
    [
      "camber-ief-opportunity-map-2023",
      "wham-business-case-january-2026",
    ],
  ),
  sex_gender_intentional_evidence: definition(
    "sex_gender_intentional_evidence",
    "Sex- and gender-intentional evidence",
    "Do the research, trial, product, or real-world evidence sources report sex- and gender-relevant representation or analysis?",
    "Asks whether research, trial, product, or real-world evidence reports sex- and gender-relevant representation or analysis. WHAM is the source for sex-specific evidence and research gaps. Camber/IEF research-design context is complementary background on intentional inclusion, not a compliance determination.",
    [
      "A study or trial report that states how sex and gender were included and analyzed.",
      "A product or labeling source that reports sex- or gender-relevant results.",
      "An explicit note that representation or analysis is absent from the cited sources.",
    ],
    [
      "Treating missing sex or gender analysis as a penalty.",
      "Inferring safety, benefit, or commercial success from representation alone.",
      "Using the status as a women's-health classification of a Lacuna company or deal.",
    ],
    [
      "wham-business-case-january-2026",
      "camber-ief-opportunity-map-2023",
    ],
  ),
  data_infrastructure: definition(
    "data_infrastructure",
    "Data infrastructure",
    "Are relevant data repositories, registries, biobanks, common data elements, or interoperable sources available and fit for the intended use?",
    "Asks whether repositories, registries, biobanks, common data elements, or interoperable sources exist and fit the intended use. Camber/IEF data-and-modeling and innovation-introduction topics are the primary context for data infrastructure, including repositories meant to support product introduction.",
    [
      "A named registry, biobank, or repository with its access conditions and population described.",
      "A cited common-data-element or interoperability specification tied to the intended use.",
      "Documentation that a needed source is missing or unfit for the stated purpose.",
    ],
    [
      "Equating existence of a dataset with fitness for a specific analysis.",
      "Treating an Opportunity Map priority as a measured infrastructure gap for a company.",
    ],
    ["camber-ief-opportunity-map-2023"],
  ),
  regulatory_pathway: definition(
    "regulatory_pathway",
    "Regulatory pathway",
    "Is there a plausible and documented regulatory pathway, including relevant evidence expectations?",
    "Asks whether a documented regulatory pathway and its evidence expectations are on record. Camber/IEF regulatory and science-policy topics, together with innovation-introduction attention to regulatory review, frame the question.",
    [
      "Cited agency guidance or a documented precedent for the product type and geography.",
      "A public description of the evidence a pathway expects.",
      "An explicit statement that the pathway or evidence expectation is not yet documented.",
    ],
    [
      "Predicting authorization or a review timeline.",
      "Reading a documented pathway as a probability of success.",
    ],
    ["camber-ief-opportunity-map-2023"],
  ),
  reimbursement_and_access: definition(
    "reimbursement_and_access",
    "Reimbursement and access",
    "Is there a credible coverage, payment, procurement, affordability, or distribution pathway?",
    "Asks whether coverage, payment, procurement, affordability, or distribution is documented for the stated context. Camber/IEF innovation introduction and market-shaping topics supply the pathway questions. SVB supplies commercialization and sector market context and does not establish coverage.",
    [
      "A cited coverage policy, payment route, or procurement pathway for the context.",
      "A sourced description of affordability or distribution constraints.",
      "An explicit gap when no coverage or procurement pathway is on record.",
    ],
    [
      "Inferring coverage from sector funding or exit context.",
      "Estimating price, budget impact, or cost-effectiveness.",
    ],
    [
      "camber-ief-opportunity-map-2023",
      "svb-healthcare-investments-exits-h2-2026",
    ],
  ),
  product_maturity: definition(
    "product_maturity",
    "Product maturity",
    "Is the solution at a documented research, clinical, regulatory, or commercial stage?",
    "Asks whether a solution's research, clinical, regulatory, or commercial stage is documented. SVB commercialization and sector market context, and Camber/IEF innovation-introduction context, indicate the kinds of stage evidence to look for.",
    [
      "A cited description of research, clinical, regulatory, or commercial status.",
      "A public record that names a stage without converting that stage into a number.",
      "An explicit unknown when stage evidence was not found.",
    ],
    [
      "Converting stage into a maturity rating.",
      "Ordering solutions by stage.",
      "Inferring valuation, exit likelihood, or clinical benefit from stage.",
    ],
    [
      "svb-healthcare-investments-exits-h2-2026",
      "camber-ief-opportunity-map-2023",
    ],
  ),
  market_pathway: definition(
    "market_pathway",
    "Market pathway",
    "Are adoption, implementation, supply, provider, payer, employer, procurement, or market-entry conditions understood?",
    "Asks whether adoption, implementation, supply, provider, payer, employer, procurement, or market-entry conditions are described by cited sources. Camber/IEF innovation introduction and market-shaping topics are the primary market-pathway context. SVB adds sector-level commercialization context and is not a market-entry finding for any company.",
    [
      "A cited description of who adopts, supplies, pays, or procures in the stated setting.",
      "Documented market-entry conditions such as distribution or provider workflow constraints.",
      "An explicit statement that those conditions are not yet understood.",
    ],
    [
      "Estimating market size, share, or revenue.",
      "Treating sector exit or funding context as evidence that a pathway exists for a specific solution.",
    ],
    [
      "camber-ief-opportunity-map-2023",
      "svb-healthcare-investments-exits-h2-2026",
    ],
  ),
  ecosystem_coordination: definition(
    "ecosystem_coordination",
    "Ecosystem coordination",
    "Are there credible partnerships, research networks, policy mechanisms, or implementation coalitions supporting translation and scale?",
    "Asks whether partnerships, research networks, policy mechanisms, or implementation coalitions are documented. Camber/IEF ecosystem coordination, including the call for cross-sector partnership and attention to social and structural determinants, is the primary context.",
    [
      "A cited network, consortium, policy mechanism, or implementation coalition relevant to the question.",
      "A description of partner roles that does not claim those partners caused an outcome.",
      "An explicit fragmented or unknown status when coordination is partial or undocumented.",
    ],
    [
      "Inferring that a named partnership produces translation, scale, or health outcomes.",
      "Treating the Opportunity Map itself as proof that coordination exists for a specific context.",
    ],
    ["camber-ief-opportunity-map-2023"],
  ),
};

/** Metadata for one diligence dimension. Does not assess any company. */
export function getReadinessDefinition(
  id: EcosystemReadinessDimension,
): EcosystemReadinessDefinition {
  return ECOSYSTEM_READINESS_DEFINITIONS[id];
}

/** Display label for a qualitative status. */
export function getReadinessStatusLabel(status: ReadinessStatus): string {
  return READINESS_STATUS_LABELS[status];
}

/** All dimension definitions in identifier order, which is not a ranking. */
export function listReadinessDefinitions(): readonly EcosystemReadinessDefinition[] {
  return ECOSYSTEM_READINESS_DIMENSIONS.map(
    (id) => ECOSYSTEM_READINESS_DEFINITIONS[id],
  );
}
