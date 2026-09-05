#!/usr/bin/env npx tsx

/**
 * Recompute all dataset-derived quantitative artifacts.
 * Run after merging rows into dataset.verified.json.
 *
 * Usage: npm run compute:all
 */

import process from "node:process";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

/** Order matters — confidence intervals read benchmarks + growth rates. */
const STEPS = [
  "scripts/compute-benchmarks.ts",
  "scripts/compute-growth-rates.ts",
  "scripts/compute-acquirer-premiums.ts",
  "scripts/compute-sector-correlations.ts",
  "scripts/compute-data-quality.ts",
  "scripts/compute-confidence-intervals.ts",
  "scripts/compute-dataset-summary.ts",
  "scripts/compute-quality-visibility.ts",
] as const;

function runStep(scriptPath: string): void {
  console.log(`\n=== ${scriptPath} ===\n`);
  const result = spawnSync("npx", ["tsx", scriptPath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("Lacuna — recompute all verified-dataset quantitative artifacts");
  for (const step of STEPS) {
    runStep(step);
  }
  console.log("\n✅ All compute scripts finished.");
}

main();
