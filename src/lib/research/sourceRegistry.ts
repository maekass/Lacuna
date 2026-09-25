/**
 * Canonical research-source registry.
 *
 * Research context and source provenance only. Entries are not model
 * features, valuations, causal evidence, company rankings, clinical
 * guidance, or investment recommendations.
 *
 * Public landing pages only. Report PDFs stay out of the app bundle.
 *
 * Older card copy in `evidenceBoundaries.ts` and `womensHealthScope.ts`
 * remains for existing UI. Prefer this registry for new source-aware work.
 */

import { BIOTHERANOSTICS_SOURCES } from "./biotheranosticsSources";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

export type SourceType =
  | "regulatory"
  | "public_agency"
  | "peer_reviewed"
  | "institutional_secondary"
  | "industry_market_report"
  | "investor_market_report"
  | "company_disclosure"
  | "journalism"
  | "lacuna_dataset";

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

export interface ResearchSource {
  id: string;
  publisher: string;
  title: string;
  publishedAt: string;
  dataCutoff?: string;
  sourceUrl: string;
  sourceType: SourceType;
  geographicScope: string;
  populationScope?: string;
  methodologySummary: string;
  limitations: string[];
  approvedUses: EvidenceUse[];
  prohibitedUses: ProhibitedUse[];
  lastReviewedAt: string;
}

/**
 * Source types that can be primary records. Every other type in this
 * registry is secondary context and must carry prohibited uses.
 */
export const PRIMARY_SOURCE_TYPES = [
  "regulatory",
  "public_agency",
  "peer_reviewed",
  "company_disclosure",
] as const satisfies readonly SourceType[];

const REPORT_PROHIBITED_USES = [
  "clinical_guidance",
  "treatment_recommendation",
  "company_ranking",
  "valuation_input",
  "return_forecast",
  "predictive_model_input",
  "causal_inference",
  "investment_recommendation",
] as const satisfies readonly ProhibitedUse[];

/** Registry review date for entries added in this migration. */
const REVIEWED_AT = "2026-09-24";

/**
 * Same display pattern as the provenance banner:
 * `{datasetVersion} · updated {lastUpdated}`.
 */
function lacunaDatasetPublishedAt(): string {
  const { datasetVersion, lastUpdated } = getStaticVerifiedDataset()
    .provenance;
  const version = datasetVersion && datasetVersion.length > 0
    ? datasetVersion
    : "unversioned";
  return `${version} · updated ${lastUpdated}`;
}

