"use client";

import { useMemo } from "react";
import Metric from "@/components/Metric";
import { medianBCaCI } from "@/lib/stats/bootstrap";
import type { TracedValue } from "@/lib/lineage";
import type { MetricProvenance } from "@/lib/provenance/metricProvenance";

export interface ValuationMatrixCellData {
  readonly sector: string;
  readonly stage: string;
  readonly estimate: TracedValue;
  readonly valuations: readonly number[];
  readonly totalCount: number;
  readonly dealCount: number;
}

function metricFromEstimate(estimate: TracedValue): MetricProvenance {
  return estimate.kind === "sufficient" ? { kind: "measured", estimate } : {
    kind: "withheld",
    estimate,
    summary: {
      metricId: estimate.lineage.metricId,
      estimator: estimate.lineage.estimator,
      n: estimate.lineage.n,
      originalInputCount: estimate.lineage.originalInputCount,
      excluded: estimate.lineage.excluded.reduce<
        { reason: string; count: number }[]
      >(
        (rollup, entry) => {
          const existing = rollup.find((item) => item.reason === entry.reason);
          if (existing) existing.count += 1;
          else rollup.push({ reason: entry.reason, count: 1 });
          return rollup;
        },
        [],
      ),
      missingness: estimate.lineage.missingness,
      contributors: estimate.lineage.contributors,
      suppression: estimate.lineage.suppression,
      datasetVersion: estimate.lineage.datasetVersion,
      datasetHash: estimate.lineage.datasetHash,
      computedAt: estimate.lineage.computedAt,
    },
  };
}

export default function ValuationMatrixCell({
  cell,
}: {
  readonly cell: ValuationMatrixCellData;
}) {
  const interval = useMemo(
    () =>
      cell.valuations.length >= 3
        ? medianBCaCI([...cell.valuations], 0.95, 42)
        : null,
    [cell.valuations],
  );
  const tooltipSummary = cell.estimate.kind === "sufficient" && interval
    ? `n=${cell.estimate.sampleSize} · 95% BCa CI: $${
      Math.round(interval.lower)
    }M–$${Math.round(interval.upper)}M`
    : undefined;
  const evidence = interval
    ? (
      <section className="rounded-lg bg-lacuna-surface-muted p-3 text-xs">
        <h4 className="font-semibold">Confidence and power</h4>
        <p className="mt-1">
          95% BCa CI: ${Math.round(interval.lower)}M–${Math.round(
            interval.upper,
          )}M
        </p>
        <p className="mt-1 text-lacuna-text-muted">
          Method: {interval.method}, B={interval.B}
        </p>
        <p className="mt-1 text-amber-800">
          {cell.valuations.length >= 34
            ? `Adequately powered (n=${cell.valuations.length} ≥ 34) to detect d=0.5 at 80% power.`
            : `Underpowered: n=${cell.valuations.length} disclosed. Need n≥34 for 80% power.`}
        </p>
      </section>
    )
    : null;

  return (
    <Metric
      label={`${cell.stage} · ${cell.sector}`}
      provenance={metricFromEstimate(cell.estimate)}
      formatValue={(value) => `$${Math.round(value)}M`}
      compact={cell.estimate.kind === "insufficient"}
      compactLabel={`·${cell.totalCount}`}
      tooltipSummary={tooltipSummary}
      additionalEvidence={evidence}
      className="h-12 w-full justify-center text-xs font-semibold text-lacuna-text-primary"
    />
  );
}
