#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import process from "node:process";
import {
  assertDatasetCrossCheckAvailable,
  assertDatasetHashMatches,
  assertDatasetReproductionMatches,
  getMetricDeclaration,
  type MetricReproductionArtifact,
  reproduceArtifact,
  reproduceFromDataset,
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

function verifyEstimateAgainst(
  artifact: MetricReproductionArtifact,
  actual: ReturnType<typeof reproduceArtifact>,
): void {
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

function verifyEstimate(artifact: MetricReproductionArtifact): void {
  verifyEstimateAgainst(artifact, reproduceArtifact(artifact));
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

async function verifyDataset(
  artifact: MetricReproductionArtifact,
): Promise<string> {
  const { getStaticVerifiedDataset } = await import(
    "../src/lib/data/staticDataset"
  );
  const dataset = getStaticVerifiedDataset();
  const currentHash = hashDataset(dataset).fullHash;
  try {
    assertDatasetHashMatches(artifact.datasetHash, currentHash);
  } catch (error) {
    fail((error as Error).message);
  }
  const recomputed = reproduceFromDataset(
    artifact.metricId,
    dataset,
    artifact.reproductionParameters,
  );
  if (recomputed) {
    assertDatasetReproductionMatches(artifact, recomputed);
    return "full production recomputation";
  }
  assertDatasetCrossCheckAvailable(artifact.contributors, artifact.metricId);
  for (const contributor of artifact.contributors) {
    for (const read of contributor.reads) {
      const record = recordsFor(dataset, read.ref.table).find(
        (candidate) => candidate.id === read.ref.id,
      );
      if (!record) {
        fail(`Dataset field record missing: ${read.ref.table}/${read.ref.id}.`);
      }
      const current = record[read.field];
      if (current !== read.value) {
        fail(
          `Dataset field mismatch for ${read.ref.table}/${read.ref.id} ` +
            `${read.field}: export=${String(read.value)}, current=${
              String(current)
            }.`,
        );
      }
      if (
        contributor.reads.length === 1 &&
        contributor.value !== read.value
      ) {
        fail(
          `Dataset contributor mismatch for ${read.ref.table}/${read.ref.id} ` +
            `${read.field}: export=${String(contributor.value)}, ` +
            `read=${String(read.value)}.`,
        );
      }
    }
  }
  return "raw field-read verification";
}

async function main(): Promise<void> {
  const [path, ...flags] = process.argv.slice(2);
  if (!path || flags.some((flag) => flag !== "--dataset")) {
    fail("Usage: npm run reproduce -- <artifact.json> [--dataset]");
  }
  const artifact = parseArtifact(path);
  verifyEstimate(artifact);
  const expectedSummary = artifact.expected.kind === "sufficient"
    ? `value=${artifact.expected.value}, ` +
      `CI=[${artifact.expected.confidenceInterval.join(", ")}]`
    : `n=${artifact.expected.sampleSize}, ` +
      `minimum=${artifact.expected.minRequired}`;
  console.log(
    `✅ Reproduced ${artifact.metricId}: ${artifact.expected.kind} ` +
      `(${expectedSummary}; seed=${artifact.seed})`,
  );
  if (flags.includes("--dataset")) {
    const strength = await verifyDataset(artifact);
    console.log(
      `✅ Dataset provenance check passed (${strength}); dataset hash and ` +
        "recorded inputs match the current dataset.",
    );
  } else {
    console.log(
      "ℹ️ Plain mode is an arithmetic self-check of the self-contained " +
        "artifact; it does not verify dataset provenance.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\n❌ ${(error as Error).message}`);
  process.exit(1);
});
