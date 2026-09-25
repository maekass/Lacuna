/**
 * Approved, source-scoped research claims.
 *
 * These strings can support editorial context cards. They must not become
 * valuation, prediction, causal, or company-ranking inputs.
 */
import {
  type EvidenceUse,
  type ProhibitedUse as SourceProhibitedUse,
  RESEARCH_SOURCE_IDS,
} from "@/lib/research/sourceRegistry";

export type { EvidenceUse };

/**
 * Source-registry prohibitions plus claim-specific bounds named in review.
 * `company_score`, `prediction`, and `model_performance_claims` stay out of
 * scoring and model-performance copy.
 */
export type ProhibitedUse =
  | SourceProhibitedUse
  | "company_score"
  | "prediction"
  | "model_performance_claims";

export type ClaimScope = {
  geography?: string;
  period?: string;
  population?: string;
  sector?: string;
  methodologyBoundary?: string;
};

export interface ResearchClaim {
  id: string;
  sourceId: string;
  claim: string;
  claimType:
    | "taxonomy"
    | "ecosystem_gap"
    | "market_context"
    | "commercialization_context"
    | "exit_context"
    | "data_governance_context"
    | "methodology_boundary";
  scope: ClaimScope;
  approvedUses: EvidenceUse[];
  prohibitedUses: ProhibitedUse[];
  displayPriority: "primary" | "secondary";
  lastReviewedAt: string;
}

const REVIEWED_AT = "2026-09-24";

/**
 * Valuation and prediction stays blocked on every report-derived claim,
 * including claims whose review notes name a narrower prohibition list.
 */
const VALUATION_AND_PREDICTION = [
  "valuation_input",
  "predictive_model_input",
] as const satisfies readonly ProhibitedUse[];

