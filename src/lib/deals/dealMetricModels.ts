import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

/** Disclosed `dealValue` on a verified acquisition (USD millions). */
export const DEAL_VALUE_MODEL: ModelProvenance = {
  module: "src/data/dataset.verified.json",
  exportName: "acquisitions.dealValue",
  definition:
    "Disclosed transaction value in USD millions on the verified acquisition row (filing or press).",
};

/** Cited company `lastKnownValuation` (USD millions), never a deal-price fallback. */
export const LAST_KNOWN_VALUATION_MODEL: ModelProvenance = {
  module: "src/data/dataset.verified.json",
  exportName: "companies.lastKnownValuation",
  definition:
    "Cited lastKnownValuation on the target company row, shown only with valuationSource and only when the figure is distinct from dealValue and preDealValuation. Not a TAM or deal-price fallback.",
};

/** Cited `preDealValuation` on a verified acquisition (USD millions). */
export const PRE_DEAL_VALUATION_MODEL: ModelProvenance = {
  module: "src/data/dataset.verified.json",
  exportName: "acquisitions.preDealValuation",
  definition:
    "Cited pre-deal valuation in USD millions on the verified acquisition row, with preDealValuationSource.",
};

/** Percent premium vs cited pre-deal valuation. */
export const PREMIUM_PERCENT_MODEL: ModelProvenance = {
  module: "src/lib/deals/dealTiming.ts",
  exportName: "premiumPercent",
  definition:
    "(disclosed dealValue / preDealValuation − 1) × 100. Prefers curated computedPremium when present.",
};

/** Price / pre-deal multiple (dealValue ÷ preDealValuation). */
export const PREMIUM_MULTIPLE_MODEL: ModelProvenance = {
  module: "src/lib/deals/dealTiming.ts",
  exportName: "premiumMultiple",
  definition:
    "Disclosed dealValue / preDealValuation. Prefers curated computedPremium when present.",
};

/** UTC calendar days from announcement to close. */
export const CLOSE_DAYS_MODEL: ModelProvenance = {
  module: "src/lib/deals/dealTiming.ts",
  exportName: "closeDurationDays",
  definition:
    "UTC calendar days from announcedDate to closedDate on the verified acquisition row.",
};

/** Candidate deal value relative to the reference deal. */
export const VALUE_RATIO_MODEL: ModelProvenance = {
  module: "src/lib/deals/listComparableDeals.ts",
  exportName: "listComparableDealSets",
  definition:
    "candidate.dealValue / reference.dealValue. Peers require 0.25×–4×; outside that band is clinical adjacency only.",
};
