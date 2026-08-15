#!/usr/bin/env npx tsx
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { parseVerifiedDataset } from "../src/lib/data/datasetSchema";
import {
  runSourceBackfill,
  sourceBackfillCoverageText,
  summarizeSourceBackfill,
} from "../src/lib/ingestion/sourceBackfill";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!userAgent?.includes("mps5cy@virginia.edu")) {
    throw new Error(
      "Set SEC_EDGAR_USER_AGENT with contact email mps5cy@virginia.edu.",
    );
  }
  const cacheDir = resolve(
    option("--cache-dir") ?? "staging/source-backfill/cache",
  );
  const outputPath = resolve(
    option("--output") ?? "staging/source-backfill/results.json",
  );
  const datasetPath = resolve(
    option("--dataset") ?? "src/data/dataset.verified.json",
  );
  mkdirSync(resolve("staging/source-backfill"), { recursive: true });
  const dataset = parseVerifiedDataset(
    JSON.parse(readFileSync(datasetPath, "utf8")) as unknown,
  );
  const report = await runSourceBackfill(dataset, {
    cacheDir,
    userAgent,
    offline: process.argv.includes("--offline"),
  });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const coverage = summarizeSourceBackfill(report);
  console.log(sourceBackfillCoverageText(coverage));
  console.log(`Output: ${outputPath}`);
  console.log(`Cache: ${cacheDir}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
