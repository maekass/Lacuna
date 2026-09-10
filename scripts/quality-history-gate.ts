/**
 * Fail CI when quality or provenance debt regresses versus the last live ledger row.
 */
import process from "node:process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  assembleQualityHistoryRow,
  formatQualityStepSummary,
  lastLiveRow,
  loadQualityExemptions,
  qualityRatchetFailure,
  readQualityHistory,
} from "./lib/qualityHistory";

function writeStepSummary(markdown: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(
    summaryPath,
    markdown.endsWith("\n") ? markdown : `${markdown}\n`,
  );
}

export function runQualityHistoryGate(): void {
  const current = assembleQualityHistoryRow({
    runAt: new Date().toISOString(),
  });
  const previous = lastLiveRow(readQualityHistory());
  writeStepSummary(formatQualityStepSummary(current, previous));
  const failure = qualityRatchetFailure(
    current,
    previous,
    loadQualityExemptions(),
  );
  if (failure) throw new Error(failure);
}

export function main(): number {
  try {
    runQualityHistoryGate();
    console.log("Quality-history ratchet passed.");
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
