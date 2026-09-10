/**
 * Server-only view of intel/biopharma-weekly/catalysts.csv.
 * Does not import the verified dataset JSON.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseCsv,
  toRows,
  type WatchlistRow,
} from "../../../scripts/sweep-watchlist";

export interface CatalystRowView {
  readonly scheduledDate: string;
  readonly company: string;
  readonly drug: string;
  readonly eventType: string;
  readonly status: string;
  readonly indication: string;
  readonly dateBasis: string;
  readonly datePrecision: string;
  readonly actualDate: string;
  readonly womensHealthRelevant: boolean;
  readonly trackedLabel: string;
  readonly sourceUrl: string;
}

export interface CatalystWatchlistView {
  readonly rowCountLabel: string;
  readonly whCountLabel: string;
  readonly trackedCountLabel: string;
  readonly windowLabel: string;
  readonly allRows: readonly CatalystRowView[];
  readonly womensHealthRows: readonly CatalystRowView[];
  readonly trackedRows: readonly CatalystRowView[];
}

function csvPath(): string {
  return join(process.cwd(), "intel/biopharma-weekly/catalysts.csv");
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toView(row: WatchlistRow): CatalystRowView {
  const tracked = [
    row.lacuna_acquirer_id,
    row.lacuna_company_id,
    row.lacuna_sector,
  ].filter(Boolean).join(" · ");
  return {
    scheduledDate: row.scheduled_date,
    company: row.company,
    drug: row.drug,
    eventType: row.event_type,
    status: row.status,
    indication: row.indication,
    dateBasis: row.date_basis,
    datePrecision: row.date_precision,
    actualDate: row.actual_date,
    womensHealthRelevant: row.womens_health_relevant === "true",
    trackedLabel: tracked,
    sourceUrl: row.source_url,
  };
}

/**
 * Shape the committed catalyst CSV for the /intelligence watchlist table.
 */
export function buildCatalystWatchlistView(
  today = new Date().toISOString().slice(0, 10),
): CatalystWatchlistView {
  const rows = toRows(parseCsv(readFileSync(csvPath(), "utf8")));
  const horizon = addDays(today, 90);
  const views = rows.map(toView);
  const womensHealthRows = views.filter((row) => row.womensHealthRelevant);
  const trackedRows = views.filter((row) =>
    row.trackedLabel.length > 0 &&
    row.scheduledDate >= today &&
    row.scheduledDate <= horizon
  );
  return {
    rowCountLabel: String(views.length),
    whCountLabel: String(womensHealthRows.length),
    trackedCountLabel: String(trackedRows.length),
    windowLabel: `${today} → ${horizon}`,
    allRows: views,
    womensHealthRows,
    trackedRows,
  };
}
