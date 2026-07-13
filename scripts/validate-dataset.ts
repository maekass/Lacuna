import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { parseStaticVerifiedDatasetJson } from "../src/lib/data/staticDataset";
import { validateVerifiedDataset } from "../src/lib/data/validateVerifiedDataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");

function formatSchemaErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `[schema.${path}] ${issue.message}`;
  });
}

function main() {
  const raw = readFileSync(datasetPath, "utf8");
  let dataset;
  try {
    dataset = parseStaticVerifiedDatasetJson(JSON.parse(raw));
  } catch (error) {
    console.error("Lacuna verified dataset validation");
    console.error("File:", datasetPath);
    console.error("");
    console.error("--- Schema errors ---");
    if (error instanceof ZodError) {
      for (const line of formatSchemaErrors(error)) {
        console.error(`  ${line}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }

  const report = validateVerifiedDataset(dataset);

  console.log("Lacuna verified dataset validation");
  console.log("File:", datasetPath);
  console.log("Updated:", dataset.provenance.lastUpdated);
  console.log("");

  console.log("--- Disclosure stats ---");
  console.log(
    `Companies: ${report.stats.companiesTotal} (${report.stats.companiesWithValuation} with valuation)`,
  );
  console.log(
    `Deals: ${report.stats.dealsTotal} (${report.stats.dealsDisclosed} disclosed, ${report.stats.dealsUndisclosed} undisclosed)`,
  );
  console.log(
    `Disclosure rate: ${(report.stats.disclosureRate * 100).toFixed(1)}%`,
  );
  console.log(`Deals with dealValueNote: ${report.stats.dealsWithValueNote}`);
  console.log("");

  console.log("--- Deals by sector (target) ---");
  const sectorsWithDeals = report.sectorCounts.filter((row) => row.deals > 0);
  for (const row of sectorsWithDeals) {
    console.log(
      `  ${row.sector}: ${row.deals} deals, ${row.companies} companies, ${row.disclosedPrices} disclosed prices`,
    );
  }
  const zeroDealSectorCount = report.sectorCounts.length -
    sectorsWithDeals.length;
  if (zeroDealSectorCount > 0) {
    console.log(
      `  (${zeroDealSectorCount} sectors with companies but no verified deals — see warnings)`,
    );
  }
  console.log("");

  console.log("--- Deals by year ---");
  for (const row of report.yearCounts) {
    console.log(
      `  ${row.year}: ${row.count} deals (${row.disclosedPrices} disclosed prices)`,
    );
  }
  console.log("");

  if (report.warnings.length > 0) {
    console.log(`--- Warnings (${report.warnings.length}) ---`);
    for (const w of report.warnings) {
      console.log(`  [${w.code}] ${w.message}`);
    }
    console.log("");
  }

  if (report.errors.length > 0) {
    console.error(`--- Errors (${report.errors.length}) ---`);
    for (const e of report.errors) {
      console.error(`  [${e.code}] ${e.message}`);
    }
    process.exit(1);
  }

  console.log(
    report.warnings.length > 0
      ? "Validation passed with warnings."
      : "Validation passed.",
  );
}

main();
