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
import type { VerifiedDataset } from "@/lib/data/datasetSchema";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import {
  buildValuationMatrixEstimate,
  type CanonicalStage,
} from "@/lib/valuation/valuationMatrix";

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
  readonly reproductionParameters?: Readonly<Record<string, string>>;
  readonly contributors: readonly ContributorValue[];
}

export function assertDatasetCrossCheckAvailable(
  contributors: readonly ContributorValue[],
  metricId: string,
): void {
  if (
    contributors.length === 0 ||
    contributors.some((contributor) => contributor.reads.length === 0)
  ) {
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
    reproductionParameters: lineage.reproductionParameters,
    contributors: lineage.contributors,
  };
}

export interface DatasetReproductionResult {
  readonly estimate: TracedValue;
  readonly contributors: readonly ContributorValue[];
  readonly n: number;
}

export function assertDatasetReproductionMatches(
  artifact: MetricReproductionArtifact,
  result: DatasetReproductionResult,
): void {
  if (result.n !== artifact.n) {
    throw new Error(
      `Dataset recomputation mismatch: export n=${artifact.n}, ` +
        `current n=${result.n}.`,
    );
  }
  const actual = result.estimate;
  if (artifact.expected.kind === "insufficient") {
    if (
      actual.kind !== "insufficient" ||
      actual.sampleSize !== artifact.expected.sampleSize ||
      actual.minRequired !== artifact.expected.minRequired
    ) {
      throw new Error(
        `Dataset recomputation mismatch: expected withholding n=${artifact.expected.sampleSize} (minimum ${artifact.expected.minRequired}), ` +
          `current=${actual.kind}.`,
      );
    }
  } else if (
    actual.kind !== "sufficient" ||
    actual.value !== artifact.expected.value ||
    actual.confidenceInterval[0] !== artifact.expected.confidenceInterval[0] ||
    actual.confidenceInterval[1] !== artifact.expected.confidenceInterval[1]
  ) {
    throw new Error(
      "Dataset recomputation mismatch: regenerated estimate differs from " +
        "the artifact.",
    );
  }
  if (
    JSON.stringify(result.contributors) !==
      JSON.stringify(artifact.contributors)
  ) {
    throw new Error(
      "Dataset recomputation mismatch: contributors differ from the " +
        "production computation.",
    );
  }
}

export function reproduceFromDataset(
  metricId: string,
  dataset: VerifiedDataset,
  parameters: Readonly<Record<string, string>> | undefined,
): DatasetReproductionResult | undefined {
  if (metricId !== "valuation.matrix.median") return undefined;
  const sector = parameters?.sector;
  const stage = parameters?.stage;
  if (!sector || !stage) return undefined;
  const { verifiedCompanies } = buildVerifiedDerivedData(dataset);
  const result = buildValuationMatrixEstimate(
    verifiedCompanies,
    sector,
    stage as CanonicalStage,
    {
      datasetVersion: dataset.provenance.datasetVersion,
      datasetHash: dataset.provenance.datasetHash,
      reproductionParameters: { sector, stage },
    },
  );
  return {
    estimate: result.estimate,
    contributors: result.estimate.lineage.contributors,
    n: result.estimate.lineage.n,
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
