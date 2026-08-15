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

export interface ArtifactMetric {
  readonly kind: "artifact";
  readonly metricId: string;
  readonly estimate:
    | {
      readonly kind: "sufficient";
      readonly value: number;
      readonly sampleSize: number;
      readonly confidenceInterval: readonly [number, number];
    }
    | {
      readonly kind: "insufficient";
      readonly sampleSize: number;
      readonly minRequired: number;
      readonly message: string;
    };
}

export type MetricProvenance =
  | MeasuredMetric
  | WithheldMetric
  | ProxyMetric
  | AssumptionMetric
  | ArtifactMetric;

export function lineageForMetric(metric: MeasuredMetric): Lineage;
export function lineageForMetric(metric: WithheldMetric): LineageSummary;
export function lineageForMetric(
  metric: MeasuredMetric | WithheldMetric,
): Lineage | LineageSummary {
  return metric.kind === "measured" ? metric.estimate.lineage : metric.summary;
}
