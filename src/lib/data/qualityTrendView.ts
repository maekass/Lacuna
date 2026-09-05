/**
 * String-formatted quality-history series for the /methods#data-quality trend.
 * Numbers are pre-formatted so the server section stays provenance-safe.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface QualityHistoryRow {
  readonly runAt: string;
  readonly backfilled?: boolean;
  readonly companies: { readonly avgScore: number };
  readonly acquisitions: { readonly avgScore: number };
  readonly provenance: { readonly uncovered: number };
  readonly disclosure: { readonly disclosureRate: number };
}

export interface QualityTrendPoint {
  readonly runAtLabel: string;
  readonly backfilled: boolean;
  readonly companiesAvgLabel: string;
  readonly dealsAvgLabel: string;
  readonly uncoveredLabel: string;
  readonly disclosureRateLabel: string;
  readonly companiesAvgPct: string;
  readonly dealsAvgPct: string;
  readonly uncoveredPct: string;
  readonly disclosurePct: string;
}

export interface QualityTrendView {
  readonly pointCountLabel: string;
  readonly liveCountLabel: string;
  readonly backfilledCountLabel: string;
  readonly latestCompaniesAvgLabel: string;
  readonly latestDealsAvgLabel: string;
  readonly latestUncoveredLabel: string;
  readonly latestDisclosureLabel: string;
  readonly points: readonly QualityTrendPoint[];
  readonly hasBackfilledRegion: boolean;
}

function historyPath(): string {
  return join(process.cwd(), "data/quality-history.jsonl");
}

function readRows(): QualityHistoryRow[] {
  const filePath = historyPath();
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as QualityHistoryRow);
}

function pct(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.round((value / max) * 1000) / 10}%`;
}

/**
 * Shape the committed quality-history JSONL for the methods trend chart.
 */
export function buildQualityTrendView(
  rows = readRows(),
): QualityTrendView {
  const live = rows.filter((row) => !row.backfilled);
  const backfilled = rows.filter((row) => row.backfilled);
  const latest = [...live].pop() ?? [...rows].pop();
  const uncoveredMax = Math.max(
    ...rows.map((row) => row.provenance.uncovered),
    1,
  );

  return {
    pointCountLabel: String(rows.length),
    liveCountLabel: String(live.length),
    backfilledCountLabel: String(backfilled.length),
    latestCompaniesAvgLabel: latest
      ? latest.companies.avgScore.toFixed(1)
      : "—",
    latestDealsAvgLabel: latest ? latest.acquisitions.avgScore.toFixed(1) : "—",
    latestUncoveredLabel: latest ? String(latest.provenance.uncovered) : "—",
    latestDisclosureLabel: latest
      ? `${(latest.disclosure.disclosureRate * 100).toFixed(1)}%`
      : "—",
    hasBackfilledRegion: backfilled.length > 0,
    points: rows.map((row) => ({
      runAtLabel: row.runAt.slice(0, 10),
      backfilled: Boolean(row.backfilled),
      companiesAvgLabel: row.companies.avgScore.toFixed(1),
      dealsAvgLabel: row.acquisitions.avgScore.toFixed(1),
      uncoveredLabel: String(row.provenance.uncovered),
      disclosureRateLabel: `${
        (row.disclosure.disclosureRate * 100).toFixed(1)
      }%`,
      companiesAvgPct: pct(row.companies.avgScore, 100),
      dealsAvgPct: pct(row.acquisitions.avgScore, 100),
      uncoveredPct: pct(row.provenance.uncovered, uncoveredMax),
      disclosurePct: pct(row.disclosure.disclosureRate * 100, 100),
    })),
  };
}
