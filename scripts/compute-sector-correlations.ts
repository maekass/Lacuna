#!/usr/bin/env npx tsx

/**
 * Sector Correlation Script
 *
 * Computes the actual correlation between reimbursement status (hasCPTCode)
 * and valuation multiples using the verified dataset.
 *
 * Replaces fabricated reimbursementCorrelation values (0.42, 0.71, etc.)
 * with real Pearson correlations from verified deal data.
 *
 * Output: src/data/computed-sector-correlations.json
 *
 * Usage: npx tsx scripts/compute-sector-correlations.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface Company {
  id: string;
  name: string;
  sector: string;
  lastKnownValuation?: number;
  totalFunding?: number;
  sources?: string[];
}

interface Acquisition {
  targetId: string;
  targetName: string;
  dealValue?: number;
  source?: string;
}

// CPT code presence by sector (from cms-reimbursement-connector.ts)
// This maps sectors to whether they typically have CPT codes
const SECTOR_HAS_CPT: Record<string, boolean> = {
  "Fertility": false,
  "General Wellness": false,
  "Pelvic Health": true,
  "Mental Health": true,
  "Wearables": true,
  "Breast Health": true,
  "Gynecological Surgery": true,
  "Reproductive Health": false,
  "Maternal Health": true,
  "Diagnostics": true,
  "Contraception": true,
  "Precision Medicine": false,
  "Menopause": true,
  "Dermatology": true,
  "Sexual Wellness": false,
  "Consumer": false,
  "Medical Device": true,
  "Digital Health": true,
  "Therapeutics": false,
  "Tech Bio": false,
  "Diagnostic": true,
  "Biotech": false,
  "Reproductive": false,
  "Wellness": false,
};

function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
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

// Main
const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
const companies: Company[] = dataset.companies || [];
const acquisitions: Acquisition[] = dataset.acquisitions || [];

const companyMap = new Map<string, Company>();
for (const c of companies) companyMap.set(c.id, c);

// For each sector, compute correlation between hasCPTCode and dealValue/totalFunding
const sectorResults: any[] = [];

const allSectors = [...new Set(companies.map(c => c.sector))];

for (const sector of allSectors) {
  const sectorCompanies = companies.filter(c => c.sector === sector);
  const sectorAcquisitions = acquisitions.filter(a => {
    const target = companyMap.get(a.targetId);
    return target?.sector === sector && a.dealValue && target.totalFunding;
  });

  if (sectorAcquisitions.length < 2) {
    sectorResults.push({
      sector,
      correlation: null,
      sampleSize: sectorAcquisitions.length,
      method: "Insufficient data (n<2) for correlation",
      source: "Lacuna verified dataset",
      warning: "Sample too small for meaningful correlation",
    });
    continue;
  }

  // Binary: hasCPTCode (1/0) vs multiple (dealValue/totalFunding)
  const cptValues: number[] = [];
  const multiples: number[] = [];

  for (const deal of sectorAcquisitions) {
    const target = companyMap.get(deal.targetId)!;
    const hasCPT = SECTOR_HAS_CPT[sector] ? 1 : 0;
    const multiple = deal.dealValue! / target.totalFunding!;
    cptValues.push(hasCPT);
    multiples.push(multiple);
  }

  // If all same CPT status, correlation is undefined
  const allSame = cptValues.every(v => v === cptValues[0]);
  const correlation = allSame ? null : Number(pearson(cptValues, multiples).toFixed(3));

  sectorResults.push({
    sector,
    correlation,
    sampleSize: sectorAcquisitions.length,
    method: "Pearson(hasCPTCode, dealValue/totalFunding) from verified acquisitions",
    source: "Lacuna verified dataset + CMS CPT code mapping (cms-reimbursement-connector.ts)",
    warning: sectorAcquisitions.length < 5 ? "Small sample (n<5) — treat as directional only" : undefined,
  });
}

// Also compute overall (cross-sector) correlation
const allCpt: number[] = [];
const allMultiples: number[] = [];
for (const deal of acquisitions) {
  if (!deal.dealValue) continue;
  const target = companyMap.get(deal.targetId);
  if (!target?.totalFunding) continue;
  const hasCPT = SECTOR_HAS_CPT[target.sector] ? 1 : 0;
  allCpt.push(hasCPT);
  allMultiples.push(deal.dealValue / target.totalFunding);
}

const overallCorrelation = allCpt.length >= 2 && !allCpt.every(v => v === allCpt[0])
  ? Number(pearson(allCpt, allMultiples).toFixed(3))
  : null;

const output = {
  generatedAt: new Date().toISOString(),
  source: "Lacuna verified dataset (n=59 acquisitions) + CMS CPT code sector mapping",
  overallCorrelation: {
    correlation: overallCorrelation,
    sampleSize: allCpt.length,
    method: "Pearson(hasCPTCode, dealValue/totalFunding) across all sectors",
  },
  sectors: sectorResults,
  method: "Binary CPT code presence (1=has CPT codes, 0=no CPT codes) correlated with deal multiple (dealValue/totalFunding). CPT presence derived from cms-reimbursement-connector.ts sector mapping.",
  warning: "Binary CPT presence is a coarse proxy. For precise correlation, use per-company CPT code status when available. Small-n sectors (n<5) produce unreliable correlations.",
};

writeFileSync("src/data/computed-sector-correlations.json", JSON.stringify(output, null, 2));

console.log("✅ Sector correlations written to src/data/computed-sector-correlations.json\n");
console.log(`Overall correlation (hasCPT ↔ multiple): ${overallCorrelation} (n=${allCpt.length})\n`);
for (const s of sectorResults) {
  console.log(`  ${s.sector}: r=${s.correlation ?? "N/A"}, n=${s.sampleSize}`);
}
