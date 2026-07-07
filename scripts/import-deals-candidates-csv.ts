#!/usr/bin/env npx tsx
/**
 * Import deal candidates from CSV file into lacuna_deals staging.
 *
 * Usage:
 *   DATABASE_URL=... npm run deals:import-csv -- staging/my_candidates.csv
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { importCandidatesCsv } from "../src/lib/ingestion/importCandidatesCsv";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("Set DATABASE_URL before CSV import.");
    process.exit(1);
  }

  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run deals:import-csv -- <path-to.csv>");
    process.exit(1);
  }

  const csv = readFileSync(filePath, "utf8");
  const result = await importCandidatesCsv(csv);

  console.log(`Parsed ${result.parsed} row(s), skipped ${result.skipped}`);
  console.log(
    `DB sync — inserted: ${result.sync.inserted}, updated: ${result.sync.updated}, skipped: ${result.sync.skipped}`,
  );
  if (result.errors.length > 0) {
    console.warn("Parse warnings:");
    for (const err of result.errors) console.warn(`  - ${err}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
