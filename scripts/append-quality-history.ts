/**
 * Append one quality-history JSONL row from committed artifacts.
 *
 * Usage:
 *   npx tsx scripts/append-quality-history.ts
 *   npx tsx scripts/append-quality-history.ts --check
 */
import process from "node:process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assembleQualityHistoryRow,
  formatQualityStepSummary,
  lastLiveRow,
  loadQualityExemptions,
  QUALITY_HISTORY_PATH,
  qualityRatchetFailure,
  readQualityHistory,
  upsertQualityHistoryRow,
  writeQualityHistory,
} from "./lib/qualityHistory";

function writeStepSummary(markdown: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(
    summaryPath,
    markdown.endsWith("\n") ? markdown : `${markdown}\n`,
  );
}

export function appendQualityHistory(options: {
  readonly runAt?: string;
  readonly checkOnly?: boolean;
}): { row: ReturnType<typeof assembleQualityHistoryRow>; wrote: boolean } {
  const runAt = options.runAt ?? new Date().toISOString();
  const row = assembleQualityHistoryRow({ runAt });
  const existing = readQualityHistory();
  const next = upsertQualityHistoryRow(existing, row);
  const previous = lastLiveRow(
    existing.filter((entry) =>
      !(entry.datasetHash === row.datasetHash &&
        entry.runAt.slice(0, 10) === row.runAt.slice(0, 10))
    ),
  );
  const ratchet = qualityRatchetFailure(row, previous, loadQualityExemptions());
  writeStepSummary(formatQualityStepSummary(row, previous));
  if (ratchet) {
    throw new Error(ratchet);
  }
  if (options.checkOnly) {
    return { row, wrote: false };
  }
  mkdirSync(dirname(QUALITY_HISTORY_PATH), { recursive: true });
  writeQualityHistory(next);
  return { row, wrote: true };
}

export function main(argv: string[]): number {
  try {
    const checkOnly = argv.includes("--check");
    const { row, wrote } = appendQualityHistory({ checkOnly });
    console.log(
      `Quality history: hash=${
        row.datasetHash.slice(0, 12)
      } companies.avgScore=${row.companies.avgScore} uncovered=${row.provenance.uncovered}${
        wrote ? "" : " (check only)"
      }`,
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
  process.exitCode = main(process.argv.slice(2));
}
