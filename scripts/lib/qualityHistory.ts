/**
 * Shared types and helpers for the append-only quality-history JSONL ledger.
 * Readers assemble a row from committed artifacts — they do not recompute scores.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, runSweeps, toRows } from "../sweep-watchlist";
import { validateVerifiedDataset } from "../../src/lib/data/validateVerifiedDataset";
import { getStaticVerifiedDataset } from "../../src/lib/data/staticDataset";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(__dirname, "../..");
export const QUALITY_HISTORY_PATH = join(
  repoRoot,
  "data/quality-history.jsonl",
);
export const QUALITY_HISTORY_EXEMPTIONS_PATH = join(
  repoRoot,
  "scripts/quality-history-exemptions.json",
);

export const QUALITY_RATCHET_CATEGORIES = new Set([
  "dataset-expansion",
  "scoring-model",
  "provenance-census",
  "disclosure-mix",
  "backfill-correction",
]);

export interface QualityHistoryGrades {
  readonly A?: number;
  readonly B?: number;
  readonly C?: number;
  readonly D?: number;
  readonly F?: number;
}

export interface QualityHistoryRow {
  readonly runAt: string;
  readonly datasetHash: string;
  readonly datasetVersion: string;
  readonly companies: {
    readonly total: number;
    readonly avgScore: number;
    readonly grades: QualityHistoryGrades;
  };
  readonly acquisitions: {
    readonly total: number;
    readonly avgScore: number;
    readonly grades: QualityHistoryGrades;
  };
  readonly provenance: {
    readonly total: number;
    readonly covered: number;
    readonly exempt: number;
    readonly uncovered: number;
  };
  readonly disclosure: {
    readonly disclosureRate: number;
    readonly valuationRate: number;
  };
  readonly sweep: {
    readonly rowCount: number;
    readonly staleRows: number;
    readonly dupes: number;
    readonly schemaErrors: number;
  };
  readonly validateDatasetWarnings: number;
  readonly unreachableSourceUrls: number;
  readonly backfilled?: boolean;
}

export interface QualityHistoryExemption {
  readonly category: string;
  readonly reason: string;
  readonly addedAt: string;
  readonly fromDatasetHash?: string;
  readonly toDatasetHash?: string;
}

interface QualityArtifact {
  readonly datasetHash?: string;
  readonly summary: {
    readonly companies: {
      readonly total: number;
      readonly avgScore: number;
      readonly grades: QualityHistoryGrades;
    };
    readonly acquisitions: {
      readonly total: number;
      readonly avgScore: number;
      readonly grades: QualityHistoryGrades;
    };
  };
}

interface SummaryArtifact {
  readonly provenance: {
    readonly datasetHash?: string;
    readonly datasetVersion?: string;
  };
  readonly disclosure: {
    readonly disclosureRate: number;
    readonly valuationRate: number;
  };
}

interface ProvenanceArtifact {
  readonly total: number;
  readonly covered: number;
  readonly exempt: number;
  readonly uncovered: number;
}

interface PayerSnapshot {
  readonly uniqueSourceUrls: ReadonlyArray<{ readonly ok: boolean }>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

/** Calendar date (UTC) of an ISO timestamp. */
export function calendarDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Parse a JSONL ledger, skipping blank lines. */
export function readQualityHistory(
  filePath = QUALITY_HISTORY_PATH,
): QualityHistoryRow[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as QualityHistoryRow);
}

