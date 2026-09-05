/**
 * Narrow, string-formatted view of committed quality artifacts.
 * Numbers are pre-formatted so the methods section can stay a server
 * component without shipping the 72 KB quality file to the client.
 */

import qualityScores from "@/data/computed-data-quality-scores.json";
import datasetSummary from "@/data/computed-dataset-summary.json";
import payerOpsSnapshot from "@/data/payer-ops-benchmarks.snapshot.json";
import provenanceBaseline from "../../../scripts/provenance-baseline.json";
import provenanceExemptions from "../../../scripts/provenance-exemptions.json";

export type QualityGrade = "A" | "B" | "C" | "D" | "F";

export interface GradeBar {
  readonly grade: QualityGrade;
  readonly companiesCountLabel: string;
  readonly dealsCountLabel: string;
  readonly companiesWidth: string;
  readonly dealsWidth: string;
  readonly rubric: string;
}

export interface WeakCompanyRow {
  readonly id: string;
  readonly name: string;
  readonly sector: string;
  readonly grade: QualityGrade;
  readonly scoreLabel: string;
  readonly sourceDescription: string;
}

export interface UncoveredFileRow {
  readonly file: string;
  readonly countLabel: string;
  readonly width: string;
}

export interface ExemptionRow {
  readonly key: string;
  readonly category: string;
  readonly reason: string;
}

export interface CitationRow {
  readonly source: string;
  readonly sourceUrl: string;
  readonly httpStatusLabel: string;
  readonly okLabel: string;
}

export interface DataQualityView {
  readonly companiesTotalLabel: string;
  readonly dealsTotalLabel: string;
  readonly companiesAvgScoreLabel: string;
  readonly dealsAvgScoreLabel: string;
  readonly weakCompanyShareLabel: string;
  readonly weakCompanyLead: string;
  readonly lastUpdated: string;
  readonly datasetAgeDaysLabel: string;
  readonly disclosureRateLabel: string;
  readonly disclosureDetail: string;
  readonly coverageRateLabel: string;
  readonly coverageDetail: string;
  readonly provenanceCoveredLabel: string;
  readonly provenanceTotalLabel: string;
  readonly provenanceDialLabel: string;
  readonly gradeBars: readonly GradeBar[];
  readonly weakCompanies: readonly WeakCompanyRow[];
  readonly weakCompanyCountLabel: string;
  readonly uncoveredFiles: readonly UncoveredFileRow[];
  readonly exemptions: readonly ExemptionRow[];
  readonly citations: readonly CitationRow[];
  readonly citationsFetchedAt: string;
}

interface QualityFile {
  readonly grading: Record<QualityGrade, string>;
  readonly summary: {
    readonly companies: {
      readonly total: number;
      readonly avgScore: number;
      readonly grades: Partial<Record<QualityGrade, number>>;
    };
    readonly acquisitions: {
      readonly total: number;
      readonly avgScore: number;
      readonly grades: Partial<Record<QualityGrade, number>>;
    };
  };
  readonly companies: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly sector: string;
    readonly grade: QualityGrade;
    readonly overallScore: number;
    readonly sourceDescription: string;
  }>;
}

interface ProvenanceFile {
  readonly total: number;
  readonly covered: number;
  readonly perFileUncovered: Readonly<Record<string, number>>;
}

interface ExemptionFile {
  readonly key: string;
  readonly category: string;
  readonly reason: string;
}

interface PayerSnapshot {
  readonly fetchedAt: string;
  readonly uniqueSourceUrls: ReadonlyArray<{
    readonly source: string;
    readonly sourceUrl: string;
    readonly httpStatus: number | null;
    readonly ok: boolean;
    readonly error?: string;
  }>;
}

interface SummaryFile {
  readonly provenance: { readonly lastUpdated: string };
  readonly disclosure: {
    readonly dealsTotal: number;
    readonly dealsDisclosed: number;
    readonly dealsUndisclosed: number;
    readonly disclosureRate: number;
    readonly companiesWithValuation: number;
    readonly companiesTotal: number;
    readonly valuationRate: number;
  };
  readonly headline: {
    readonly coverageRate: number;
    readonly coverageDenominator: number;
    readonly coverageReferenceName: string;
  };
}

