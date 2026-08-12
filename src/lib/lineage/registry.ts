import { quantile } from "simple-statistics";
import { bcaBootstrapCi, gatedMedian } from "@/lib/quant/estimators";
import type { QuantValue } from "@/lib/quant/types";

export type MetricEstimator =
  | "gatedMedian"
  | "bcaP25"
  | "bcaP75"
  | "gatedMean";

export interface MetricDeclaration {
  readonly id: string;
  readonly label: string;
  readonly definition: string;
  readonly unit: string;
  readonly estimator: MetricEstimator;
  readonly minN: number;
  readonly caveats: readonly string[];
}

export const METRIC_REGISTRY = {
  "sector.moic.median": {
    id: "sector.moic.median",
    label: "Median sector MOIC",
    definition:
      "Deal value divided by total capital raised (money-on-invested-capital); not a revenue multiple.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "Uses disclosed positive deal values and total capital raised.",
      "Disclosed-price deals are a non-random subsample.",
    ],
  },
  "valuation.matrix.median": {
    id: "valuation.matrix.median",
    label: "Median disclosed valuation",
    definition:
      "Median last-known valuation for companies in a normalized sector and stage bucket.",
    unit: "$M",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "Only companies with a disclosed last-known valuation contribute.",
      "Sector and stage buckets are normalized from verified dataset labels.",
    ],
  },
  "sector.moic.p25": {
    id: "sector.moic.p25",
    label: "25th percentile sector MOIC",
    definition:
      "25th percentile of deal value divided by total capital raised (money-on-invested-capital).",
    unit: "x",
    estimator: "bcaP25",
    minN: 10,
    caveats: ["Quartiles are suppressed below n=10."],
  },
  "sector.moic.p75": {
    id: "sector.moic.p75",
    label: "75th percentile sector MOIC",
    definition:
      "75th percentile of deal value divided by total capital raised (money-on-invested-capital).",
    unit: "x",
    estimator: "bcaP75",
    minN: 10,
    caveats: ["Quartiles are suppressed below n=10."],
  },
  "acquirer.premium.preDealValuation": {
    id: "acquirer.premium.preDealValuation",
    label: "Acquirer premium over pre-deal valuation",
    definition: "Deal value divided by the sourced pre-deal valuation.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "This denominator is not pooled with other premium denominators.",
    ],
  },
  "acquirer.premium.lastKnownValuation": {
    id: "acquirer.premium.lastKnownValuation",
    label: "Acquirer premium over last-known valuation",
    definition: "Deal value divided by the target's last-known valuation.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "This denominator is not pooled with other premium denominators.",
    ],
  },
  "acquirer.premium.totalFunding": {
    id: "acquirer.premium.totalFunding",
    label: "Acquirer premium over total funding",
    definition: "Deal value divided by the target's total capital raised.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "This denominator is not pooled with other premium denominators.",
    ],
  },
} as const satisfies Record<string, MetricDeclaration>;

export type MetricId = keyof typeof METRIC_REGISTRY;

export function getMetricDeclaration(metricId: string): MetricDeclaration {
  const declaration = METRIC_REGISTRY[metricId as MetricId];
  if (!declaration) {
    throw new Error(`Unregistered lineage metric: ${metricId}`);
  }
  return declaration;
}

export function estimateRegisteredMetric(
  declaration: MetricDeclaration,
  values: number[],
): QuantValue<number> {
  const options = { minSampleSize: declaration.minN };
  switch (declaration.estimator) {
    case "gatedMedian":
      return gatedMedian(values, options);
    case "bcaP25":
      return bcaBootstrapCi(
        values,
        (sample) => quantile(sample, 0.25),
        options,
      );
    case "bcaP75":
      return bcaBootstrapCi(
        values,
        (sample) => quantile(sample, 0.75),
        options,
      );
    case "gatedMean":
      return bcaBootstrapCi(
        values,
        (sample) =>
          sample.reduce((sum, value) => sum + value, 0) / sample.length,
        options,
      );
  }
}