/** Serialize rows as JSONL with a trailing newline. */
export function serializeQualityHistory(
  rows: readonly QualityHistoryRow[],
): string {
  if (rows.length === 0) return "";
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

export function writeQualityHistory(
  rows: readonly QualityHistoryRow[],
  filePath = QUALITY_HISTORY_PATH,
): void {
  writeFileSync(filePath, serializeQualityHistory(rows));
}

/**
 * Replace the last row when datasetHash + calendar date match; otherwise append.
 */
export function upsertQualityHistoryRow(
  rows: readonly QualityHistoryRow[],
  next: QualityHistoryRow,
): QualityHistoryRow[] {
  const nextDate = calendarDate(next.runAt);
  const last = rows[rows.length - 1];
  if (
    last &&
    last.datasetHash === next.datasetHash &&
    calendarDate(last.runAt) === nextDate
  ) {
    return [...rows.slice(0, -1), next];
  }
  return [...rows, next];
}

function sweepToday(iso: string): string {
  return calendarDate(iso);
}

function collectSweep(runAt: string): QualityHistoryRow["sweep"] {
  const csvPath = join(repoRoot, "intel/biopharma-weekly/catalysts.csv");
  if (!existsSync(csvPath)) {
    return { rowCount: 0, staleRows: 0, dupes: 0, schemaErrors: 0 };
  }
  const rows = toRows(parseCsv(readFileSync(csvPath, "utf8")));
  const report = runSweeps(rows, sweepToday(runAt));
  return {
    rowCount: rows.length,
    staleRows: report.stale.length,
    dupes: report.dupes.length,
    schemaErrors: report.schemaErrors.length,
  };
}

function collectUnreachable(): number {
  const snapshotPath = join(
    repoRoot,
    "src/data/payer-ops-benchmarks.snapshot.json",
  );
  if (!existsSync(snapshotPath)) return 0;
  const snapshot = readJson<PayerSnapshot>(snapshotPath);
  return snapshot.uniqueSourceUrls.filter((row) => !row.ok).length;
}

function collectValidateWarnings(): number {
  try {
    return validateVerifiedDataset(getStaticVerifiedDataset()).warnings.length;
  } catch {
    return 0;
  }
}

/**
 * Assemble one ledger row from committed artifacts and existing gates.
 */
export function assembleQualityHistoryRow(options: {
  readonly runAt: string;
  readonly backfilled?: boolean;
  readonly qualityPath?: string;
  readonly summaryPath?: string;
  readonly provenancePath?: string;
}): QualityHistoryRow {
  const quality = readJson<QualityArtifact>(
    options.qualityPath ??
      join(repoRoot, "src/data/computed-data-quality-scores.json"),
  );
  const summary = readJson<SummaryArtifact>(
    options.summaryPath ??
      join(repoRoot, "src/data/computed-dataset-summary.json"),
  );
  const provenance = readJson<ProvenanceArtifact>(
    options.provenancePath ??
      join(repoRoot, "scripts/provenance-baseline.json"),
  );

  return {
    runAt: options.runAt,
    datasetHash: quality.datasetHash ?? summary.provenance.datasetHash ?? "",
    datasetVersion: summary.provenance.datasetVersion ?? "",
    companies: {
      total: quality.summary.companies.total,
      avgScore: quality.summary.companies.avgScore,
      grades: quality.summary.companies.grades,
    },
    acquisitions: {
      total: quality.summary.acquisitions.total,
      avgScore: quality.summary.acquisitions.avgScore,
      grades: quality.summary.acquisitions.grades,
    },
    provenance: {
      total: provenance.total,
      covered: provenance.covered,
      exempt: provenance.exempt,
      uncovered: provenance.uncovered,
    },
    disclosure: {
      disclosureRate: summary.disclosure.disclosureRate,
      valuationRate: summary.disclosure.valuationRate,
    },
    sweep: collectSweep(options.runAt),
    validateDatasetWarnings: collectValidateWarnings(),
    unreachableSourceUrls: collectUnreachable(),
    ...(options.backfilled ? { backfilled: true } : {}),
  };
}

export function lastLiveRow(
  rows: readonly QualityHistoryRow[],
): QualityHistoryRow | undefined {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!rows[i].backfilled) return rows[i];
  }
  return undefined;
}

export function validateQualityExemptions(
  exemptions: readonly QualityHistoryExemption[],
): void {
  const seen = new Set<string>();
  for (const exemption of exemptions) {
    if (
      !QUALITY_RATCHET_CATEGORIES.has(exemption.category) ||
      !exemption.reason.trim() ||
      !exemption.addedAt.trim()
    ) {
      throw new Error(
        `Invalid quality-history exemption ${
          JSON.stringify(exemption)
        }: categorized reason and addedAt are required.`,
      );
    }
    const key = `${exemption.category}::${exemption.fromDatasetHash ?? ""}::${
      exemption.toDatasetHash ?? ""
    }::${exemption.reason}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate quality-history exemption: ${key}`);
    }
    seen.add(key);
  }
}

