import {
  AFFINITY_TIER_LABELS,
  type AffinityProvenanceTier,
  isCitedOrAffinityTier,
} from "@/lib/research/heuristicProvenance";

const CITED_CLASS = "border-emerald-200 bg-emerald-50 text-emerald-800";
const AFFINITY_CLASS = "border-sky-200 bg-sky-50 text-sky-800";

/**
 * Compact cited_* / affinity label for research and intelligence panels.
 */
export default function HeuristicTierBadge({
  tier,
  label,
}: {
  tier: string;
  label?: string;
}) {
  const text = label ??
    (tier in AFFINITY_TIER_LABELS
      ? AFFINITY_TIER_LABELS[tier as AffinityProvenanceTier]
      : tier.startsWith("cited_")
      ? `Cited (${tier.replace(/^cited_/, "").replace(/_/g, " ")})`
      : tier);
  const style = isCitedOrAffinityTier(tier) && tier.startsWith("cited_")
    ? CITED_CLASS
    : AFFINITY_CLASS;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}
    >
      {text}
    </span>
  );
}
