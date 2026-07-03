#!/usr/bin/env npx tsx
/** SEC Form D ingest CLI — EFTS search → parse → lacuna_funding_events */

import process from "node:process";
import { runFormDIngest } from "../src/lib/ingestion/secFormDIngestPipeline";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("Set SEC_EDGAR_USER_AGENT before Form D ingest.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const sinceIdx = process.argv.indexOf("--since");
  const sinceDate = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : undefined;
  const maxIdx = process.argv.indexOf("--max");
  const maxResults = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : undefined;

  console.log(`Form D ingest${dryRun ? " (dry run)" : ""}…`);
  const result = await runFormDIngest({ dryRun, sinceDate, maxResults });

  console.log(`EFTS hits: ${result.eftsHits}`);
  console.log(`Parsed: ${result.parsed.length}`);
  console.log(
    `WH relevant: ${
      result.classified.filter((c) => c.womensHealthRelevant).length
    }`,
  );
  if (result.sync) {
    console.log(
      `DB — inserted: ${result.sync.inserted}, updated: ${result.sync.updated}, skipped: ${result.sync.skipped}`,
    );
  } else if (!dryRun && !process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set — no DB sync");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