function exemptionCovers(
  exemptions: readonly QualityHistoryExemption[],
  previous: QualityHistoryRow,
  current: QualityHistoryRow,
): boolean {
  return exemptions.some((exemption) => {
    const fromOk = !exemption.fromDatasetHash ||
      exemption.fromDatasetHash === previous.datasetHash;
    const toOk = !exemption.toDatasetHash ||
      exemption.toDatasetHash === current.datasetHash;
    return fromOk && toOk;
  });
}

/**
 * Fail when company avgScore drops more than 2 points or uncovered sites grow
 * versus the last non-backfilled row, unless a categorized exemption matches.
 */
export function qualityRatchetFailure(
  current: QualityHistoryRow,
  previous: QualityHistoryRow | undefined,
  exemptions: readonly QualityHistoryExemption[] = [],
): string | null {
  if (!previous) return null;
  validateQualityExemptions(exemptions);
  if (exemptionCovers(exemptions, previous, current)) return null;

  const scoreDrop = previous.companies.avgScore - current.companies.avgScore;
  const uncoveredUp =
    current.provenance.uncovered > previous.provenance.uncovered;
  if (scoreDrop <= 2 && !uncoveredUp) return null;

  const lines = [
    "Quality-history ratchet failed.",
    `Company avgScore: ${current.companies.avgScore} (previous live ${previous.companies.avgScore}).`,
    `Uncovered display sites: ${current.provenance.uncovered} (previous live ${previous.provenance.uncovered}).`,
    "Add a categorized exemption in scripts/quality-history-exemptions.json with a written reason,",
    "or restore the prior quality / provenance census.",
  ];
  return lines.join("\n");
}

export function loadQualityExemptions(
  filePath = QUALITY_HISTORY_EXEMPTIONS_PATH,
): QualityHistoryExemption[] {
  if (!existsSync(filePath)) return [];
  const exemptions = readJson<QualityHistoryExemption[]>(filePath);
  validateQualityExemptions(exemptions);
  return exemptions;
}

/** Markdown block for $GITHUB_STEP_SUMMARY. */
export function formatQualityStepSummary(
  current: QualityHistoryRow,
  previous?: QualityHistoryRow,
): string {
  const delta = (now: number, then?: number): string => {
    if (then === undefined) return "—";
    const diff = now - then;
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff}`;
  };
  return [
    "## Quality history",
    "",
    `| Metric | Current | Previous live | Δ |`,
    `| --- | --- | --- | --- |`,
    `| Company avgScore | ${current.companies.avgScore} | ${
      previous?.companies.avgScore ?? "—"
    } | ${delta(current.companies.avgScore, previous?.companies.avgScore)} |`,
    `| Deal avgScore | ${current.acquisitions.avgScore} | ${
      previous?.acquisitions.avgScore ?? "—"
    } | ${
      delta(current.acquisitions.avgScore, previous?.acquisitions.avgScore)
    } |`,
    `| Provenance covered | ${current.provenance.covered}/${current.provenance.total} | ${
      previous
        ? `${previous.provenance.covered}/${previous.provenance.total}`
        : "—"
    } | ${delta(current.provenance.covered, previous?.provenance.covered)} |`,
    `| Provenance uncovered | ${current.provenance.uncovered} | ${
      previous?.provenance.uncovered ?? "—"
    } | ${
      delta(current.provenance.uncovered, previous?.provenance.uncovered)
    } |`,
    `| Disclosure rate | ${
      (current.disclosure.disclosureRate * 100).toFixed(1)
    }% | ${
      previous
        ? `${(previous.disclosure.disclosureRate * 100).toFixed(1)}%`
        : "—"
    } | — |`,
    "",
  ].join("\n");
}
