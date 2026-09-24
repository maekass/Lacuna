/**
 * Canonical research-source identifiers.
 *
 * Editorial claims may cite these ids. The ids are provenance keys only.
 * They are not model features, valuations, or company ranks.
 */

export type EvidenceUse =
  | "editorial_context"
  | "taxonomy"
  | "research_gap_framing"
  | "market_context"
  | "commercialization_context"
  | "exit_context"
  | "data_governance_context"
  | "source_provenance";

export type ProhibitedUse =
  | "clinical_guidance"
  | "treatment_recommendation"
  | "company_ranking"
  | "valuation_input"
  | "return_forecast"
  | "predictive_model_input"
  | "causal_inference"
  | "investment_recommendation";

/** Stable ids for the reports this registry is allowed to cite. */
export const RESEARCH_SOURCE_IDS = {
  wham2026: "wham-business-case-2026",
  svbH22026: "svb-healthcare-investments-exits-h2-2026",
  aoaDx2026: "aoa-dx-follow-the-exits-2026",
  camberIef2025: "camber-ief-opportunity-map-2025",
  luxCapital2025: "lux-ai-womens-health-2025",
} as const;

export type ResearchSourceId =
  (typeof RESEARCH_SOURCE_IDS)[keyof typeof RESEARCH_SOURCE_IDS];

export interface ResearchSourceLink {
  readonly id: ResearchSourceId;
  readonly publisher: string;
  readonly title: string;
}

const RESEARCH_SOURCES: readonly ResearchSourceLink[] = [
  {
    id: RESEARCH_SOURCE_IDS.wham2026,
    publisher: "WHAM",
    title: "The Business Case for Accelerating Women's Health Investment",
  },
  {
    id: RESEARCH_SOURCE_IDS.svbH22026,
    publisher: "Silicon Valley Bank",
    title: "Healthcare Investments and Exits H2 2026",
  },
  {
    id: RESEARCH_SOURCE_IDS.aoaDx2026,
    publisher: "AOA Dx",
    title: "Follow the Exits: Why Women's Health Is a Smart Bet in Healthcare",
  },
  {
    id: RESEARCH_SOURCE_IDS.camberIef2025,
    publisher: "Camber Collective / Innovation Equity Forum",
    title: "Women's Health Innovation Opportunity Map 2024 Progress Report",
  },
  {
    id: RESEARCH_SOURCE_IDS.luxCapital2025,
    publisher: "Lux Capital",
    title: "Unlocking Potential: Artificial Intelligence for Women's Health",
  },
];

const SOURCES_BY_ID: ReadonlyMap<string, ResearchSourceLink> = new Map(
  RESEARCH_SOURCES.map((source) => [source.id, source]),
);

/** Source link for a registry id, or undefined when the id is unknown. */
export function getResearchSourceById(
  id: string,
): ResearchSourceLink | undefined {
  return SOURCES_BY_ID.get(id);
}
