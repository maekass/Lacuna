/**
 * Print founding-year completeness and review-ledger status.
 * Does not fill missing years.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatFoundingYearStatsBlock,
  parseFoundingYearReview,
  summarizeFoundedYears,
  validateFoundingYearReview,
} from "../src/lib/data/foundingYearReview";
import { parseStaticVerifiedDatasetJson } from "../src/lib/data/staticDataset";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const dataset = parseStaticVerifiedDatasetJson(
    JSON.parse(
      readFileSync(join(root, "src/data/dataset.verified.json"), "utf8"),
    ),
  );
  const review = parseFoundingYearReview(
    JSON.parse(
      readFileSync(join(root, "src/data/foundingYearReview.json"), "utf8"),
    ),
  );
  const stats = summarizeFoundedYears(dataset.companies, review);
  const issues = validateFoundingYearReview(dataset.companies, review);

  console.log("Founding-year completeness");
  console.log(formatFoundingYearStatsBlock(stats));
  console.log("");
  console.log("Duplicate identity groups");
  if (stats.duplicateIdentityGroups.length === 0) {
    console.log("  none");
  }
  for (const group of stats.duplicateIdentityGroups) {
    console.log(`  ${group.normalizedName}: ${group.companyIds.join(", ")}`);
  }
  console.log("");
  if (issues.length > 0) {
    console.error(`Review ledger errors (${issues.length})`);
    for (const issue of issues) {
      console.error(`  [${issue.code}] ${issue.message}`);
    }
    process.exit(1);
  }
  console.log("Review ledger matches companies that are missing founded.");
}

main();
