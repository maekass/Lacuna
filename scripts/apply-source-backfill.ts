/**
 * Apply accepted SEC accession URLs from staging/source-backfill/results.json,
 * Livongo/Hologic citation repairs, and Diagnostic (portfolio) taxonomy.
 *
 * Does not invent press URLs for rejected EFTS rows.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const datasetPath = join(repoRoot, "src/data/dataset.verified.json");
const backfillPath = join(repoRoot, "staging/source-backfill/results.json");

interface Acquisition {
  id: string;
  source: string;
  announcedDate?: string;
  closedDate?: string;
  dealValueNote?: string;
  [key: string]: unknown;
}

interface Company {
  id: string;
  name: string;
  sector: string;
  valuationSource?: string;
  sources?: string[];
  [key: string]: unknown;
}

interface Dataset {
  provenance: {
    lastUpdated: string;
    notes: string[];
    [key: string]: unknown;
  };
  companies: Company[];
  acquisitions: Acquisition[];
  [key: string]: unknown;
}

interface BackfillRecord {
  dealId: string;
  status: string;
  ref?: { url?: string; form?: string } | null;
}

const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as Dataset;
const backfill = JSON.parse(readFileSync(backfillPath, "utf8")) as {
  records: BackfillRecord[];
};

dataset.provenance.lastUpdated = "2026-09-20";
const note =
  "2026-09-20: Appended 19 identity-checked SEC accession URLs from source backfill; corrected Teladoc/Livongo announcement to Aug 5, 2020; Hologic/Biotheranostics 8-K listed on the deal source; renamed portfolio sector Diagnostic → Diagnostic (portfolio).";
if (!dataset.provenance.notes.includes(note)) {
  dataset.provenance.notes.push(note);
}

const livongo = dataset.companies.find((c) => c.id === "c23");
if (livongo) {
  livongo.valuationSource =
    "Teladoc/Livongo merger close value (Oct 30, 2020) — SEC 8-K";
  livongo.sources = [
    "SEC 8-K filing (Teladoc, Aug 5, 2020 announcement; Oct 30, 2020 close)",
    "Teladoc Health investor relations press release (Aug 5, 2020)",
    "Crunchbase - crunchbase.com/organization/livongo-health",
  ];
}

const deal1 = dataset.acquisitions.find((d) => d.id === "deal1");
if (deal1) {
  deal1.announcedDate = "2020-08-05";
  deal1.closedDate = "2020-10-30";
  deal1.dealValueNote =
    "Close-date disclosed consideration (~$13.9B). Teladoc 8-K (Aug 5, 2020) valued the exchange at $18.5B on Teladoc's Aug 4, 2020 close.";
  deal1.source =
    "Teladoc Health 8-K filing, SEC EDGAR (Aug 5, 2020); Teladoc Health investor relations press release (Aug 5, 2020)";
}

const deal7 = dataset.acquisitions.find((d) => d.id === "deal7");
if (deal7) {
  deal7.source =
    "Hologic 8-K filing, SEC EDGAR (Jan 5, 2021); Hologic investor relations press release (Jan 5, 2021); Business Wire (Feb 22, 2021)";
}

let appended = 0;
for (const record of backfill.records) {
  if (record.status !== "accepted" || !record.ref?.url) continue;
  const deal = dataset.acquisitions.find((d) => d.id === record.dealId);
  if (!deal) continue;
  if (deal.source.includes(record.ref.url)) continue;
  const form = record.ref.form ? ` ${record.ref.form}` : "";
  deal.source = `${deal.source}; SEC EDGAR${form} ${record.ref.url}`;
  appended += 1;
}

let renamed = 0;
for (const company of dataset.companies) {
  if (company.sector === "Diagnostic") {
    company.sector = "Diagnostic (portfolio)";
    renamed += 1;
  }
}

writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(
  `Dataset patched: ${appended} accession URLs, ${renamed} Diagnostic (portfolio) companies`,
);