export const RESEARCH_SOURCES: readonly ResearchSource[] = [
  ...BIOTHERANOSTICS_SOURCES.map((source): ResearchSource => ({
    id: source.id,
    publisher: source.publisher,
    title: source.title,
    publishedAt: source.publishedAt ?? "Undated; see access date",
    sourceUrl: source.url,
    sourceType: source.id === "b42-study"
      ? "peer_reviewed"
      : "company_disclosure",
    geographicScope: source.id === "b42-study"
      ? "NSABP B-42 study population; not a global access estimate"
      : "US issuer disclosures and product context; not a geographic access census",
    methodologySummary: source.publicationBasis,
    limitations: [
      source.relationship,
      "Bounded dossier; human specialist review pending. Does not establish patient access or a valuation input.",
    ],
    approvedUses: ["source_provenance", "editorial_context"],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: source.accessedAt,
  })),
  {
    id: "wham-business-case-2026",
    publisher: "WHAM",
    title: "The Business Case for Accelerating Women’s Health Investment",
    publishedAt: "January 2026",
    sourceUrl:
      "https://whamnow.org/news/the-wham-report-womens-health-as-a-catalyst-for-sustainable-healthcare-growth/",
    sourceType: "institutional_secondary",
    geographicScope: "United States",
    populationScope:
      "Women, including conditions that affect women exclusively, differently, or disproportionately",
    methodologySummary:
      "Secondary synthesis of market, clinical, and capital-markets sources used to frame a women’s-health taxonomy and investment-ecosystem context.",
    limitations: [
      "Aggregates multiple underlying sources; not a primary clinical or transaction dataset.",
    ],
    approvedUses: [
      "taxonomy",
      "editorial_context",
      "research_gap_framing",
      "market_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "svb-healthcare-investments-exits-h2-2026",
    publisher: "Silicon Valley Bank",
    title: "Healthcare Investments and Exits H2 2026",
    publishedAt: "August 25, 2026",
    dataCutoff: "June 30, 2026",
    sourceUrl:
      "https://www.svb.com/trends-insights/reports/healthcare-investments-and-exits/",
    sourceType: "industry_market_report",
    geographicScope: "United States and Europe",
    methodologySummary:
      "Time-bound sector funding and exit commentary with the publisher’s healthcare inclusion criteria. The parent landing page is the stable public URL; edition-specific pages are not interchangeable coverage universes.",
    limitations: [
      "Time-bound US/Europe market analysis with sector-specific inclusion criteria; not company scoring data.",
    ],
    approvedUses: [
      "market_context",
      "commercialization_context",
      "exit_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "aoa-dx-follow-the-exits-2026",
    publisher: "AOA Dx",
    title: "Follow the Exits: Why Women’s Health Is a Smart Bet in Healthcare",
    publishedAt: "January 2026",
    sourceUrl: "https://aoadx.com/exit-report/",
    sourceType: "industry_market_report",
    geographicScope: "Publisher-defined women’s-health exit universe",
    methodologySummary:
      "Publisher-defined historical exit research. Cited here only as exit-landscape context.",
    limitations: [
      "Proprietary scope and definitions; not directly comparable with Lacuna’s curated sample.",
    ],
    approvedUses: ["exit_context"],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "mckinsey-womens-health-gap-2024",
    publisher: "McKinsey Health Institute",
    title:
      "Closing the Women’s Health Gap: A $1 Trillion Opportunity to Improve Lives and Economies",
    publishedAt: "January 2024",
    sourceUrl:
      "https://www.mckinsey.com/mhi/our-insights/closing-the-womens-health-gap-a-1-trillion-dollar-opportunity-to-improve-lives-and-economies",
    sourceType: "institutional_secondary",
    geographicScope: "Global",
    populationScope: "Women",
    methodologySummary:
      "Secondary macroeconomic synthesis of women’s health burden and economic context.",
    limitations: [
      "Long-horizon modeled macroeconomic estimate; not company-level evidence.",
    ],
    approvedUses: ["market_context", "editorial_context"],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "mckinsey-blueprint-womens-health-gap-2025",
    publisher: "McKinsey Health Institute",
    title: "A Blueprint to Close the Women’s Health Gap",
    publishedAt: "January 2025",
    sourceUrl:
      "https://www.mckinsey.com/mhi/our-insights/blueprint-to-close-the-womens-health-gap-how-to-improve-lives-and-economies-for-all",
    sourceType: "institutional_secondary",
    geographicScope: "Global",
    populationScope: "Women",
    methodologySummary:
      "Updated secondary synthesis of macro burden and health-gap framing across selected conditions and countries.",
    limitations: [
      "Secondary synthesis; not clinical guidance.",
    ],
    approvedUses: [
      "market_context",
      "research_gap_framing",
      "editorial_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "lux-ai-womens-health-2025",
    publisher: "Lux Capital",
    title: "Unlocking Potential: Artificial Intelligence for Women’s Health",
    publishedAt: "January 8, 2025",
    sourceUrl:
      "https://www.luxcapital.com/news/unlocking-potential-artificial-intelligence-for-womens-health",
    sourceType: "investor_market_report",
    geographicScope: "Global",
    populationScope: "Women",
    methodologySummary:
      "Investor-authored market analysis of AI opportunity and representation risk in women’s health.",
    limitations: [
      "Investor-authored market analysis; not independent clinical evidence.",
    ],
    approvedUses: [
      "editorial_context",
      "research_gap_framing",
      "market_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "amboy-ghost-market-2025",
    publisher: "Amboy Street Ventures",
    title: "The Ghost Market: Neglected Women’s Health Opportunities",
    publishedAt: "2025",
    sourceUrl: "https://www.amboystreet.vc/blog",
    sourceType: "investor_market_report",
    geographicScope: "United States",
    populationScope: "Women",
    methodologySummary:
      "Investor-authored whitespace and opportunity framing for neglected women’s-health areas.",
    limitations: [
      "Investor-authored analysis; “ghost market” value is not a validated TAM or Lacuna metric.",
    ],
    approvedUses: [
      "research_gap_framing",
      "market_context",
      "editorial_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "camber-ief-opportunity-map-progress-2025",
    publisher: "Camber Collective / Innovation Equity Forum",
    title: "Women’s Health Innovation Opportunity Map 2024 Progress Report",
    publishedAt: "January 2025",
    sourceUrl:
      "https://cambercollective.com/2025/01/13/womens-health-innovation-opportunity-map-2024-progress-report/",
    sourceType: "institutional_secondary",
    geographicScope: "Global",
    populationScope: "Women",
    methodologySummary:
      "Qualitative expert assessment and targeted desk review of ecosystem readiness, research gaps, market access, and global R&D context.",
    limitations: [
      "Qualitative expert assessment and targeted desk review; explicitly not a systematic review or comprehensive landscape.",
    ],
    approvedUses: [
      "taxonomy",
      "research_gap_framing",
      "commercialization_context",
    ],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
  {
    id: "lacuna-curated-ma-dataset",
    publisher: "Lacuna",
    title: "Curated Public-Source Women’s Health M&A Dataset",
    publishedAt: lacunaDatasetPublishedAt(),
    sourceUrl: "https://lacuna-maekass.vercel.app",
    sourceType: "lacuna_dataset",
    geographicScope:
      "United States, Europe, and select global fertility platforms",
    methodologySummary:
      "Curated public-source sample of women’s-health M&A for descriptive deal and acquirer exploration. Version and update date follow verified-dataset provenance.",
    limitations: [
      "Curated public-source sample, not a census; coverage varies by disclosure, geography, sector, and scope.",
    ],
    approvedUses: ["source_provenance", "exit_context"],
    prohibitedUses: [...REPORT_PROHIBITED_USES],
    lastReviewedAt: REVIEWED_AT,
  },
];

/** Lookup a canonical research source. Unknown ids return undefined. */
export function getResearchSourceById(
  id: string,
): ResearchSource | undefined {
  return RESEARCH_SOURCES.find((source) => source.id === id);
}
