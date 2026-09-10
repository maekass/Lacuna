#!/usr/bin/env npx tsx

/**
 * Data quality scorer.
 *
 * MeshIC rule: provenance strength and record completeness are separate axes.
 * A complete row cannot become primary-source evidence merely because more
 * fields are populated.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";
import { hashDataset } from "../src/lib/lineage/datasetHash";
import { parseVerifiedDataset } from "../src/lib/data/datasetSchema";

type EvidenceGrade = "A" | "B" | "C" | "D" | "F";

interface SourceQuality {
  level: EvidenceGrade;
  description: string;
  score: number;
}

function scoreSource(source?: string): SourceQuality {
  if (!source?.trim()) {
    return { level: "F", description: "No resolvable source provided", score: 0 };
  }
  const lower = source.toLowerCase();

  if (
    lower.includes("sec.gov") || lower.includes("sec edgar") ||
    lower.includes("8-k") || lower.includes("10-k") ||
    lower.includes("defm14a") || lower.includes("s-4") || lower.includes("s-1") ||
    lower.includes("stock exchange filing")
  ) {
    return { level: "A", description: "Primary regulatory/government filing", score: 100 };
  }

  if (
    lower.includes("investor relations") || lower.includes("company press release") ||
    lower.includes("company announcement") || lower.includes("business wire") ||
    lower.includes("pr newswire") || lower.includes("globe newswire")
  ) {
    return { level: "B", description: "Named first-party corporate disclosure", score: 80 };
  }

  if (
    lower.includes("reuters") || lower.includes("bloomberg") ||
    lower.includes("wsj") || lower.includes("ft.com") ||
    lower.includes("techcrunch") || lower.includes("fierce healthcare") ||
    lower.includes("stat news") || lower.includes("endpoints") ||
    lower.includes("axios") || lower.includes("forbes")
  ) {
    return { level: "C", description: "Independent press/trade source", score: 65 };
  }

  if (
    lower.includes("crunchbase") || lower.includes("pitchbook") ||
    lower.includes("cb insights") || lower.includes("tracxn") ||
    lower.includes("linkedin")
  ) {
    return { level: "D", description: "Aggregator/profile/discovery source", score: 40 };
  }

  return { level: "F", description: "Unclassified or non-resolvable citation", score: 20 };
}

function bestSource(sources: readonly string[]): SourceQuality {
  if (sources.length === 0) return scoreSource(undefined);
  return sources.map(scoreSource).reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

function scoreCompleteness(fields: Record<string, unknown>, required: readonly string[]): number {
  const populated = required.filter((field) => {
    const value = fields[field];
    return value !== undefined && value !== null && value !== "";
  }).length;
  return Math.round((populated / required.length) * 100);
}

interface EntityScore {
  id: string;
  name?: string;
  sector?: string;
  target?: string;
  acquirer?: string;
  sourceQuality: EvidenceGrade;
  /** Backward-compatible public evidence grade. */
  grade: EvidenceGrade;
  sourceDescription: string;
  completeness: number;
  evidenceScore: number;
  /** Utility/completeness score; never upgrades `grade`. */
  overallScore: number;
  recordUtilityScore: number;
  hasValuation?: boolean;
  hasFunding?: boolean;
  hasDealValue?: boolean;
  hasSource: boolean;
}

const dataset = JSON.parse(readFileSync("src/data/dataset.verified.json", "utf-8"));
const companies = dataset.companies ?? [];
const acquisitions = dataset.acquisitions ?? [];

const companyFields = [
  "id", "name", "sector", "stage", "founded", "hq", "description",
  "lastKnownValuation", "valuationSource", "totalFunding", "sources",
] as const;

const companyScores: EntityScore[] = companies.map((company: Record<string, unknown> & {
  id: string;
  name: string;
  sector: string;
  sources?: string[];
  lastKnownValuation?: number;
  totalFunding?: number;
}) => {
  const sourceQuality = bestSource(company.sources ?? []);
  const completeness = scoreCompleteness(company, companyFields);
  const hasValuation = company.lastKnownValuation != null;
  const hasFunding = company.totalFunding != null;
  const utility = Math.round(
    sourceQuality.score * 0.45 + completeness * 0.35 +
    (hasValuation ? 10 : 0) + (hasFunding ? 10 : 0),
  );

  return {
    id: company.id,
    name: company.name,
    sector: company.sector,
    sourceQuality: sourceQuality.level,
    grade: sourceQuality.level,
    sourceDescription: sourceQuality.description,
    completeness,
    evidenceScore: sourceQuality.score,
    overallScore: utility,
    recordUtilityScore: utility,
    hasValuation,
    hasFunding,
    hasSource: (company.sources?.length ?? 0) > 0,
  };
});

const acquisitionFields = [
  "id", "targetId", "acquirerName", "targetName", "dealValue",
  "announcedDate", "closedDate", "source", "dealType",
] as const;

const acquisitionScores: EntityScore[] = acquisitions.map((deal: Record<string, unknown> & {
  id: string;
  targetName: string;
  acquirerName: string;
  source?: string;
  dealValue?: number;
}) => {
  const sourceQuality = scoreSource(deal.source);
  const completeness = scoreCompleteness(deal, acquisitionFields);
  const hasDealValue = deal.dealValue != null;
  const utility = Math.round(
    sourceQuality.score * 0.55 + completeness * 0.35 +
    (hasDealValue ? 10 : 0),
  );

  return {
    id: deal.id,
    target: deal.targetName,
    acquirer: deal.acquirerName,
    sourceQuality: sourceQuality.level,
    grade: sourceQuality.level,
    sourceDescription: sourceQuality.description,
    completeness,
    evidenceScore: sourceQuality.score,
    overallScore: utility,
    recordUtilityScore: utility,
    hasDealValue,
    hasSource: Boolean(deal.source?.trim()),
  };
});

function gradeCounts(rows: readonly EntityScore[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.grade] = (counts[row.grade] ?? 0) + 1;
    return counts;
  }, {});
}

function averageUtility(rows: readonly EntityScore[]): number {
  if (rows.length === 0) return 0;
  return Number((rows.reduce((sum, row) => sum + row.recordUtilityScore, 0) / rows.length).toFixed(1));
}

const output = {
  generatedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
  datasetHash: hashDataset(parseVerifiedDataset(dataset)).fullHash,
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  grading: {
    A: "Primary regulatory/government filing",
    B: "Named first-party corporate disclosure",
    C: "Independent reputable press/trade source",
    D: "Aggregator/profile/discovery source",
    F: "Missing, non-resolvable, or unclassified source",
  },
  scoringNote: "grade/sourceQuality represents evidence provenance only. overallScore/recordUtilityScore combines evidence strength and completeness for workflow prioritization and must not be interpreted as provenance grade.",
  summary: {
    companies: {
      total: companyScores.length,
      grades: gradeCounts(companyScores),
      avgScore: averageUtility(companyScores),
    },
    acquisitions: {
      total: acquisitionScores.length,
      grades: gradeCounts(acquisitionScores),
      avgScore: averageUtility(acquisitionScores),
    },
  },
  companies: companyScores,
  acquisitions: acquisitionScores,
};

writeFileSync(
  "src/data/computed-data-quality-scores.json",
  JSON.stringify(output, null, 2) + "\n",
);

console.log("✅ Data quality scores written with evidence grade separated from record utility.");
console.log(`Companies: ${companyScores.length}; acquisitions: ${acquisitionScores.length}`);
