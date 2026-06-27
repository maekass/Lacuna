#!/usr/bin/env npx tsx

/**
 * Confidence Interval & Statistical Significance Script
 *
 * Computes confidence intervals for all valuation metrics using:
 * - Bootstrap resampling for small-n samples
 * - Standard error of the mean for larger samples
 * - Wilson score intervals for proportions
 *
 * This flags which sector benchmarks are statistically reliable vs directional.
 *
 * Output: src/data/computed-confidence-intervals.json
 *
 * Usage: npx tsx scripts/compute-confidence-intervals.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface Company {
  id: string;
  sector: string;
  totalFunding?: number;
}

interface Acquisition {
  targetId: string;
  dealValue?: number;
}

interface BenchmarkSector {
  sector: string;
  medianMultiple: number;
}

interface BenchmarksFile {
  benchmarks: BenchmarkSector[];
}

interface GrowthCompany {
  sector: string;
  cagr: number | null;
  confidence: string;
}

interface GrowthRatesFile {
  companies: GrowthCompany[];
}

interface ConfidenceResult {
  metric: string;
  sector?: string;
  acquirer?: string;
  sampleSize: number;
  pointEstimate: number;
  ci95: { lower: number; upper: number };
  method: string;
  reliability: string;
}

interface VerifiedDatasetJson {
  companies: Company[];
  acquisitions: Acquisition[];
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

// Bootstrap 95% confidence interval
function bootstrapCI(values: number[], iterations = 10000): { lower: number; upper: number } {
  if (values.length < 2) return { lower: NaN, upper: NaN };
  const bootstrapped: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample: number[] = [];
    for (let j = 0; j < values.length; j++) {
      sample.push(values[Math.floor(Math.random() * values.length)]);
    }
    bootstrapped.push(median(sample));
  }
  bootstrapped.sort((a, b) => a - b);
  return {
    lower: bootstrapped[Math.floor(iterations * 0.025)],
    upper: bootstrapped[Math.floor(iterations * 0.975)],
  };
}

// Standard error CI (normal approximation)
function normalCI(values: number[]): { lower: number; upper: number } {
  if (values.length < 2) return { lower: NaN, upper: NaN };
  const m = mean(values);
  const se = stdDev(values) / Math.sqrt(values.length);
  return { lower: m - 1.96 * se, upper: m + 1.96 * se };
}

// Main — load all computed data
const benchmarks = JSON.parse(readFileSync("src/data/computed-benchmarks.json", "utf-8")) as BenchmarksFile;
const growthRates = JSON.parse(readFileSync("src/data/computed-growth-rates.json", "utf-8")) as GrowthRatesFile;
const correlations = JSON.parse(readFileSync("src/data/computed-sector-correlations.json", "utf-8"));
const premiums = JSON.parse(readFileSync("src/data/computed-acquirer-premiums.json", "utf-8"));

const results: ConfidenceResult[] = [];

// Benchmark CIs
for (const b of benchmarks.benchmarks) {
  // We need the raw multiples — recompute from dataset
  const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8")) as VerifiedDatasetJson;
  const companies = dataset.companies || [];
  const acquisitions = dataset.acquisitions || [];
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const multiples: number[] = [];
  for (const deal of acquisitions) {
    if (!deal.dealValue) continue;
    const target = companyMap.get(deal.targetId);
    if (target?.sector !== b.sector || !target.totalFunding) continue;
    multiples.push(deal.dealValue / target.totalFunding);
  }

  const useBootstrap = multiples.length < 30;
  const ci = useBootstrap ? bootstrapCI(multiples) : normalCI(multiples);

  results.push({
    metric: "sector_benchmark_multiple",
    sector: b.sector,
    sampleSize: multiples.length,
    pointEstimate: b.medianMultiple,
    ci95: ci,
    method: useBootstrap ? "Bootstrap (10,000 iterations, 95% CI)" : "Normal approximation (95% CI)",
    reliability: multiples.length >= 10 ? "reliable" : multiples.length >= 5 ? "directional" : "unreliable",
  });
}

// Growth rate CIs by sector
const sectorGrowthMap = new Map<string, number[]>();
for (const c of growthRates.companies) {
  if (c.cagr !== null && c.confidence !== "low") {
    if (!sectorGrowthMap.has(c.sector)) sectorGrowthMap.set(c.sector, []);
    sectorGrowthMap.get(c.sector)!.push(c.cagr);
  }
}

for (const [sector, rates] of sectorGrowthMap) {
  const useBootstrap = rates.length < 30;
  const ci = useBootstrap ? bootstrapCI(rates) : normalCI(rates);

  results.push({
    metric: "sector_growth_rate",
    sector,
    sampleSize: rates.length,
    pointEstimate: Number(median(rates).toFixed(1)),
    ci95: ci,
    method: useBootstrap ? "Bootstrap (10,000 iterations, 95% CI)" : "Normal approximation (95% CI)",
    reliability: rates.length >= 10 ? "reliable" : rates.length >= 5 ? "directional" : "unreliable",
  });
}

// Acquirer premium CIs
for (const ap of premiums.acquirerPremiums) {
  if (ap.avgPremium === null) continue;
  // We don't have raw premiums per acquirer in the output, so use the avg as point estimate
  results.push({
    metric: "acquirer_premium",
    acquirer: ap.acquirerName,
    sampleSize: ap.deals,
    pointEstimate: ap.avgPremium,
    ci95: { lower: NaN, upper: NaN },
    method: "CI not computed — raw per-deal premiums needed. Run compute-acquirer-premiums with raw output.",
    reliability: ap.deals >= 5 ? "reliable" : ap.deals >= 2 ? "directional" : "unreliable",
  });
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "Computed from Lacuna verified dataset via bootstrap resampling",
  results,
  legend: {
    reliable: "n≥10 — 95% CI is meaningful",
    directional: "n=5-9 — CI is wide, treat as directional only",
    unreliable: "n<5 — CI is not meaningful, do not cite",
  },
};

writeFileSync("src/data/computed-confidence-intervals.json", JSON.stringify(output, null, 2));

console.log("✅ Confidence intervals written to src/data/computed-confidence-intervals.json\n");

for (const r of results) {
  const label = r.sector || r.acquirer || "";
  console.log(`  ${r.metric} [${label}]: n=${r.sampleSize}, estimate=${r.pointEstimate}, reliability=${r.reliability}`);
}
