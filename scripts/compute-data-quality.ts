#!/usr/bin/env npx tsx

/**
 * Data Quality Scorer
 *
 * Rates every data point in the verified dataset on provenance strength.
 * Scores each company and acquisition on:
 *  - Source quality (SEC filing > press release > Crunchbase > none)
 *  - Data completeness (how many fields are populated)
 *  - Verifiability (can the source be independently checked?)
 *
 * Output: src/data/computed-data-quality-scores.json
 *
 * Usage: npx tsx scripts/compute-data-quality.ts
 */

import { readFileSync, writeFileSync } from "fs";

interface SourceQuality {
  level: "A" | "B" | "C" | "D" | "F";
  description: string;
  score: number;
}

function scoreSource(source?: string): SourceQuality {
  if (!source) return { level: "F", description: "No source provided", score: 0 };

  const lower = source.toLowerCase();

  // Level A: Primary government filings
  if (lower.includes("sec") || lower.includes("edgar") || lower.includes("8-k") || lower.includes("10-k") || lower.includes("s-4") || lower.includes("s-1")) {
    return { level: "A", description: "SEC filing (primary government source)", score: 100 };
  }

  // Level B: Reputable press / trade publications
  if (lower.includes("techcrunch") || lower.includes("fierce healthcare") || lower.includes("stat news") || lower.includes("reuters") || lower.includes("bloomberg") || lower.includes("wsj") || lower.includes("ft.com") || lower.includes("endpoints") || lower.includes("axios")) {
    return { level: "B", description: "Reputable press/trade publication", score: 80 };
  }

  // Level C: Company announcement / press release
  if (lower.includes("press release") || lower.includes("company announcement") || lower.includes("pr newswire") || lower.includes("business wire")) {
    return { level: "C", description: "Company press release", score: 65 };
  }

  // Level D: Aggregators (Crunchbase, PitchBook summaries)
  if (lower.includes("crunchbase") || lower.includes("pitchbook") || lower.includes("cb insights") || lower.includes("tracxn")) {
    return { level: "D", description: "Data aggregator (secondary)", score: 50 };
  }

  // Level F: Unknown or no source
  return { level: "F", description: "Unverified or unknown source", score: 20 };
}

function scoreCompleteness(fields: Record<string, unknown>, requiredFields: string[]): number {
  const populated = requiredFields.filter(f => fields[f] !== undefined && fields[f] !== null && fields[f] !== "").length;
  return (populated / requiredFields.length) * 100;
}

interface CompanyRecord {
  id: string;
  name: string;
  sector: string;
  stage?: string;
  founded?: number;
  hq?: string;
  description?: string;
  lastKnownValuation?: number;
  valuationSource?: string;
  totalFunding?: number;
  sources?: string[];
}

interface AcquisitionRecord {
  id: string;
  targetId: string;
  targetName: string;
  acquirerName: string;
  dealValue?: number;
  announcedDate?: string;
  closedDate?: string;
  source?: string;
  dealType?: string;
}

interface EntityScore {
  id: string;
  name?: string;
  sector?: string;
  target?: string;
  acquirer?: string;
  sourceQuality: string;
  sourceDescription: string;
  completeness: number;
  hasValuation?: boolean;
  hasFunding?: boolean;
  hasSource: boolean;
  hasDealValue?: boolean;
  overallScore: number;
  grade: string;
}

// Main
const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
const companies: CompanyRecord[] = dataset.companies || [];
const acquisitions: AcquisitionRecord[] = dataset.acquisitions || [];

const companyScores: EntityScore[] = [];
const companyFields = ["id", "name", "sector", "stage", "founded", "hq", "description", "lastKnownValuation", "valuationSource", "totalFunding", "sources"];

for (const company of companies) {
  const sourceQuality = company.sources?.length > 0
    ? company.sources.map(scoreSource).reduce((best: SourceQuality, s: SourceQuality) => s.score > best.score ? s : best, scoreSource(company.sources[0]))
    : scoreSource(undefined);

  const completeness = scoreCompleteness(company, companyFields);
  const hasValuation = company.lastKnownValuation !== undefined && company.lastKnownValuation !== null;
  const hasFunding = company.totalFunding !== undefined && company.totalFunding !== null;
  const hasSource = company.sources?.length > 0;

  const overallScore = Math.round((sourceQuality.score * 0.5) + (completeness * 0.3) + ((hasValuation ? 100 : 0) * 0.1) + ((hasFunding ? 100 : 0) * 0.1));

  companyScores.push({
    id: company.id,
    name: company.name,
    sector: company.sector,
    sourceQuality: sourceQuality.level,
    sourceDescription: sourceQuality.description,
    completeness: Number(completeness.toFixed(0)),
    hasValuation,
    hasFunding,
    hasSource,
    overallScore,
    grade: overallScore >= 90 ? "A" : overallScore >= 75 ? "B" : overallScore >= 60 ? "C" : overallScore >= 40 ? "D" : "F",
  });
}

