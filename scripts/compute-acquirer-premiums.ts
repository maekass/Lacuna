#!/usr/bin/env npx tsx

/**
 * Deal Premium Analysis Script
 *
 * Computes actual acquirer premiums from verified M&A deals.
 * Premium = dealValue / target.lastKnownValuation (or totalFunding as fallback)
 *
 * Replaces hardcoded ACQUIRER_PREMIUMS (1.35x healthcare, 1.25x pharma, etc.)
 * with real premiums computed from verified transactions.
 *
 * Output: src/data/computed-acquirer-premiums.json
 *
 * Usage: npx tsx scripts/compute-acquirer-premiums.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface Company {
  id: string;
  name: string;
  sector: string;
  lastKnownValuation?: number;
  totalFunding?: number;
}

interface Acquisition {
  id: string;
  targetId: string;
  targetName: string;
  acquirerName: string;
  acquirerId?: string;
  dealValue?: number;
  dealValueNote?: string;
  source?: string;
  announcedDate?: string;
  dealType?: string;
  dealStructure?: string;
  preDealValuation?: number;
}

interface AcquirerPremium {
  acquirerName: string;
  deals: number;
  avgPremium: number | null;
  medianPremium: number | null;
  minPremium: number | null;
  maxPremium: number | null;
  sectors: string[];
  sources: string[];
  method: string;
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Main
const dataset = JSON.parse(
  readFileSync("src/data/dataset.verified.json", "utf-8"),
);
const companies: Company[] = dataset.companies || [];
const acquisitions: Acquisition[] = dataset.acquisitions || [];

const companyMap = new Map<string, Company>();
for (const c of companies) companyMap.set(c.id, c);

// Group deals by acquirer
const acquirerDeals = new Map<string, Acquisition[]>();
for (const deal of acquisitions) {
  if (!deal.dealValue) continue;
  const key = deal.acquirerName;
  if (!acquirerDeals.has(key)) acquirerDeals.set(key, []);
  acquirerDeals.get(key)!.push(deal);
}

const results: AcquirerPremium[] = [];

for (const [acquirerName, deals] of acquirerDeals) {
  const premiums: number[] = [];
  const sectors: string[] = [];
  const sources: string[] = [];

  for (const deal of deals) {
    const target = companyMap.get(deal.targetId);
    if (!target) continue;

    // Premium = dealValue / preDealValuation (preferred) or dealValue / lastKnownValuation or dealValue / totalFunding (fallback)
    const baseline = deal.preDealValuation ?? target.lastKnownValuation ??
      target.totalFunding;
    if (!baseline || baseline <= 0) continue;

    const premium = deal.dealValue! / baseline;
    premiums.push(premium);

    if (target.sector && !sectors.includes(target.sector)) {
      sectors.push(target.sector);
    }
    if (deal.source && !sources.includes(deal.source)) {
      sources.push(deal.source);
    }
  }

  results.push({
    acquirerName,
    deals: deals.length,
    avgPremium: premiums.length > 0
      ? Number(
        (premiums.reduce((a, b) => a + b, 0) / premiums.length).toFixed(2),
      )
      : null,
    medianPremium: premiums.length > 0
      ? Number(median(premiums).toFixed(2))
      : null,
    minPremium: premiums.length > 0
      ? Number(Math.min(...premiums).toFixed(2))
      : null,
    maxPremium: premiums.length > 0
      ? Number(Math.max(...premiums).toFixed(2))
      : null,
    sectors,
    sources,
    method:
      "Premium = dealValue / preDealValuation (preferred, from SEC filings & press), or dealValue / lastKnownValuation, or dealValue / totalFunding as last resort.",
  });
}

// Also compute by acquirer type (healthcare, tech, pharma, retail)
// Classify acquirers based on name patterns
function classifyAcquirer(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes("pharma") || lower.includes("pfizer") ||
    lower.includes("novartis") || lower.includes("roche") ||
    lower.includes("johnson") || lower.includes("merck")
  ) return "pharma";
  if (
    lower.includes("tech") || lower.includes("google") ||
    lower.includes("apple") || lower.includes("microsoft") ||
    lower.includes("amazon") || lower.includes("meta")
  ) return "tech";
  if (
    lower.includes("health") || lower.includes("medical") ||
    lower.includes("clinic") || lower.includes("hospital") ||
    lower.includes("care")
  ) return "healthcare";
  if (
    lower.includes("retail") || lower.includes("walmart") ||
    lower.includes("target") || lower.includes("cvs")
  ) return "retail";
  return "other";
}

const typeGroups = new Map<string, number[]>();
for (const r of results) {
  if (r.avgPremium === null) continue;
  const type = classifyAcquirer(r.acquirerName);
  if (!typeGroups.has(type)) typeGroups.set(type, []);
  typeGroups.get(type)!.push(r.avgPremium);
}

const acquirerTypePremiums: Record<
  string,
  { avgPremium: number; sampleSize: number }
> = {};
for (const [type, premiums] of typeGroups) {
  acquirerTypePremiums[type] = {
    avgPremium: Number(
      (premiums.reduce((a, b) => a + b, 0) / premiums.length).toFixed(2),
    ),
    sampleSize: premiums.length,
  };
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "Lacuna verified dataset (n=59 acquisitions)",
  acquirerPremiums: results,
  acquirerTypePremiums,
  method:
    "Premium = dealValue / lastKnownValuation (preferred) or dealValue / totalFunding (fallback). lastKnownValuation is the most recent pre-acquisition valuation from verified sources.",
  warning:
    "Premiums computed from totalFunding baseline are overestimates (funding ≠ valuation). Replace with pre-deal valuation when available. Small-n acquirers (n=1) have no statistical significance.",
};

writeFileSync(
  "src/data/computed-acquirer-premiums.json",
  JSON.stringify(output, null, 2),
);

console.log(
  "✅ Acquirer premiums written to src/data/computed-acquirer-premiums.json\n",
);
console.log(
  `Acquirers with computed premiums: ${
    results.filter((r) => r.avgPremium !== null).length
  }/${results.length}\n`,
);

for (const r of results.filter((r) => r.avgPremium !== null)) {
  console.log(
    `  ${r.acquirerName}: avg=${r.avgPremium}x, median=${r.medianPremium}x, n=${r.deals}`,
  );
}

console.log("\nBy acquirer type:");
for (const [type, data] of Object.entries(acquirerTypePremiums)) {
  console.log(`  ${type}: ${data.avgPremium}x (n=${data.sampleSize})`);
}
