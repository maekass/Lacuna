#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import process from "node:process";
import {
  getMetricDeclaration,
  type MetricReproductionArtifact,
  reproduceArtifact,
} from "../src/lib/lineage";
import { hashDataset } from "../src/lib/lineage/datasetHash";
import type { VerifiedDataset } from "../src/lib/data/datasetSchema";

function fail(message: string): never {
  throw new Error(message);
}

function parseArtifact(path: string): MetricReproductionArtifact {
  const value = JSON.parse(
    readFileSync(path, "utf8"),
  ) as MetricReproductionArtifact;
  if (value.version !== 1) fail(`Unsupported reproduction artifact version.`);
  getMetricDeclaration(value.metricId);
  if (!Array.isArray(value.contributors)) {
    fail("Reproduction artifact has no contributor values.");
  }
  return value;
}

function verifyEstimate(artifact: MetricReproductionArtifact): void {
  const actual = reproduceArtifact(artifact);
  if (artifact.expected.kind === "insufficient") {
    if (
      actual.kind !== "insufficient" ||
      actual.sampleSize !== artifact.expected.sampleSize ||
      actual.minRequired !== artifact.expected.minRequired
    ) {
      fail(
        `Withholding mismatch: expected n=${artifact.expected.sampleSize} ` +
          `(minimum ${artifact.expected.minRequired}), got ` +
          `${
            actual.kind === "insufficient"
              ? `n=${actual.sampleSize}`
              : actual.kind
          }.`,
      );
    }
    return;
  }
  if (actual.kind !== "sufficient") {
    fail(`Estimate mismatch: expected a value, got ${actual.kind}.`);
  }
  if (
    actual.value !== artifact.expected.value ||
    actual.confidenceInterval[0] !== artifact.expected.confidenceInterval[0] ||
    actual.confidenceInterval[1] !== artifact.expected.confidenceInterval[1]
  ) {
    fail(
      `Estimate mismatch:\n` +
        `  expected value=${artifact.expected.value}, ` +
        `CI=[${artifact.expected.confidenceInterval.join(", ")}]\n` +
        `  actual   value=${actual.value}, ` +
        `CI=[${actual.confidenceInterval.join(", ")}]`,
    );
  }
}

function recordsFor(
  dataset: VerifiedDataset,
  table: string,
): readonly Record<string, unknown>[] {
  const records = dataset[table as keyof VerifiedDataset];
  return Array.isArray(records)
    ? records as readonly Record<string, unknown>[]
    : fail(`Unsupported contributor table: ${table}`);
}

function pathValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (current, key) =>
      current && typeof current === "object"
        ? (current as Record<string, unknown>)[key]
        : undefined,
    record,
  );
}

function contributorValue(
  record: Record<string, unknown>,
  field: string,
  dataset: VerifiedDataset,
): unknown {
  const [left, right] = field.split(" / ");
  if (!right) return pathValue(record, field);
  const numerator = pathValue(record, left);
  if (!right.startsWith("company.")) {
    const denominator = pathValue(record, right);
    return typeof numerator === "number" && typeof denominator === "number"
      ? numerator / denominator
      : undefined;
  }
  const targetId = record.targetId;
  const company = dataset.companies.find((candidate) =>
    candidate.id === targetId
  );
  const denominator = company === undefined
    ? undefined
    : pathValue(company, right.slice("company.".length));
  return typeof numerator === "number" && typeof denominator === "number"
    ? numerator / denominator
    : undefined;
}

async function verifyDataset(
  artifact: MetricReproductionArtifact,
): Promise<void> {
  const { getStaticVerifiedDataset } = await import(
    "../src/lib/data/staticDataset"
  );
  const dataset = getStaticVerifiedDataset();
  const currentHash = hashDataset(dataset).fullHash;
  if (artifact.datasetHash !== currentHash) {
    fail(
      `Dataset state mismatch: export records ${
        artifact.datasetHash ?? "no hash"
      }, ` +
        `but the current dataset is ${currentHash}.`,
    );
  }
  for (const contributor of artifact.contributors) {
    const record = recordsFor(dataset, contributor.ref.table).find(
      (candidate) => candidate.id === contributor.ref.id,
    );
    if (!record) {
      fail(
        `Dataset contributor missing: ${contributor.ref.table}/${contributor.ref.id}.`,
      );
    }
    const current = contributorValue(record, contributor.field, dataset);
    if (current !== contributor.value) {
      fail(
        `Dataset contributor mismatch for ${contributor.ref.table}/${contributor.ref.id} ` +
          `${contributor.field}: export=${contributor.value}, current=${
            String(current)
          }.`,
      );
    }
  }
}

async function main(): Promise<void> {
  const [path, ...flags] = process.argv.slice(2);
  if (!path || flags.some((flag) => flag !== "--dataset")) {
    fail("Usage: npm run reproduce -- <artifact.json> [--dataset]");
  }
  const artifact = parseArtifact(path);
  verifyEstimate(artifact);
  console.log(
    `✅ Reproduced ${artifact.metricId}: ${artifact.expected.kind} ` +
      `(n=${artifact.n}, seed=${artifact.seed})`,
  );
  if (flags.includes("--dataset")) {
    await verifyDataset(artifact);
    console.log(
      "✅ Dataset hash and contributor values match the current dataset.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\n❌ ${(error as Error).message}`);
  process.exit(1);
});
