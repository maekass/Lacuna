import type { ModelProvenance } from "./modelProvenance";
import type {
  Lineage,
  LineageSummary,
  TracedInsufficientData,
  TracedSufficient,
} from "@/lib/lineage";

export interface MeasuredMetric {
  readonly kind: "measured";
  readonly estimate: TracedSufficient;
}

export interface WithheldMetric {
  readonly kind: "withheld";
  readonly estimate: TracedInsufficientData;
  readonly summary: LineageSummary;
}

export interface ProxyMetric {
  readonly kind: "proxy";
  readonly value: number | null;
  readonly model: ModelProvenance;
  readonly caveat?: string;
}

export interface AssumptionMetric {
  readonly kind: "assumption";
  readonly value: number | null;
  readonly model: ModelProvenance;
  readonly caveat?: string;
}

export type MetricProvenance =
  | MeasuredMetric
  | WithheldMetric
  | ProxyMetric
  | AssumptionMetric;

export function lineageForMetric(
  metric: MeasuredMetric | WithheldMetric,
): Lineage | LineageSummary {
  return metric.kind === "measured" ? metric.estimate.lineage : metric.summary;
}
