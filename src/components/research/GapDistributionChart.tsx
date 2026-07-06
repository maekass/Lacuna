"use client";

import type { GapSeverityDistribution } from "@/lib/research/patientEmpowermentScoring";
import type { PatientEmpowermentMetric } from "@/data/patientEmpowermentReport";

interface GapDistributionChartProps {
  distribution: GapSeverityDistribution;
  metrics: readonly { metric: PatientEmpowermentMetric }[];
}

export function GapDistributionChart({
  distribution,
  metrics,
}: GapDistributionChartProps) {
  const maxCount = Math.max(
    distribution.moderate,
    distribution.high,
    distribution.critical,
    1,
  );

  const buckets = [
    { key: "critical", label: "Critical (≥60)", count: distribution.critical, className: "bg-red-400/80" },
    { key: "high", label: "High (40–59)", count: distribution.high, className: "bg-amber-400/80" },
    { key: "moderate", label: "Moderate (<40)", count: distribution.moderate, className: "bg-sky-400/80" },
  ] as const;

  const sortedMetrics = [...metrics].sort(
    (a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
          Severity distribution ({metrics.length} dimensions)
        </p>
        <div className="space-y-2">
          {buckets.map((b) => (
            <div key={b.key} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 text-lacuna-blue">{b.label}</span>
              <div className="h-4 flex-1 rounded bg-lacuna-pink/10">
                <div
                  className={`h-full rounded ${b.className}`}
                  style={{ width: `${(b.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-4 text-right font-semibold text-lacuna-plum">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
          Gap index by dimension
        </p>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {sortedMetrics.map(({ metric }) => (
            <div key={metric.id} className="flex items-center gap-2 text-[10px]">
              <span className="w-24 truncate text-lacuna-blue/80" title={metric.label}>
                {metric.id.replace(/-/g, " ")}
              </span>
              <div className="h-2 flex-1 rounded bg-lacuna-pink/10">
                <div
                  className="h-full rounded bg-lacuna-plum/70"
                  style={{ width: `${metric.gapIndexPct}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-lacuna-plum">
                {metric.gapIndexPct}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
