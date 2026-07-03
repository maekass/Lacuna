#!/usr/bin/env npx tsx
/**
 * Download SEC EDGAR daily index and extract Form D / D/A filings.
 * Tier 2 bulk path — complements EFTS search in sec:ingest-form-d.
 *
 * Usage:
 *   SEC_EDGAR_USER_AGENT="..." npm run sec:form-d-bulk
 *   SEC_EDGAR_USER_AGENT="..." npm run sec:form-d-bulk -- --date 2025-06-01
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { secFetchHeaders, secRateLimitPause } from "../src/lib/ingestion/secFairAccess";

interface FormDIndexRow {
  cik: string;
  companyName: string;
  formType: string;
  filingDate: string;
  filename: string;
}

function quarterForDate(iso: string): string {
  const month = Number(iso.slice(5, 7));
  const q = Math.ceil(month / 3);
  return `QTR${q}`;
}

function dailyIndexUrl(date: string): string {
  const year = date.slice(0, 4);
  const qtr = quarterForDate(date);
  const compact = date.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/daily-index/${year}/${qtr}/form.${compact}.idx`;
}

function parseFormIndex(text: string): FormDIndexRow[] {
  const lines = text.split("\n");
  const rows: FormDIndexRow[] = [];
  let inData = false;
  for (const line of lines) {
    if (line.startsWith("-----")) {
      inData = true;
      continue;
    }
    if (!inData || !line.trim()) continue;
    const cik = line.slice(0, 10).trim();
    const companyName = line.slice(11, 61).trim();
    const formType = line.slice(62, 74).trim();
    const filingDate = line.slice(86, 98).trim();
    const filename = line.slice(98).trim();
    if (formType !== "D" && formType !== "D/A") continue;
    rows.push({ cik, companyName, formType, filingDate, filename });
  }
  return rows;
}

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("Set SEC_EDGAR_USER_AGENT before bulk index download.");
    process.exit(1);
  }

  const dateIdx = process.argv.indexOf("--date");
  const date = dateIdx >= 0
    ? process.argv[dateIdx + 1]
    : new Date().toISOString().slice(0, 10);

  const url = dailyIndexUrl(date);
  console.log(`Fetching ${url}`);
  const res = await fetch(url, { headers: secFetchHeaders("text/plain, */*") });
  if (!res.ok) {
    console.error(`HTTP ${res.status} — index may not exist for ${date} (weekends/holidays)`);
    process.exit(1);
  }
  const text = await res.text();
  await secRateLimitPause();

  const rows = parseFormIndex(text);
  const outDir = join(process.cwd(), "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `sec_form_d_bulk_${date}.json`);
  writeFileSync(
    outPath,
    `${JSON.stringify({ date, sourceUrl: url, count: rows.length, rows }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Form D filings: ${rows.length} → ${outPath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
