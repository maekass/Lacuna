"use client";

import { useMemo } from "react";
import Metric from "@/components/Metric";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  formatDisclosedBillions,
  liveDisclosedStats,
} from "@/lib/data/lacunaDataset";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

const ESTIMAND_MODEL: ModelProvenance = {
  module: "src/lib/data/lacunaDataset.ts",
  exportName: "liveDisclosedStats",
  definition:
    "disclosed_only_observed_sum over completed women's-health deals. " +
    "Coverage is an observed ratio vs AOA Dx — not capture-recapture.",
};

const metricClassName = "align-baseline font-semibold text-lacuna-plum";

/**
 * Coverage-card note for the completed women's-health disclosed-only estimand.
 * Each figure is a clickable Metric so the provenance gate can trace it.
 */
export default function DisclosedEstimandNote() {
  const { verifiedAcquisitions, dataProvenance } = useVerifiedDataset();
  const live = useMemo(
    () =>
      liveDisclosedStats({
        provenance: dataProvenance,
        acquisitions: verifiedAcquisitions,
      }),
    [verifiedAcquisitions, dataProvenance],
  );
  const wh = live.womensHealth;
  return (
    <ModelProvenanceHint model={ESTIMAND_MODEL}>
      <div className="mt-4 cursor-help rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-3 py-2 text-xs text-lacuna-blue">
        <p className="font-semibold text-lacuna-plum">
          Estimand: disclosed-only observed sum (completed women&apos;s health)
        </p>
        <p className="mt-1">
          <Metric
            label="WH disclosed-only total"
            className={metricClassName}
            provenance={{
              kind: "proxy",
              value: wh.disclosedOnlyTotalMillions,
              model: ESTIMAND_MODEL,
              caveat:
                "disclosed_only_observed_sum over completed women's-health deals. Not a market topline.",
            }}
            formatValue={formatDisclosedBillions}
          />{" "}
          disclosed among completed WH deals ·{" "}
          <Metric
            label="Adjacency excluded"
            className={metricClassName}
            provenance={{
              kind: "proxy",
              value: live.adjacencyExcludedMillions,
              model: ESTIMAND_MODEL,
              caveat:
                "Disclosed value on adjacency-scope completed deals excluded from the WH estimand.",
            }}
            formatValue={formatDisclosedBillions}
          />{" "}
          adjacency excluded · coverage{" "}
          <Metric
            label="Coverage vs AOA Dx"
            className={metricClassName}
            provenance={{
              kind: "proxy",
              value: wh.coverage.rate * 100,
              model: ESTIMAND_MODEL,
              caveat:
                "Observed coverage ratio vs AOA Dx — not capture-recapture.",
            }}
            formatValue={(rate) => `${rate.toFixed(1)}%`}
          />{" "}
          vs {wh.coverage.referenceName} (n=
          <Metric
            label="Coverage denominator"
            className={metricClassName}
            provenance={{
              kind: "proxy",
              value: wh.coverage.denominator,
              model: ESTIMAND_MODEL,
              caveat:
                `${wh.coverage.referenceName} reference count used as the coverage denominator.`,
            }}
          />
          ). Not a market topline — see{" "}
          <a href="/methods" className="underline underline-offset-2">
            methods
          </a>{" "}
          and docs/LIMITATIONS.md.
        </p>
      </div>
    </ModelProvenanceHint>
  );
}