const acquisitionScores: EntityScore[] = [];
const acquisitionFields = ["id", "targetId", "acquirerName", "targetName", "dealValue", "announcedDate", "closedDate", "source", "dealType"];

for (const deal of acquisitions) {
  const sourceQuality = scoreSource(deal.source);
  const completeness = scoreCompleteness(deal, acquisitionFields);
  const hasDealValue = deal.dealValue !== undefined && deal.dealValue !== null;
  const hasSource = !!deal.source;

  const overallScore = Math.round((sourceQuality.score * 0.5) + (completeness * 0.3) + ((hasDealValue ? 100 : 0) * 0.15) + ((hasSource ? 100 : 0) * 0.05));

  acquisitionScores.push({
    id: deal.id,
    target: deal.targetName,
    acquirer: deal.acquirerName,
    sourceQuality: sourceQuality.level,
    sourceDescription: sourceQuality.description,
    completeness: Number(completeness.toFixed(0)),
    hasDealValue,
    hasSource,
    overallScore,
    grade: overallScore >= 90 ? "A" : overallScore >= 75 ? "B" : overallScore >= 60 ? "C" : overallScore >= 40 ? "D" : "F",
  });
}

// Summary stats
const companyGrades = companyScores.reduce((acc, s) => { acc[s.grade] = (acc[s.grade] || 0) + 1; return acc; }, {} as Record<string, number>);
const acquisitionGrades = acquisitionScores.reduce((acc, s) => { acc[s.grade] = (acc[s.grade] || 0) + 1; return acc; }, {} as Record<string, number>);

const output = {
  generatedAt: new Date().toISOString(),
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  grading: {
    A: "90-100: SEC filing or equivalent primary source, all fields populated",
    B: "75-89: Reputable press source, most fields populated",
    C: "60-74: Company press release or partial data",
    D: "40-59: Data aggregator only (Crunchbase, etc.), incomplete",
    F: "0-39: No source or unverified",
  },
  summary: {
    companies: {
      total: companyScores.length,
      grades: companyGrades,
      avgScore: Number((companyScores.reduce((sum, s) => sum + s.overallScore, 0) / companyScores.length).toFixed(1)),
    },
    acquisitions: {
      total: acquisitionScores.length,
      grades: acquisitionGrades,
      avgScore: Number((acquisitionScores.reduce((sum, s) => sum + s.overallScore, 0) / acquisitionScores.length).toFixed(1)),
    },
  },
  companies: companyScores,
  acquisitions: acquisitionScores,
};

writeFileSync("src/data/computed-data-quality-scores.json", JSON.stringify(output, null, 2));

console.log("✅ Data quality scores written to src/data/computed-data-quality-scores.json\n");

console.log("Company grades:");
for (const grade of ["A", "B", "C", "D", "F"]) {
  console.log(`  ${grade}: ${companyGrades[grade] || 0}`);
}
console.log(`  Average score: ${output.summary.companies.avgScore}\n`);

console.log("Acquisition grades:");
for (const grade of ["A", "B", "C", "D", "F"]) {
  console.log(`  ${grade}: ${acquisitionGrades[grade] || 0}`);
}
console.log(`  Average score: ${output.summary.acquisitions.avgScore}\n`);

// Flag low-quality data
const lowQualityCompanies = companyScores.filter(s => s.grade === "D" || s.grade === "F");
const lowQualityDeals = acquisitionScores.filter(s => s.grade === "D" || s.grade === "F");

if (lowQualityCompanies.length > 0) {
  console.log(`⚠️  ${lowQualityCompanies.length} companies with D/F grade (need better sourcing):`);
  lowQualityCompanies.slice(0, 10).forEach(c => console.log(`    ${c.name} (${c.sector}): grade=${c.grade}, score=${c.overallScore}`));
}

if (lowQualityDeals.length > 0) {
  console.log(`\n⚠️  ${lowQualityDeals.length} acquisitions with D/F grade (need better sourcing):`);
  lowQualityDeals.slice(0, 10).forEach(d => console.log(`    ${d.target} → ${d.acquirer}: grade=${d.grade}, score=${d.overallScore}`));
}
