import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hashDataset } from "@/lib/lineage/datasetHash";
import { hashComputationLineage } from "@/lib/lineage/computationLineage";
import { blockingFinding, type MeshicFinding } from "./meshicFindings";
import type { SourceFile } from "./meshicReplayScan";

/** The materializer is the only app module allowed to import the raw JSON. */
export const RAW_DATASET_IMPORT_ALLOWLIST = new Set([
  "src/lib/data/staticDataset.ts",
]);

const RAW_DATASET_IMPORT =
  /\b(?:import|export)\s+(?:type\s+)?[^'";]*?\sfrom\s+["'][^"']*dataset\.verified\.json["']|\bimport\s+["'][^"']*dataset\.verified\.json["']|\bimport\s*\(\s*["'][^"']*dataset\.verified\.json["']\s*\)|\brequire\s*\(\s*["'][^"']*dataset\.verified\.json["']\s*\)|readFileSync\(\s*[^)]*dataset\.verified\.json/;

const COMPUTE_SCRIPT = /^scripts\/compute-(?!all\.ts$).+\.ts$/;

function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (line) => " ".repeat(line.length));
}

function inScanScope(path: string): boolean {
  if (path.includes("/__tests__/") || path.endsWith(".test.ts")) return false;
  if (path.startsWith("src/app/") || path.startsWith("src/components/")) {
    return true;
  }
  if (path.startsWith("src/lib/") && !path.startsWith("src/lib/ingestion/")) {
    return true;
  }
  return COMPUTE_SCRIPT.test(path);
}

/**
 * App and computation code must read the materialized static dataset.
 * Ingestion writers are outside this scan; they edit the raw file on purpose.
 */
export function scanRawDatasetImports(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    if (!inScanScope(file.path)) continue;
    const source = blankComments(file.content);
    if (
      RAW_DATASET_IMPORT.test(source) &&
      !RAW_DATASET_IMPORT_ALLOWLIST.has(file.path)
    ) {
      findings.push(blockingFinding(
        "lineage.rawDatasetImport",
        file.path,
        "This file imports or reads dataset.verified.json directly.",
        "Import getStaticVerifiedDataset() or load getVerifiedDataset(). Only staticDataset.ts may import the raw JSON, and only to materialize it with the evidence ledger.",
      ));
    }
    if (
      COMPUTE_SCRIPT.test(file.path) &&
      !source.includes("getStaticVerifiedDataset")
    ) {
      findings.push(blockingFinding(
        "lineage.computeInputPath",
        file.path,
        "This compute script does not read the materialized static dataset.",
        "Call getStaticVerifiedDataset() so derived artifacts use the same economic values as the app. Do not point the script at a second JSON copy.",
      ));
    }
  }
  return findings;
}

export interface ArtifactHashInput {
  readonly path: string;
  readonly recordedDatasetHash: string | undefined;
  readonly expectedDatasetHash: string;
}

export interface LogicHashInput {
  readonly path: string;
  readonly recordedLogicHash: string | undefined;
  readonly expectedLogicHash: string;
}

/** Dataset and computation-source hashes recorded on derived artifacts. */
export function auditArtifactHashes(input: {
  readonly artifacts: readonly ArtifactHashInput[];
  readonly logic: LogicHashInput;
}): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const artifact of input.artifacts) {
    if (artifact.recordedDatasetHash === artifact.expectedDatasetHash) continue;
    findings.push(blockingFinding(
      "lineage.staleDatasetHash",
      artifact.path,
      `${artifact.path} records dataset hash ${
        artifact.recordedDatasetHash ?? "none"
      }, but the materialized dataset hash is ${artifact.expectedDatasetHash}.`,
      "Run npm run compute:all and commit the regenerated artifacts. Do not paste a new hash by hand.",
    ));
  }
  if (input.logic.recordedLogicHash !== input.logic.expectedLogicHash) {
    findings.push(blockingFinding(
      "lineage.staleComputationHash",
      input.logic.path,
      `${input.logic.path} records computation lineage ${
        input.logic.recordedLogicHash ?? "none"
      }, but the compute sources hash to ${input.logic.expectedLogicHash}.`,
      "Regenerate computed artifacts after data or compute-logic changes and commit them. Do not update only the hash.",
    ));
  }
  return findings;
}

function readRecordedDatasetHash(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as {
    datasetHash?: unknown;
    provenance?: { datasetHash?: unknown };
  };
  if (typeof record.datasetHash === "string") return record.datasetHash;
  return typeof record.provenance?.datasetHash === "string"
    ? record.provenance.datasetHash
    : undefined;
}

export const LINEAGE_ARTIFACTS = [
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

/** Compare committed artifact hashes with the materialized dataset and compute sources. */
export function auditRepositoryLineage(
  root: string,
  materialized: unknown,
): MeshicFinding[] {
  const expectedDatasetHash = hashDataset(materialized).fullHash;
  const artifacts: ArtifactHashInput[] = LINEAGE_ARTIFACTS.map((path) => {
    let recordedDatasetHash: string | undefined;
    try {
      recordedDatasetHash = readRecordedDatasetHash(
        JSON.parse(readFileSync(join(root, path), "utf8")),
      );
    } catch {
      recordedDatasetHash = undefined;
    }
    return { path, recordedDatasetHash, expectedDatasetHash };
  });
  let recordedLogicHash: string | undefined;
  try {
    const visibility = JSON.parse(readFileSync(
      join(root, "src/data/computed-quality-visibility.json"),
      "utf8",
    )) as { computationLineageHash?: unknown };
    recordedLogicHash = typeof visibility.computationLineageHash === "string"
      ? visibility.computationLineageHash
      : undefined;
  } catch {
    recordedLogicHash = undefined;
  }
  return auditArtifactHashes({
    artifacts,
    logic: {
      path: "src/data/computed-quality-visibility.json",
      recordedLogicHash,
      expectedLogicHash: hashComputationLineage(root),
    },
  });
}
