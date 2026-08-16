import { labelResearchContextTier } from "@/lib/research/heuristicProvenance";

const CITED_CLASS = "border-emerald-200 bg-emerald-50 text-emerald-800";
const AFFINITY_CLASS = "border-sky-200 bg-sky-50 text-sky-800";
const CONTEXT_CLASS = "border-amber-200 bg-amber-50 text-amber-900";

function styleForTier(tier: string): string {
  if (tier.startsWith("cited_")) return CITED_CLASS;
  if (tier === "illustrative_static" || tier === "derived_static") {
    return CONTEXT_CLASS;
  }
  return AFFINITY_CLASS;
}

/**
 * Compact cited_* / affinity / honest-context label for research and
 * intelligence panels. Not a dual-source or deal-economics badge.
 */
export default function HeuristicTierBadge({
  tier,
  label,
}: {
  tier: string;
  label?: string;
}) {
  const text = label ?? labelResearchContextTier(tier);
  const style = styleForTier(tier);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}
    >
      {text}
    </span>
  );
}
