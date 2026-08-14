import {
  estimateRegisteredMetric,
  getMetricDeclaration,
  METRIC_REPRODUCTION_SEED,
} from "./registry";
import type { QuantValue } from "@/lib/quant/types";
import type {
  ContributorValue,
  Lineage,
  LineageSummary,
  TracedValue,
} from "./types";

export const REPRODUCTION_FORMAT_VERSION = 1;

export interface ReproductionExpected {
  readonly kind: "sufficient";
  readonly value: number;
  readonly confidenceInterval: readonly [number, number];
}

export interface ReproductionWithheld {
  readonly kind: "insufficient";
  readonly sampleSize: number;
  readonly minRequired: number;
  readonly message: string;
}

export interface MetricReproductionArtifact {
  readonly version: typeof REPRODUCTION_FORMAT_VERSION;
  readonly metricId: string;
  readonly label: string;
  readonly definition: string;
  readonly unit: string;
  readonly estimator: string;
  readonly n: number;
  readonly expected: ReproductionExpected | ReproductionWithheld;
  readonly seed: number;
  readonly datasetVersion?: string;
  readonly datasetHash?: string;
  readonly computedAt: string;
  readonly contributors: readonly ContributorValue[];
}

export function assertDatasetCrossCheckAvailable(
  contributors: readonly ContributorValue[],
  metricId: string,
): void {
  if (contributors.some((contributor) => contributor.reads.length === 0)) {
    throw new Error(
      `Dataset cross-check unavailable for metric ${metricId}: ` +
        "contributors do not include traced field reads.",
    );
  }
}

export function assertDatasetHashMatches(
  exportedHash: string | undefined,
  currentHash: string,
): void {
  if (exportedHash !== currentHash) {
    throw new Error(
      `Dataset state mismatch: export records ${exportedHash ?? "no hash"}, ` +
        `but the current dataset is ${currentHash}.`,
    );
  }
}

function expectedFromValue(
  value: TracedValue,
): ReproductionExpected | ReproductionWithheld {
  if (value.kind === "sufficient") {
    return {
      kind: "sufficient",
      value: value.value,
      confidenceInterval: value.confidenceInterval,
    };
  }
  return {
    kind: "insufficient",
    sampleSize: value.sampleSize,
    minRequired: value.minRequired,
    message: value.message,
  };
}

export function createReproductionArtifact(
  value: TracedValue,
  lineage: Lineage | LineageSummary,
): MetricReproductionArtifact {
  const declaration = getMetricDeclaration(lineage.metricId);
  return {
    version: REPRODUCTION_FORMAT_VERSION,
    metricId: declaration.id,
    label: declaration.label,
    definition: declaration.definition,
    unit: declaration.unit,
    estimator: declaration.estimator,
    n: lineage.n,
    expected: expectedFromValue(value),
    seed: METRIC_REPRODUCTION_SEED,
    datasetVersion: lineage.datasetVersion,
    datasetHash: lineage.datasetHash,
    computedAt: lineage.computedAt,
    contributors: lineage.contributors,
  };
}

export function reproduceArtifact(
  artifact: MetricReproductionArtifact,
): QuantValue {
  const declaration = getMetricDeclaration(artifact.metricId);
  return estimateRegisteredMetric(
    declaration,
    artifact.contributors.map((contributor) => contributor.value),
    artifact.seed,
  );
}