export const RESEARCH_CLAIMS: readonly ResearchClaim[] = [
  {
    id: "wham-taxonomy-conditions-affecting-women",
    sourceId: RESEARCH_SOURCE_IDS.wham2026,
    claim:
      "Women's health can include conditions affecting women exclusively, disproportionately, or differently.",
    claimType: "taxonomy",
    scope: {},
    approvedUses: ["taxonomy", "editorial_context"],
    prohibitedUses: [
      "company_ranking",
      ...VALUATION_AND_PREDICTION,
    ],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "wham-sex-stratified-evidence-considerations",
    sourceId: RESEARCH_SOURCE_IDS.wham2026,
    claim:
      "Sex-stratified research, representation, and data quality are relevant evidence considerations across research, product development, and AI-enabled health innovation.",
    claimType: "data_governance_context",
    scope: {},
    approvedUses: ["research_gap_framing", "data_governance_context"],
    prohibitedUses: [
      "clinical_guidance",
      "company_ranking",
      ...VALUATION_AND_PREDICTION,
    ],
    displayPriority: "secondary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "svb-h1-2026-capital-concentration",
    sourceId: RESEARCH_SOURCE_IDS.svbH22026,
    claim:
      "Healthcare investment in H1 2026 was concentrated in fewer companies, with capital favoring tangible clinical or commercial progress.",
    claimType: "commercialization_context",
    scope: {
      geography: "US and Europe",
      period: "H1 2026",
      methodologyBoundary: "Data through June 30, 2026",
    },
    approvedUses: ["market_context", "commercialization_context"],
    prohibitedUses: [
      "company_ranking",
      "valuation_input",
      "prediction",
      "predictive_model_input",
    ],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "svb-h1-2026-diagnostics-tools-pressure",
    sourceId: RESEARCH_SOURCE_IDS.svbH22026,
    claim:
      "Diagnostics and tools faced continued reimbursement and commercialization pressure in H1 2026.",
    claimType: "commercialization_context",
    scope: {
      geography: "US and Europe",
      period: "H1 2026",
      sector: "Diagnostics and tools",
      methodologyBoundary: "Data through June 30, 2026",
    },
    approvedUses: ["commercialization_context"],
    prohibitedUses: [
      "company_score",
      ...VALUATION_AND_PREDICTION,
    ],
    displayPriority: "secondary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "svb-h1-2026-exit-conditions-differ-by-sector",
    sourceId: RESEARCH_SOURCE_IDS.svbH22026,
    claim:
      "Exit conditions differed materially across biopharma, healthtech, diagnostics/tools, and device sectors.",
    claimType: "exit_context",
    scope: {
      geography: "US and Europe",
      period: "H1 2026",
      methodologyBoundary: "Data through June 30, 2026",
    },
    approvedUses: ["exit_context"],
    prohibitedUses: [
      "predictive_model_input",
      "return_forecast",
      "valuation_input",
    ],
    displayPriority: "secondary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "aoa-dx-separate-exit-research-universe",
    sourceId: RESEARCH_SOURCE_IDS.aoaDx2026,
    claim:
      "Historical women's-health exit research should be interpreted as a separate research universe with its own inclusion criteria and methods.",
    claimType: "methodology_boundary",
    scope: {
      methodologyBoundary:
        "Separate inclusion criteria and methods from Lacuna's curated sample",
    },
    approvedUses: ["exit_context", "source_provenance"],
    prohibitedUses: [...VALUATION_AND_PREDICTION],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "camber-ief-ecosystem-constraints",
    sourceId: RESEARCH_SOURCE_IDS.camberIef2025,
    claim:
      "Women's-health innovation progress is constrained by data/accountability gaps, market-access barriers, fragmented funding, and uneven ecosystem coordination.",
    claimType: "ecosystem_gap",
    scope: {
      geography: "Global ecosystem",
      methodologyBoundary: "Qualitative expert assessment",
    },
    approvedUses: ["research_gap_framing", "editorial_context"],
    prohibitedUses: [
      "company_ranking",
      "valuation_input",
      "causal_inference",
      "predictive_model_input",
    ],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "camber-ief-market-pathways-separate-from-need",
    sourceId: RESEARCH_SOURCE_IDS.camberIef2025,
    claim:
      "Market pathways, reimbursement/access, and product-introduction systems should be assessed separately from unmet clinical need.",
    claimType: "commercialization_context",
    scope: {
      geography: "Global",
      population: "Especially relevant for LMIC access",
    },
    approvedUses: ["commercialization_context", "research_gap_framing"],
    prohibitedUses: [
      "company_score",
      "investment_recommendation",
      ...VALUATION_AND_PREDICTION,
    ],
    displayPriority: "secondary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "camber-ief-opportunity-map-not-a-measurement",
    sourceId: RESEARCH_SOURCE_IDS.camberIef2025,
    claim:
      "Opportunity Map progress and achievement percentages are qualitative, illustrative expert-assessment outputs and must not be treated as objective measurements or imported as Lacuna scores.",
    claimType: "methodology_boundary",
    scope: {
      geography: "Global ecosystem",
      methodologyBoundary:
        "Qualitative, illustrative expert-assessment outputs; not objective measurements or Lacuna scores",
    },
    approvedUses: ["source_provenance"],
    prohibitedUses: [
      "company_ranking",
      "valuation_input",
      "predictive_model_input",
      "causal_inference",
    ],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "lux-ai-representation-and-validation",
    sourceId: RESEARCH_SOURCE_IDS.luxCapital2025,
    claim:
      "AI opportunities in women's health include diagnosis, treatment, access, and research; representative data and validation are important to avoid embedding historical bias.",
    claimType: "data_governance_context",
    scope: {},
    approvedUses: ["editorial_context", "data_governance_context"],
    prohibitedUses: [
      "clinical_guidance",
      "model_performance_claims",
      ...VALUATION_AND_PREDICTION,
    ],
    displayPriority: "primary",
    lastReviewedAt: REVIEWED_AT,
  },
];

/** Claims whose `sourceId` matches the registry source. */
export function getClaimsBySourceId(
  sourceId: string,
): readonly ResearchClaim[] {
  return RESEARCH_CLAIMS.filter((claim) => claim.sourceId === sourceId);
}

/** Claims of one claim type. */
export function getClaimsByType(
  claimType: ResearchClaim["claimType"],
): readonly ResearchClaim[] {
  return RESEARCH_CLAIMS.filter((claim) => claim.claimType === claimType);
}

/** Claims approved for one evidence use. */
export function getClaimsForUse(
  use: EvidenceUse,
): readonly ResearchClaim[] {
  return RESEARCH_CLAIMS.filter((claim) => claim.approvedUses.includes(use));
}
