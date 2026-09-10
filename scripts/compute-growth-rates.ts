#!/usr/bin/env npx tsx

/**
 * Growth-rate derivation.
 *
 * MeshIC rule: a CAGR is only published when the beginning and ending values
 * measure the same economic quantity. Total funding -> valuation/deal value is
 * therefore not treated as company growth.
 *
 * This script computes revenue CAGR only from validated SEC annual revenue
 * records. Private companies without comparable operating data remain null.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";
import { hashDataset } from "../src/lib/lineage/datasetHash";
import { parseVerifiedDataset } from "../src/lib/data/datasetSchema";

interface Company {
  id: string;
  name: string;
  sector: string;
}

interface SecRevenueRecord {
  companyId: string;
  companyName: string;
  fiscalYear: number;
  revenue: number;
  source: string;
  filingUrl: string;
}

interface GrowthRateResult {
  companyId: string;
  companyName: string;
  sector: string;
  cagr: number | null;
  method: string;
  yearsOfData: number | null;
  source: string;
  confidence: "high" | "medium" | "low" | "none";
}

function computeCagr(startValue: number, endValue: number, years: number): number | null {
  if (years <= 0 || startValue <= 0 || endValue <= 0) return null;
  const result = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  return Number.isFinite(result) ? result : null;
}

const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
const companies: Company[] = dataset.companies || [];

const secPath = "src/data/computed-sec-revenue.json";
const secArtifact = existsSync(secPath)
  ? JSON.parse(readFileSync(secPath, "utf-8")) as { records?: SecRevenueRecord[] }
  : { records: [] as SecRevenueRecord[] };

const byCompany = new Map<string, SecRevenueRecord[]>();
for (const record of secArtifact.records ?? []) {
  if (!Number.isFinite(record.fiscalYear) || !Number.isFinite(record.revenue) || record.revenue <= 0) continue;
  const rows = byCompany.get(record.companyId) ?? [];
  rows.push(record);
  byCompany.set(record.companyId, rows);
}

const results: GrowthRateResult[] = companies.map((company) => {
  const rows = [...(byCompany.get(company.id) ?? [])]
    .sort((a, b) => a.fiscalYear - b.fiscalYear);

  if (rows.length < 2) {
    return {
      companyId: company.id,
      companyName: company.name,
      sector: company.sector,
      cagr: null,
      method: "withheld: fewer than 2 comparable annual revenue observations",
      yearsOfData: null,
      source: "No comparable SEC annual revenue series",
      confidence: "none",
    };
  }

  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const years = last.fiscalYear - first.fiscalYear;
  const cagr = computeCagr(first.revenue, last.revenue, years);

  if (cagr === null) {
    return {
      companyId: company.id,
      companyName: company.name,
      sector: company.sector,
      cagr: null,
      method: "withheld: invalid comparable revenue interval",
      yearsOfData: years > 0 ? years : null,
      source: "SEC annual revenue series",
      confidence: "none",
    };
  }

  return {
    companyId: company.id,
    companyName: company.name,
    sector: company.sector,
    cagr: Number(cagr.toFixed(1)),
    method: `SEC revenue CAGR (${first.fiscalYear}–${last.fiscalYear})`,
    yearsOfData: years,
    source: `${first.source}; ${last.source}`,
    confidence: years >= 2 ? "high" : "medium",
  };
});

const sectorMap = new Map<string, number[]>();
for (const result of results) {
  if (result.cagr === null) continue;
  const values = sectorMap.get(result.sector) ?? [];
  values.push(result.cagr);
  sectorMap.set(result.sector, values);
}

const sectorMedians: Record<string, {
  medianCAGR: number | null;
  sampleSize: number;
  confidence: "medium" | "low" | "none";
}> = {};

for (const sector of [...new Set(companies.map((company) => company.sector))]) {
  const rates = [...(sectorMap.get(sector) ?? [])].sort((a, b) => a - b);
  if (rates.length < 3) {
    sectorMedians[sector] = {
      medianCAGR: null,
      sampleSize: rates.length,
      confidence: rates.length === 0 ? "none" : "low",
    };
    continue;
  }
  const mid = Math.floor(rates.length / 2);
  const median = rates.length % 2 === 0
    ? (rates[mid - 1]! + rates[mid]!) / 2
    : rates[mid]!;
  sectorMedians[sector] = {
    medianCAGR: Number(median.toFixed(1)),
    sampleSize: rates.length,
    confidence: rates.length >= 5 ? "medium" : "low",
  };
}

const output = {
  generatedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
  datasetHash: hashDataset(parseVerifiedDataset(dataset)).fullHash,
  source: "Lacuna verified dataset + validated SEC annual revenue artifact",
  companies: results,
  sectorMedians,
  method: "Revenue CAGR uses like-for-like annual SEC revenue observations only. Funding-to-valuation, funding-to-exit, and stage benchmark ratios are not published as growth rates.",
  warning: "Private-company operating growth is withheld when comparable sourced revenue observations are unavailable. Missingness is preferable to substituting financing or valuation changes for revenue growth.",
};

writeFileSync(
  "src/data/computed-growth-rates.json",
  JSON.stringify(output, null, 2) + "\n",
);

const published = results.filter((row) => row.cagr !== null);
console.log(`✅ Revenue CAGR published for ${published.length}/${results.length} companies; unsupported proxy growth withheld.`);
