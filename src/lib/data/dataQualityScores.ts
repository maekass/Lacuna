/**
 * Typed reader for `computed-data-quality-scores.json`.
 * Server/scripts only — do not import from client components (the file is large).
 */

import scores from "@/data/computed-data-quality-scores.json";
import {
  type EntityQualitySummary,
  normalizeGradeCounts,
  type QualityFlag,
  type QualityGrade,
  type QualityLayerSummary,
} from "./qualityVisibility";

export interface DataQualityEntityScore {
  readonly id: string;
  readonly name?: string;
  readonly target?: string;
  readonly acquirer?: string;
  readonly grade: QualityGrade;
  readonly overallScore: number;
}

interface DataQualityScoresFile {
  readonly generatedAt: string;
  readonly datasetHash: string;
  readonly source: string;
  readonly grading: Readonly<Record<string, string>>;
  readonly summary: {
    readonly companies: {
      readonly total: number;
      readonly grades: Readonly<Record<string, number>>;
      readonly avgScore: number;
    };
    readonly acquisitions: {
      readonly total: number;
      readonly grades: Readonly<Record<string, number>>;
      readonly avgScore: number;
    };
  };
  readonly companies: readonly DataQualityEntityScore[];
  readonly acquisitions: readonly DataQualityEntityScore[];
}

const file = scores as DataQualityScoresFile;

function isGrade(value: string): value is QualityGrade {
  return value === "A" || value === "B" || value === "C" || value === "D" ||
    value === "F";
}

function toSummary(
  row: DataQualityScoresFile["summary"]["companies"],
): EntityQualitySummary {
  return {
    total: row.total,
    grades: normalizeGradeCounts(row.grades),
    avgScore: row.avgScore,
  };
}

function lowGradeFlags(
  rows: readonly DataQualityEntityScore[],
  labelFor: (row: DataQualityEntityScore) => string,
): QualityFlag[] {
  return rows
    .filter((row) => row.grade === "D" || row.grade === "F")
    .map((row) => ({
      id: row.id,
      label: labelFor(row),
      grade: isGrade(row.grade) ? row.grade : "F",
      score: row.overallScore,
    }))
    .sort((left, right) =>
      left.score - right.score ||
      left.label.localeCompare(right.label)
    );
}

/**
 * Parsed quality-score artifact (companies + acquisitions, A–F).
 */
export function getDataQualityScores(): DataQualityScoresFile {
  return file;
}

/**
 * Summary + D/F flags for the slim visibility artifact.
 */
export function buildQualityLayerSummary(): QualityLayerSummary {
  const grading = {
    A: file.grading.A ?? "",
    B: file.grading.B ?? "",
    C: file.grading.C ?? "",
    D: file.grading.D ?? "",
    F: file.grading.F ?? "",
  };
  return {
    companies: toSummary(file.summary.companies),
    acquisitions: toSummary(file.summary.acquisitions),
    grading,
    lowGradeCompanies: lowGradeFlags(
      file.companies,
      (row) => row.name ?? row.id,
    ),
    lowGradeDeals: lowGradeFlags(
      file.acquisitions,
      (row) =>
        row.target && row.acquirer ? `${row.target} → ${row.acquirer}` : row.id,
    ),
  };
}

/**
 * Per-company quality row from the computed artifact.
 */
export function getCompanyQuality(
  id: string,
): DataQualityEntityScore | undefined {
  return file.companies.find((row) => row.id === id);
}

/**
 * Per-acquisition quality row from the computed artifact.
 */
export function getAcquisitionQuality(
  id: string,
): DataQualityEntityScore | undefined {
  return file.acquisitions.find((row) => row.id === id);
}
