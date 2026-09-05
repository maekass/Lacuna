/**
 * Replay git history of computed-data-quality-scores.json into quality-history.jsonl.
 * Rows are marked `{ backfilled: true }` and never overwrite a live row.
 */
import process from "node:process";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import {
  QUALITY_HISTORY_PATH,
  type QualityHistoryRow,
  readQualityHistory,
  repoRoot,
  writeQualityHistory,
} from "./lib/qualityHistory";

interface QualityArtifact {
  readonly datasetHash?: string;
  readonly generatedAt?: string;
  readonly summary: QualityHistoryRow["companies"] extends infer _ ? {
      readonly companies: QualityHistoryRow["companies"];
      readonly acquisitions: QualityHistoryRow["acquisitions"];
    }
    : never;
}

interface SummaryArtifact {
  readonly provenance?: {
    readonly datasetHash?: string;
    readonly datasetVersion?: string;
  };
  readonly disclosure?: {
    readonly disclosureRate?: number;
    readonly valuationRate?: number;
  };
}

interface ProvenanceArtifact {
  readonly total?: number;
  readonly covered?: number;
  readonly exempt?: number;
  readonly uncovered?: number;
}

function gitShow(commit: string, filePath: string): string | null {
  try {
    return execFileSync("git", ["show", `${commit}:${filePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function listQualityCommits(): Array<{ hash: string; committedAt: string }> {
  const log = execFileSync(
    "git",
    [
      "log",
      "--follow",
      "--format=%H %cI",
      "--",
      "src/data/computed-data-quality-scores.json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return log
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const space = line.indexOf(" ");
      return { hash: line.slice(0, space), committedAt: line.slice(space + 1) };
    })
    .reverse();
}

function rowFromCommit(
  commit: string,
  committedAt: string,
): QualityHistoryRow | null {
  const quality = parseJson<QualityArtifact>(
    gitShow(commit, "src/data/computed-data-quality-scores.json"),
  );
  if (!quality?.summary?.companies || !quality.summary.acquisitions) {
    return null;
  }
  const summary = parseJson<SummaryArtifact>(
    gitShow(commit, "src/data/computed-dataset-summary.json"),
  );
  const provenance = parseJson<ProvenanceArtifact>(
    gitShow(commit, "scripts/provenance-baseline.json"),
  );
  return {
    runAt: quality.generatedAt ?? committedAt,
    datasetHash: quality.datasetHash ??
      summary?.provenance?.datasetHash ??
      commit,
    datasetVersion: summary?.provenance?.datasetVersion ?? "",
    companies: quality.summary.companies,
    acquisitions: quality.summary.acquisitions,
    provenance: {
      total: provenance?.total ?? 0,
      covered: provenance?.covered ?? 0,
      exempt: provenance?.exempt ?? 0,
      uncovered: provenance?.uncovered ?? 0,
    },
    disclosure: {
      disclosureRate: summary?.disclosure?.disclosureRate ?? 0,
      valuationRate: summary?.disclosure?.valuationRate ?? 0,
    },
    sweep: { rowCount: 0, staleRows: 0, dupes: 0, schemaErrors: 0 },
    validateDatasetWarnings: 0,
    unreachableSourceUrls: 0,
    backfilled: true,
  };
}

export function backfillQualityHistory(): QualityHistoryRow[] {
  const live = readQualityHistory().filter((row) => !row.backfilled);
  const backfilled: QualityHistoryRow[] = [];
  const seen = new Set<string>();
  for (const commit of listQualityCommits()) {
    const row = rowFromCommit(commit.hash, commit.committedAt);
    if (!row) continue;
    const key = `${row.datasetHash}::${row.runAt.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    backfilled.push(row);
  }
  const merged = [...backfilled, ...live];
  mkdirSync(dirname(QUALITY_HISTORY_PATH), { recursive: true });
  writeQualityHistory(merged);
  return merged;
}

export function main(): number {
  try {
    const rows = backfillQualityHistory();
    const backfilled = rows.filter((row) => row.backfilled).length;
    console.log(
      `Quality history backfill: ${rows.length} rows (${backfilled} backfilled)`,
    );
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
