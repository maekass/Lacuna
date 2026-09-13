import { quantile } from "simple-statistics";
import { bcaBootstrapCi, gatedMedian } from "@/lib/quant/estimators";
import type { QuantValue } from "@/lib/quant/types";

export type MetricEstimator =
  | "gatedMedian"
  | "bcaP25"
  | "bcaP75"
  | "gatedMean";

export const METRIC_REPRODUCTION_SEED = 42;

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
  // Internal IDs retain `moic` for artifact/backward compatibility. The public
  // label deliberately does not: deal value / total company capital raised is
  // not fund-level MOIC because it does not use an investor's cost basis or
  // ownership-at-exit proceeds.
  "sector.moic.median": {
    id: "sector.moic.median",
    label: "Median exit-value / capital-raised ratio",
    definition:
      "Deal value divided by the target company's total disclosed capital raised. This is a descriptive capital-efficiency ratio, not fund or investment MOIC and not a revenue multiple.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "Uses disclosed positive deal values and total disclosed company capital raised.",
      "Does not represent an investor's cost basis, ownership percentage, proceeds, dilution, or realized return.",
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
    label: "25th percentile exit-value / capital-raised ratio",
    definition:
      "25th percentile of deal value divided by the target company's total disclosed capital raised; not fund or investment MOIC.",
    unit: "x",
    estimator: "bcaP25",
    minN: 10,
    caveats: [
      "Quartiles are suppressed below n=10.",
      "Does not represent investor-level returns.",
    ],
  },
  "sector.moic.p75": {
    id: "sector.moic.p75",
    label: "75th percentile exit-value / capital-raised ratio",
    definition:
      "75th percentile of deal value divided by the target company's total disclosed capital raised; not fund or investment MOIC.",
    unit: "x",
    estimator: "bcaP75",
    minN: 10,
    caveats: [
      "Quartiles are suppressed below n=10.",
      "Does not represent investor-level returns.",
    ],
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
    label: "Deal value / total capital raised",
    definition:
      "Deal value divided by the target's total disclosed capital raised. This is not a valuation premium in the conventional sense and not investor MOIC.",
    unit: "x",
    estimator: "gatedMedian",
    minN: 5,
    caveats: [
      "This denominator is not pooled with other premium denominators.",
      "Total capital raised is not a pre-deal valuation or investor cost basis.",
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
  seed = METRIC_REPRODUCTION_SEED,
): QuantValue<number> {
  const options = { minSampleSize: declaration.minN, seed };
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
