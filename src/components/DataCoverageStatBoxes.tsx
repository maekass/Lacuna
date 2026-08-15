import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import {
  COVERAGE_STAT_MODELS,
  type EffectiveNBadges,
} from "@/lib/data/datasetCoverageStats";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

const tierStyles: Record<EffectiveNBadges["network"]["tier"], string> = {
  insufficient: "bg-red-50 text-red-700 border-red-200",
  low: "bg-amber-50 text-amber-800 border-amber-200",
  medium: "bg-sky-50 text-sky-800 border-sky-200",
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function EffectiveNBadge({
  title,
  badge,
}: {
  title: string;
  badge: EffectiveNBadges[keyof EffectiveNBadges];
}) {
  return (
    <ModelProvenanceHint model={COVERAGE_STAT_MODELS.effectiveN}>
      <div
        className={`cursor-help rounded-lg border p-3 ${
          tierStyles[badge.tier]
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          {title}
        </p>
        <p className="text-sm font-semibold mt-1">{badge.label}</p>
        <p className="text-[11px] mt-1 capitalize">
          Power: {badge.tier.replace("_", " ")}
        </p>
      </div>
    </ModelProvenanceHint>
  );
}

export function CoverageStatBox({
  value,
  label,
  model,
}: {
  value: string | number;
  label: string;
  model: ModelProvenance;
}) {
  return (
    <ModelProvenanceHint model={model}>
      <div className="cursor-help rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/40 p-3">
        <p className="text-2xl font-bold text-lacuna-plum">{value}</p>
        <p className="text-xs text-lacuna-blue mt-1">{label}</p>
      </div>
    </ModelProvenanceHint>
  );
}
