import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface SlimMetric {
  readonly metricId: string;
  readonly label: string;
  readonly definition: string;
  readonly unit: string;
  readonly scope?: string;
  readonly estimate?: Record<string, unknown>;
  readonly n: number;
  readonly withheldReason?: string;
}

function withoutLineage(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutLineage);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "lineage").map(
      ([key, nested]) => [key, withoutLineage(nested)],
    ),
  );
}

export function writeSlimArtifact(
  filename: string,
  metadata: { generatedAt: string; datasetVersion: string },
  metrics: readonly SlimMetric[],
): void {
  writeFileSync(
    resolve("src/data", filename),
    JSON.stringify(
      {
        generatedAt: metadata.generatedAt,
        datasetVersion: metadata.datasetVersion,
        metrics,
      },
      null,
      2,
    ) + "\n",
  );
}

export { withoutLineage };
