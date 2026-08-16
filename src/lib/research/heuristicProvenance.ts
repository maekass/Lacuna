/**
 * Research and intelligence heuristics may stay on those workspaces when
 * labeled `cited_*` or `affinity`. They must not feed deal economics,
 * valuation peers, or dual-source badges.
 */

/** Cited external research (WEF, HLTH, CDC, CMS, AOA Dx, etc.). */
export type CitedProvenanceTier = `cited_${string}`;

/** Heuristic portfolio / sector / keyword join — research/intelligence only. */
export type AffinityProvenanceTier = "affinity" | "heuristic_affinity";

export type ResearchHeuristicTier =
  | CitedProvenanceTier
  | AffinityProvenanceTier;

/**
 * Honest context allowed on `/research` and `/intelligence`.
 * `illustrative_static` / `derived_static` are not heuristics presented as
 * measured deal data.
 */
export type ResearchContextTier =
  | ResearchHeuristicTier
  | "illustrative_static"
  | "derived_static";

export const AFFINITY_TIER_LABELS: Record<AffinityProvenanceTier, string> = {
  affinity: "Affinity (heuristic)",
  heuristic_affinity: "Portfolio crosswalk (heuristic)",
};

export const CONTEXT_TIER_LABELS: Record<
  "illustrative_static" | "derived_static",
  string
> = {
  illustrative_static: "Illustrative context",
  derived_static: "Derived (static)",
};

export const RESEARCH_HEURISTIC_DISCLAIMER =
  "Cited research and affinity heuristics stay on /research and /intelligence. They do not feed deal economics, valuation peers, or dual-source badges.";

/** True when a data-tier string is a cited_* or affinity heuristic label. */
export function isCitedOrAffinityTier(tier: string): boolean {
  return (
    tier.startsWith("cited_") ||
    tier === "affinity" ||
    tier === "heuristic_affinity"
  );
}

/** True when a research/intelligence row uses an allowed provenance label. */
export function isAllowedResearchContextTier(tier: string): boolean {
  return (
    isCitedOrAffinityTier(tier) ||
    tier === "illustrative_static" ||
    tier === "derived_static"
  );
}

/** Display label for a research/intelligence provenance tier. */
export function labelResearchContextTier(tier: string): string {
  if (tier in AFFINITY_TIER_LABELS) {
    return AFFINITY_TIER_LABELS[tier as AffinityProvenanceTier];
  }
  if (tier in CONTEXT_TIER_LABELS) {
    return CONTEXT_TIER_LABELS[tier as keyof typeof CONTEXT_TIER_LABELS];
  }
  if (tier.startsWith("cited_")) {
    return `Cited (${tier.replace(/^cited_/, "").replace(/_/g, " ")})`;
  }
  return tier;
}
