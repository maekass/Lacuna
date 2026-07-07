#!/usr/bin/env npx tsx
/**
 * SEC EFTS 8-K Item 2.01 search → lacuna_deals staging upsert.
 *
 * Usage:
 *   DATABASE_URL=... SEC_EDGAR_USER_AGENT="..." npm run sec:ingest-efts
 *   npm run sec:ingest-efts -- --since 2024-01-01 --max 50 --dry-run
 */

import process from "node:process";
import { runEftsMaIngest } from "../src/lib/ingestion/eftsMaIngestPipeline";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("Set SEC_EDGAR_USER_AGENT before EFTS ingest.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.env.DATABASE_URL?.trim()) {
    console.error("Set DATABASE_URL or pass --dry-run.");
    process.exit(1);
  }

  const sinceIdx = process.argv.indexOf("--since");
  const sinceDate = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : undefined;
  const maxIdx = process.argv.indexOf("--max");
  const maxResults = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : undefined;

  const result = await runEftsMaIngest({ sinceDate, maxResults, dryRun });

  console.log(
    `EFTS search since ${result.sinceDateUsed}: ${result.hits.length} hit(s)`,
  );
  if (result.sync) {
    console.log(
      `DB sync — inserted: ${result.sync.inserted}, updated: ${result.sync.updated}, skipped: ${result.sync.skipped}`,
    );
  } else if (dryRun) {
    console.log(
      `Dry run — ${result.classified.length} candidate row(s) mapped`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
