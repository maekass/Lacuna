#!/usr/bin/env npx tsx
/**
 * SEC EFTS 8-K Item 2.01 search → lacuna_deals staging upsert.
 *
 * Usage:
 *   DATABASE_URL=... SEC_EDGAR_USER_AGENT="..." npm run sec:ingest-efts
 *   npm run sec:ingest-efts -- --since 2024-01-01 --max 50 --dry-run
 *   npm run sec:ingest-efts -- --enrich --enrich-max 5
 */

import process from "node:process";
import { runEftsMaIngest } from "../src/lib/ingestion/eftsMaIngestPipeline";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("Set SEC_EDGAR_USER_AGENT before EFTS ingest.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const enrich = process.argv.includes("--enrich");
  if (!dryRun && !process.env.DATABASE_URL?.trim()) {
    console.error("Set DATABASE_URL or pass --dry-run.");
    process.exit(1);
  }

  const sinceIdx = process.argv.indexOf("--since");
  const sinceDate = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : undefined;
  const maxIdx = process.argv.indexOf("--max");
  const maxResults = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : undefined;
  const enrichMaxIdx = process.argv.indexOf("--enrich-max");
  const enrichMax = enrichMaxIdx >= 0
    ? Number(process.argv[enrichMaxIdx + 1])
    : undefined;

  const result = await runEftsMaIngest({
    sinceDate,
    maxResults,
    dryRun,
    enrich,
    enrichMax,
  });

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
  if (result.enrich) {
    console.log(
      `Enrichment — enriched: ${result.enrich.enriched}, skipped: ${result.enrich.skipped}, failed: ${result.enrich.failed}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
