#!/usr/bin/env npx tsx
/**
 * SEC full-text search for 8-K Item 2.01 + women's health terms.
 * Writes staging/sec_ma_efts_hits.json (never auto-merges to verified dataset).
 *
 * Usage:
 *   SEC_EDGAR_USER_AGENT="..." npm run sec:search-ma
 *   SEC_EDGAR_USER_AGENT="..." npm run sec:search-ma -- --since 2024-01-01 --max 100
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { searchMaFilingsWomensHealth } from "../src/lib/ingestion/secFullTextSearch";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("Set SEC_EDGAR_USER_AGENT before EFTS search.");
    process.exit(1);
  }

  const sinceIdx = process.argv.indexOf("--since");
  const sinceDate = sinceIdx >= 0
    ? process.argv[sinceIdx + 1]
    : `${new Date().getFullYear() - 1}-01-01`;
  const maxIdx = process.argv.indexOf("--max");
  const max = maxIdx >= 0 ? Number(process.argv[maxIdx + 1]) : 50;

  console.log(`EFTS 8-K Item 2.01 search since ${sinceDate}…`);
  const hits = await searchMaFilingsWomensHealth(sinceDate, max);
  console.log(`Found ${hits.length} hit(s)`);

  const outDir = join(process.cwd(), "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "sec_ma_efts_hits.json");
  writeFileSync(
    outPath,
    `${JSON.stringify({ sinceDate, count: hits.length, hits }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
