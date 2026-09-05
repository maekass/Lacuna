import Metric from "@/components/Metric";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import {
  COVERAGE_STAT_MODELS,
  type DisclosureStats,
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
  value: number;
  label: string;
  model: ModelProvenance;
}) {
  return (
    <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/40 p-3">
      <p className="text-2xl font-bold text-lacuna-plum">
        <Metric
          label={label}
          className="text-2xl font-bold text-lacuna-plum"
          provenance={{ kind: "assumption", value, model }}
        />
      </p>
      <p className="text-xs text-lacuna-blue mt-1">{label}</p>
    </div>
  );
}

export function CoverageRateTiles({
  stats,
  yearRange,
  sectorsWithDeals,
}: {
  stats: DisclosureStats;
  yearRange: string;
  sectorsWithDeals: number;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      <div className="rounded-md bg-lacuna-pink/10 border border-lacuna-lavender/30 px-3 py-2">
        <span className="text-lacuna-blue">Valuation coverage</span>
        <p className="font-semibold text-lacuna-plum mt-0.5">
          <Metric
            label="Companies with last-known valuation"
            className="font-semibold text-lacuna-plum"
            provenance={{
              kind: "assumption",
              value: stats.companiesWithValuation,
              model: COVERAGE_STAT_MODELS.valuationCoverage,
            }}
          />
          {`/${stats.companiesTotal} companies (`}
          <Metric
            label="Valuation coverage rate"
            className="font-semibold text-lacuna-plum"
            provenance={{
              kind: "assumption",
              value: stats.valuationRate,
              model: COVERAGE_STAT_MODELS.valuationCoverage,
            }}
            formatValue={(rate) => `${(rate * 100).toFixed(0)}%`}
          />
          )
        </p>
      </div>
      <div className="rounded-md bg-lacuna-pink/10 border border-lacuna-lavender/30 px-3 py-2">
        <span className="text-lacuna-blue">Price disclosure rate</span>
        <p className="font-semibold text-lacuna-plum mt-0.5">
          <Metric
            label="Price disclosure rate"
            className="font-semibold text-lacuna-plum"
            provenance={{
              kind: "assumption",
              value: stats.disclosureRate,
              model: COVERAGE_STAT_MODELS.disclosureRate,
            }}
            formatValue={(rate) => `${(rate * 100).toFixed(0)}%`}
          />{" "}
          {`(${stats.dealsWithValueNote} with notes)`}
        </p>
      </div>
      <div className="rounded-md bg-lacuna-pink/10 border border-lacuna-lavender/30 px-3 py-2">
        <span className="text-lacuna-blue">Deal years</span>
        <p className="font-semibold text-lacuna-plum mt-0.5">{yearRange}</p>
      </div>
      <div className="rounded-md bg-lacuna-pink/10 border border-lacuna-lavender/30 px-3 py-2">
        <span className="text-lacuna-blue">Sectors with deals</span>
        <p className="font-semibold text-lacuna-plum mt-0.5">
          <Metric
            label="Sectors with verified deals"
            className="font-semibold text-lacuna-plum"
            provenance={{
              kind: "assumption",
              value: sectorsWithDeals,
              model: COVERAGE_STAT_MODELS.sectorsWithDeals,
            }}
          />
        </p>
      </div>
    </div>
  );
}