const GRADE_ORDER: QualityGrade[] = ["A", "B", "C", "D", "F"];

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function datasetAgeDays(lastUpdated: string, now = new Date()): number {
  const asOf = new Date(`${lastUpdated}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - asOf.getTime()) / 86_400_000));
}

/**
 * Shape quality artifacts for the /methods#data-quality server section.
 */
export function buildDataQualityView(now = new Date()): DataQualityView {
  const quality = qualityScores as QualityFile;
  const summary = datasetSummary as SummaryFile;
  const provenance = provenanceBaseline as ProvenanceFile;
  const exemptions = provenanceExemptions as ExemptionFile[];
  const payer = payerOpsSnapshot as PayerSnapshot;

  const companyGrades = quality.summary.companies.grades;
  const dealGrades = quality.summary.acquisitions.grades;
  const companyMax = Math.max(
    ...GRADE_ORDER.map((grade) => companyGrades[grade] ?? 0),
    1,
  );
  const dealMax = Math.max(
    ...GRADE_ORDER.map((grade) => dealGrades[grade] ?? 0),
    1,
  );

  const weakCompanies = quality.companies
    .filter((row) => row.grade === "D" || row.grade === "F")
    .sort((left, right) =>
      left.overallScore - right.overallScore ||
      left.name.localeCompare(right.name)
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      sector: row.sector,
      grade: row.grade,
      scoreLabel: String(row.overallScore),
      sourceDescription: row.sourceDescription,
    }));

  const uncoveredEntries = Object.entries(provenance.perFileUncovered)
    .sort((left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, 20);
  const uncoveredMax = Math.max(
    ...uncoveredEntries.map((entry) => entry[1]),
    1,
  );

  const lastUpdated = summary.provenance.lastUpdated;
  const ageDays = datasetAgeDays(lastUpdated, now);
  const weakShare = quality.summary.companies.total > 0
    ? ((weakCompanies.length / quality.summary.companies.total) * 100).toFixed(
      1,
    )
    : "0.0";
  const coveragePct = provenance.total > 0
    ? ((provenance.covered / provenance.total) * 100).toFixed(1)
    : "0.0";

  return {
    companiesTotalLabel: String(quality.summary.companies.total),
    dealsTotalLabel: String(quality.summary.acquisitions.total),
    companiesAvgScoreLabel: quality.summary.companies.avgScore.toFixed(1),
    dealsAvgScoreLabel: quality.summary.acquisitions.avgScore.toFixed(1),
    weakCompanyShareLabel: `${weakShare}%`,
    weakCompanyLead:
      `${weakCompanies.length} of ${quality.summary.companies.total} company records (${weakShare}%) are graded D or F — aggregator-only or unverified sourcing`,
    lastUpdated,
    datasetAgeDaysLabel: `${ageDays} day${ageDays === 1 ? "" : "s"} old`,
    disclosureRateLabel: `${
      (summary.disclosure.disclosureRate * 100).toFixed(1)
    }%`,
    disclosureDetail:
      `${summary.disclosure.dealsDisclosed} of ${summary.disclosure.dealsTotal} deals disclosed a price · company valuation rate ${
        (summary.disclosure.valuationRate * 100).toFixed(1)
      }% (${summary.disclosure.companiesWithValuation}/${summary.disclosure.companiesTotal})`,
    coverageRateLabel: `${(summary.headline.coverageRate * 100).toFixed(1)}%`,
    coverageDetail: `${
      (summary.headline.coverageRate * 100).toFixed(1)
    }% of ${summary.headline.coverageDenominator} exits in ${summary.headline.coverageReferenceName}`,
    provenanceCoveredLabel: String(provenance.covered),
    provenanceTotalLabel: String(provenance.total),
    provenanceDialLabel:
      `${provenance.covered} / ${provenance.total} numeric display sites instrumented (${coveragePct}%)`,
    gradeBars: GRADE_ORDER.map((grade) => ({
      grade,
      companiesCountLabel: String(companyGrades[grade] ?? 0),
      dealsCountLabel: String(dealGrades[grade] ?? 0),
      companiesWidth: pct(companyGrades[grade] ?? 0, companyMax),
      dealsWidth: pct(dealGrades[grade] ?? 0, dealMax),
      rubric: quality.grading[grade],
    })),
    weakCompanies,
    weakCompanyCountLabel: String(weakCompanies.length),
    uncoveredFiles: uncoveredEntries.map(([file, count]) => ({
      file,
      countLabel: String(count),
      width: pct(count, uncoveredMax),
    })),
    exemptions: exemptions.map((entry) => ({
      key: entry.key,
      category: entry.category,
      reason: entry.reason,
    })),
    citations: payer.uniqueSourceUrls.map((row) => ({
      source: row.source,
      sourceUrl: row.sourceUrl,
      httpStatusLabel: row.httpStatus === null ? "—" : String(row.httpStatus),
      okLabel: row.ok ? "ok" : (row.error ?? "unreachable"),
    })),
    citationsFetchedAt: payer.fetchedAt,
  };
}
