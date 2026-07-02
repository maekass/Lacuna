#!/usr/bin/env npx tsx

/**
 * Recompute hub headline stats and disclosure metrics from the verified dataset.
 * Writes src/data/computed-dataset-summary.json for audit/export; the app computes
 * the same model at runtime via buildDatasetSummary().
 *
 * Usage: npm run compute:dataset-summary
 */

import process from "node:process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDatasetSummary } from "../src/lib/data/buildDatasetSummary";
import { getStaticVerifiedDataset } from "../src/lib/data/staticDataset";
import { validateVerifiedDataset } from "../src/lib/data/validateVerifiedDataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "../src/data/computed-dataset-summary.json");

function main() {
  const dataset = getStaticVerifiedDataset();
  const report = validateVerifiedDataset(dataset);

  if (!report.ok) {
    console.error("Dataset validation failed — fix errors before computing summary.");
    for (const error of report.errors) {
      console.error(`  [${error.code}] ${error.message}`);
    }
    process.exit(1);
  }

  const summary = buildDatasetSummary(dataset);
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log("Dataset summary written to src/data/computed-dataset-summary.json");
  console.log(`  Model: ${summary.model}`);
  console.log(`  Generated: ${summary.generatedAt}`);
  console.log(`  Companies: ${summary.headline.companiesInNetwork}`);
  console.log(`  Verified deals: ${summary.headline.verifiedDeals}`);
  console.log(
    `  Disclosed value: ${summary.headline.disclosedValueBillionsLabel}`,
  );
  console.log(`  Source citations: ${summary.headline.uniqueSourceCitations}`);
  console.log(
    `  Provenance: ${summary.provenance.datasetVersion ?? "—"} · updated ${
      summary.provenance.lastUpdated
    }`,
  );

  if (report.warnings.length > 0) {
    console.log(`\n⚠️  ${report.warnings.length} validation warning(s) — see validate:dataset`);
  }
}

main();
