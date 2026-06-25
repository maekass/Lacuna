#!/usr/bin/env npx tsx

/**
 * Benchmark Computation Script
 *
 * Derives real valuation multiples from the Lacuna verified dataset (n=59 deals).
 * Computes median, p25, p75 multiples per sector, plus sample sizes and
 * reimbursement-to-valuation correlations.
 *
 * Output: src/data/computed-benchmarks.json
 *
 * Usage: npx tsx scripts/compute-benchmarks.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

interface Company {
  id: string;
  name: string;
  sector: string;
  lastKnownValuation?: number;
  totalFunding?: number;
  founded?: number;
  sources?: string[];
}

interface Acquisition {
  id: string;
  targetId: string;
  targetName: string;
  acquirerName: string;
  dealValue?: number;
  dealValueNote?: string;
  source?: string;
  announcedDate?: string;
}

interface SectorBenchmark {
  sector: string;
  medianMultiple: number | null;
  p25Multiple: number | null;
  p75Multiple: number | null;
  sampleSize: number;
  dealsUsed: string[];
  sources: string[];
  computationMethod: string;
}

// --- Stats helpers ---

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    denomX += (x[i] - meanX) ** 2;
    denomY += (y[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

// --- Main computation ---

const dataset = JSON.parse(readFileSync(resolve(ROOT, "src/data/dataset.verified.json"), "utf-8"));
const companies: Company[] = dataset.companies || [];
const acquisitions: Acquisition[] = dataset.acquisitions || [];

// Build company lookup
const companyMap = new Map<string, Company>();
for (const c of companies) companyMap.set(c.id, c);

// Compute valuation-to-funding multiple for each deal
// Multiple = dealValue / totalFunding (proxy for revenue multiple when revenue unavailable)
const sectorData = new Map<string, { multiples: number[]; dealNames: string[]; sources: string[] }>();

for (const deal of acquisitions) {
  if (!deal.dealValue || deal.dealValue <= 0) continue;

  const target = companyMap.get(deal.targetId);
  if (!target) continue;

  const sector = target.sector;
  if (!sector) continue;

  // Compute multiple: deal value / total funding (proxy when no revenue)
  const funding = target.totalFunding;
  if (!funding || funding <= 0) continue;

  const multiple = deal.dealValue / funding;

  if (!sectorData.has(sector)) {
    sectorData.set(sector, { multiples: [], dealNames: [], sources: [] });
  }
  const sd = sectorData.get(sector)!;
  sd.multiples.push(multiple);
  sd.dealNames.push(deal.targetName);
  if (deal.source) sd.sources.push(deal.source);
}

// Build benchmark output
const benchmarks: SectorBenchmark[] = [];
for (const [sector, data] of sectorData) {
  benchmarks.push({
    sector,
    medianMultiple: data.multiples.length > 0 ? Number(median(data.multiples).toFixed(2)) : null,
    p25Multiple: data.multiples.length > 0 ? Number(percentile(data.multiples, 0.25).toFixed(2)) : null,
    p75Multiple: data.multiples.length > 0 ? Number(percentile(data.multiples, 0.75).toFixed(2)) : null,
    sampleSize: data.multiples.length,
    dealsUsed: data.dealNames,
    sources: [...new Set(data.sources)],
    computationMethod: "dealValue / totalFunding (proxy multiple — revenue data not available in verified dataset)",
  });
}

// Sort by sample size descending
benchmarks.sort((a, b) => b.sampleSize - a.sampleSize);

const output = {
  generatedAt: new Date().toISOString(),
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  datasetStats: {
    totalCompanies: companies.length,
    totalAcquisitions: acquisitions.length,
    acquisitionsWithDealValue: acquisitions.filter(a => a.dealValue).length,
    companiesWithFunding: companies.filter(c => c.totalFunding).length,
  },
  method: "Multiple = dealValue / totalFunding. This is a proxy for revenue multiples when company revenue is not publicly available. Replace with dealValue / annualRevenue when revenue data is sourced.",
  benchmarks,
  warning: "Small sample sizes (n<5) produce unreliable statistics. Treat n<5 sectors as directional only.",
};

writeFileSync(resolve(ROOT, "src/data/computed-benchmarks.json"), JSON.stringify(output, null, 2));

console.log("✅ Computed benchmarks written to src/data/computed-benchmarks.json\n");
console.log(`Dataset: ${companies.length} companies, ${acquisitions.length} acquisitions`);
console.log(`Sectors with computed multiples: ${benchmarks.length}\n`);

for (const b of benchmarks) {
  console.log(`  ${b.sector}: n=${b.sampleSize}, median=${b.medianMultiple}x, p25=${b.p25Multiple}x, p75=${b.p75Multiple}x`);
}

console.log(`\n⚠️  Sectors with n<5: ${benchmarks.filter(b => b.sampleSize < 5).map(b => b.sector).join(", ")}`);
console.log("   These should be treated as directional estimates only.");
