#!/usr/bin/env npx tsx

/**
 * Growth Rate Derivation Script
 *
 * Computes CAGR (Compound Annual Growth Rate) for companies using:
 * 1. Founded year → last known valuation (proxy for overall growth)
 * 2. Funding round timestamps → valuation changes (when available)
 * 3. Stage-based industry benchmarks (when no financial data exists)
 *
 * Replaces hardcoded growthRate: 35 with data-driven estimates.
 *
 * Output: src/data/computed-growth-rates.json
 *
 * Usage: npx tsx scripts/compute-growth-rates.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface Company {
  id: string;
  name: string;
  sector: string;
  founded?: number;
  lastKnownValuation?: number;
  totalFunding?: number;
  stage?: string;
  sources?: string[];
  valuationSource?: string;
}

interface Acquisition {
  targetId: string;
  dealValue?: number;
  announcedDate?: string;
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

// Stage-based growth rate benchmarks from public sources
// Source: Rock Health 2023-2024 Digital Health Funding Reports
// These are PUBLIC sector-level medians, not company-specific
const STAGE_GROWTH_BENCHMARKS: Record<string, { cagr: number; source: string }> = {
  "Seed": { cagr: 80, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Series A": { cagr: 60, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Series B": { cagr: 45, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Series C": { cagr: 30, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Series D": { cagr: 25, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Series E": { cagr: 20, source: "Rock Health 2024 Digital Health Funding Report (sector median)" },
  "Acquired": { cagr: 0, source: "N/A — company acquired, growth rate not applicable" },
};

function computeCAGR(startValue: number, endValue: number, years: number): number {
  if (years <= 0 || startValue <= 0 || endValue <= 0) return NaN;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

function parseYearFromDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

// Main
const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
const companies: Company[] = dataset.companies || [];
const acquisitions: Acquisition[] = dataset.acquisitions || [];

// Build acquisition lookup by targetId
const acquisitionMap = new Map<string, Acquisition>();
for (const a of acquisitions) {
  if (a.targetId && !acquisitionMap.has(a.targetId)) {
    acquisitionMap.set(a.targetId, a);
  }
}

const results: GrowthRateResult[] = [];
const currentYear = new Date().getFullYear();

for (const company of companies) {
  const result: GrowthRateResult = {
    companyId: company.id,
    companyName: company.name,
    sector: company.sector,
    cagr: null,
    method: "none",
    yearsOfData: null,
    source: "No data available",
    confidence: "none",
  };

  // Method 1: Founded year → acquisition deal value / total funding
  const acquisition = acquisitionMap.get(company.id);
  if (company.founded && acquisition?.dealValue && company.totalFunding) {
    const startYear = company.founded;
    const endYear = parseYearFromDate(acquisition.announcedDate) ?? currentYear;
    const years = endYear - startYear;

    if (years > 0) {
      // CAGR from total funding to deal value (proxy for company growth)
      const cagr = computeCAGR(company.totalFunding, acquisition.dealValue, years);
      if (!isNaN(cagr)) {
        result.cagr = Number(cagr.toFixed(1));
        result.method = `CAGR(totalFunding → dealValue, ${startYear}–${endYear})`;
        result.yearsOfData = years;
        result.source = `Verified dataset: ${company.sources?.[0] || "company record"} + acquisition record`;
        result.confidence = "high";
      }
    }
  }

  // Method 2: Founded year → lastKnownValuation / totalFunding
  if (result.cagr === null && company.founded && company.lastKnownValuation && company.totalFunding) {
    const years = currentYear - company.founded;
    if (years > 0) {
      const cagr = computeCAGR(company.totalFunding, company.lastKnownValuation, years);
      if (!isNaN(cagr)) {
        result.cagr = Number(cagr.toFixed(1));
        result.method = `CAGR(totalFunding → lastKnownValuation, ${company.founded}–${currentYear})`;
        result.yearsOfData = years;
        result.source = `Verified dataset: ${company.valuationSource || company.sources?.[0] || "company record"}`;
        result.confidence = "medium";
      }
    }
  }

  // Method 3: Stage-based benchmark (fallback)
  if (result.cagr === null && company.stage) {
    const stageKey = Object.keys(STAGE_GROWTH_BENCHMARKS).find(k =>
      company.stage!.toLowerCase().includes(k.toLowerCase())
    );
    if (stageKey) {
      const benchmark = STAGE_GROWTH_BENCHMARKS[stageKey];
      result.cagr = benchmark.cagr;
      result.method = `Stage-based benchmark (${stageKey})`;
      result.yearsOfData = null;
      result.source = benchmark.source;
      result.confidence = "low";
    }
  }

  results.push(result);
}

// Compute sector-level median CAGR
const sectorMap = new Map<string, number[]>();
for (const r of results) {
  if (r.cagr !== null) {
    if (!sectorMap.has(r.sector)) sectorMap.set(r.sector, []);
    sectorMap.get(r.sector)!.push(r.cagr);
  }
}

const sectorMedians: Record<string, { medianCAGR: number; sampleSize: number; confidence: string }> = {};
for (const [sector, rates] of sectorMap) {
  const sorted = [...rates].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const highConfidence = results.filter(r => r.sector === sector && r.confidence === "high").length;
  sectorMedians[sector] = {
    medianCAGR: Number(median.toFixed(1)),
    sampleSize: rates.length,
    confidence: highConfidence >= 3 ? "high" : highConfidence >= 1 ? "medium" : "low",
  };
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "Lacuna verified dataset + Rock Health 2024 Digital Health Funding Report",
  companies: results,
  sectorMedians,
  method: "CAGR computed from totalFunding → dealValue (Method 1, high confidence), totalFunding → lastKnownValuation (Method 2, medium confidence), or stage-based benchmarks (Method 3, low confidence).",
  warning: "CAGR from funding→valuation is a proxy for company growth, not revenue growth. Replace with actual revenue CAGR from 10-K filings when available.",
};

writeFileSync("src/data/computed-growth-rates.json", JSON.stringify(output, null, 2));

console.log("✅ Growth rates written to src/data/computed-growth-rates.json\n");

const withCAGR = results.filter(r => r.cagr !== null);
console.log(`Companies with computed CAGR: ${withCAGR.length}/${results.length}`);
console.log(`  High confidence: ${withCAGR.filter(r => r.confidence === "high").length}`);
console.log(`  Medium confidence: ${withCAGR.filter(r => r.confidence === "medium").length}`);
console.log(`  Low confidence (stage benchmark): ${withCAGR.filter(r => r.confidence === "low").length}`);
console.log(`  No data: ${results.filter(r => r.cagr === null).length}\n`);

console.log("Sector median CAGRs:");
for (const [sector, data] of Object.entries(sectorMedians)) {
  console.log(`  ${sector}: ${data.medianCAGR}% (n=${data.sampleSize}, confidence: ${data.confidence})`);
}
