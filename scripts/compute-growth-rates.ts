#!/usr/bin/env npx tsx

/**
 * Operating growth-rate derivation.
 *
 * MeshIC rule: CAGR is published only when beginning and ending values measure
 * the same economic quantity. Financing -> valuation/deal value is never
 * substituted for operating growth.
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

function computeCagr(
  startValue: number,
  endValue: number,
  years: number,
): number | null {
  if (years <= 0 || startValue <= 0 || endValue <= 0) return null;
  const value = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  return Number.isFinite(value) ? value : null;
}

const dataset = JSON.parse(
  readFileSync("src/data/dataset.verified.json", "utf-8"),
);
const companies: Company[] = dataset.companies ?? [];
const datasetHash = hashDataset(parseVerifiedDataset(dataset)).fullHash;
const generatedAt = generatedAtFromProvenance(dataset.provenance.lastUpdated);
const secPath = "src/data/computed-sec-revenue.json";
const secArtifact = existsSync(secPath)
  ? JSON.parse(readFileSync(secPath, "utf-8")) as {
    evidenceStatus?: string;
    records?: SecRevenueRecord[];
  }
  : {
    evidenceStatus: "withheld_missing_artifact",
    records: [] as SecRevenueRecord[],
  };

if (
  secArtifact.evidenceStatus?.startsWith("withheld") ||
  !secArtifact.records?.length
) {
  const output = {
    generatedAt,
    datasetHash,
    source: "Lacuna verified dataset + validated SEC annual revenue artifact",
    evidenceStatus: "withheld_pending_regeneration",
    reason:
      "SEC revenue evidence is currently withheld pending identity-validated regeneration. Financing-derived and valuation-derived rates are not substituted for operating growth.",
    companies: [],
    sectorMedians: {},
    method:
      "No company growth rate is published until the corrected SEC revenue artifact contains comparable annual operating revenue observations.",
    warning:
      "Missing operating data remains missing; financing and valuation changes are not substituted for revenue growth.",
  };
  writeFileSync(
    "src/data/computed-growth-rates.json",
    JSON.stringify(output, null, 2) + "\n",
  );
  console.log(
    "✅ Operating growth withheld deterministically while SEC revenue evidence is unavailable.",
  );
  process.exit(0);
}

const byCompany = new Map<string, SecRevenueRecord[]>();
for (const record of secArtifact.records ?? []) {
  if (
    !Number.isFinite(record.fiscalYear) || !Number.isFinite(record.revenue) ||
    record.revenue <= 0
  ) continue;
  const rows = byCompany.get(record.companyId) ?? [];
  rows.push(record);
  byCompany.set(record.companyId, rows);
}

const results: GrowthRateResult[] = companies.map((company) => {
  const rows = [...(byCompany.get(company.id) ?? [])].sort((a, b) =>
    a.fiscalYear - b.fiscalYear
  );
  if (rows.length < 2) {
    return {
      companyId: company.id,
      companyName: company.name,
      sector: company.sector,
      cagr: null,
      method: "withheld: fewer than 2 comparable annual revenue observations",
      yearsOfData: null,
      source: "No comparable identity-validated SEC annual revenue series",
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
      source: "Identity-validated SEC annual revenue series",
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

const bySector = new Map<string, number[]>();
for (const row of results) {
  if (row.cagr === null) continue;
  const rates = bySector.get(row.sector) ?? [];
  rates.push(row.cagr);
  bySector.set(row.sector, rates);
}

const sectorMedians: Record<string, {
  medianCAGR: number | null;
  sampleSize: number;
  confidence: "medium" | "low" | "none";
}> = {};
for (const sector of [...new Set(companies.map((company) => company.sector))]) {
  const rates = [...(bySector.get(sector) ?? [])].sort((a, b) => a - b);
  if (rates.length < 3) {
    sectorMedians[sector] = {
      medianCAGR: null,
      sampleSize: rates.length,
      confidence: rates.length ? "low" : "none",
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
  generatedAt,
  datasetHash,
  source:
    "Lacuna verified dataset + identity-validated SEC annual revenue artifact",
  evidenceStatus: "derived_from_validated_operating_revenue",
  companies: results,
  sectorMedians,
  method:
    "Revenue CAGR uses like-for-like annual SEC revenue observations only. Funding-to-valuation, funding-to-exit, and stage benchmark ratios are not published as growth rates.",
  warning:
    "Private-company operating growth is withheld when comparable sourced revenue observations are unavailable.",
};
writeFileSync(
  "src/data/computed-growth-rates.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  `✅ Revenue CAGR published for ${
    results.filter((row) => row.cagr !== null).length
  }/${results.length} companies.`,
);
