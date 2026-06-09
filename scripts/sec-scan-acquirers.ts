import process from "node:process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import {
  formatHitsAsCsvRows,
  scanAcquisitionFilings,
} from "../src/lib/ingestion/secEdgarClient";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");
const stagingDir = join(__dirname, "../staging");
const outputPath = join(stagingDir, "sec_candidates.csv");

function loadTickers(): string[] {
  const raw = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(raw) as VerifiedDataset;
  const fromAcquirers = dataset.acquirers
    .map((a) => a.ticker?.trim().toUpperCase())
    .filter((t): t is string => Boolean(t));
  return [...new Set(fromAcquirers)];
}

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error(
      "Set SEC_EDGAR_USER_AGENT before scanning (SEC fair-access policy).",
    );
    console.error(
      'Example: SEC_EDGAR_USER_AGENT="Lacuna Research you@example.com" npm run sec:scan',
    );
    process.exit(1);
  }

  const tickers = loadTickers();
  if (tickers.length === 0) {
    console.error("No tickers found in dataset.acquirers");
    process.exit(1);
  }

  console.log(`Scanning SEC 8-K filings for: ${tickers.join(", ")}`);
  const hits = await scanAcquisitionFilings(tickers, {
    sinceDate: process.env.SEC_SCAN_SINCE ??
      `${new Date().getFullYear() - 3}-01-01`,
  });

  mkdirSync(stagingDir, { recursive: true });
  const csv = formatHitsAsCsvRows(hits).join("\n");
  writeFileSync(outputPath, `${csv}\n`, "utf8");

  console.log(`Wrote ${hits.length} candidate row(s) to ${outputPath}`);
  console.log("Review manually — do not auto-merge into dataset.verified.json");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
