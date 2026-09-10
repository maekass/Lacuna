#!/usr/bin/env npx tsx

/**
 * Fail if dataset-derived computed JSON differs from git HEAD.
 * Used in CI after `npm run compute:all`.
 *
 * Usage: npm run verify:computed
 */

import process from "node:process";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { hashDataset } from "../src/lib/lineage/datasetHash";
import { getStaticVerifiedDataset } from "../src/lib/data/staticDataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

/** Artifacts produced by `npm run compute:all` — must stay in sync with dataset. */
export const DATASET_COMPUTED_ARTIFACTS = [
  "src/data/computed-benchmarks.json",
  "src/data/computed-benchmarks.slim.json",
  "src/data/computed-growth-rates.json",
  "src/data/computed-acquirer-premiums.json",
  "src/data/computed-acquirer-premiums.slim.json",
  "src/data/computed-sector-correlations.json",
  "src/data/computed-data-quality-scores.json",
  "src/data/computed-confidence-intervals.json",
  "src/data/computed-dataset-summary.json",
  "src/data/computed-quality-visibility.json",
] as const;

function recordedDatasetHash(path: string): string | undefined {
  const value = JSON.parse(readFileSync(path, "utf8")) as {
    datasetHash?: unknown;
    provenance?: { datasetHash?: unknown };
  };
  if (typeof value.datasetHash === "string") return value.datasetHash;
  return typeof value.provenance?.datasetHash === "string"
    ? value.provenance.datasetHash
    : undefined;
}

export function verifyArtifactDatasetHashes(
  artifactPaths: readonly string[],
  datasetHash: string,
): void {
  for (const artifactPath of artifactPaths) {
    const recorded = recordedDatasetHash(artifactPath);
    if (recorded !== datasetHash) {
      throw new Error(
        `Dataset changed; computed artifacts need regenerating. ` +
          `${artifactPath} records ${recorded ?? "no dataset hash"}, ` +
          `but the current dataset hash is ${datasetHash}.`,
      );
    }
  }
}

const CMS_FALLBACK_KIND = "hardcoded_fallback";

export function assertCmsUtilizationSourceHonest(artifactPath: string): void {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    source?: unknown;
    utilizationByCptCode?: Array<{ provenanceKind?: unknown }>;
  };
  const source = typeof artifact.source === "string" ? artifact.source : "";
  const rows = artifact.utilizationByCptCode ?? [];
  const hasFallback = rows.some((row) =>
    row.provenanceKind === CMS_FALLBACK_KIND
  );
  const claimsCmsApi = /data\.cms\.gov/i.test(source) &&
    !/not retrieved from/i.test(source);
  if (hasFallback && claimsCmsApi) {
    throw new Error(
      `${artifactPath} labels source as data.cms.gov while one or more CPT rows are ${CMS_FALLBACK_KIND}.`,
    );
  }
}

function main() {
  const cmsPath = join(repoRoot, "src/data/computed-cms-utilization.json");
  try {
    assertCmsUtilizationSourceHonest(cmsPath);
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`);
    process.exit(1);
  }

  const datasetHash = hashDataset(getStaticVerifiedDataset()).fullHash;
  try {
    verifyArtifactDatasetHashes(
      DATASET_COMPUTED_ARTIFACTS.map((p) => join(repoRoot, p)),
      datasetHash,
    );
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`);
    process.exit(1);
  }

  const paths = DATASET_COMPUTED_ARTIFACTS.map((p) => join(repoRoot, p)).join(
    " ",
  );

  try {
    execSync(`git diff --exit-code ${paths}`, {
      cwd: repoRoot,
      stdio: "inherit",
    });
    console.log("✅ Computed artifacts match the verified dataset.");
  } catch {
    console.error(
      "\n❌ Computed artifacts are stale. Run `npm run compute:all` and commit the changes.",
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
