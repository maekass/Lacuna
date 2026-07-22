/**
 * Import manual / press deal candidates from CSV into lacuna_deals staging.
 * Template: staging/deals_candidates.template.csv
 */

import { createHash } from "node:crypto";
import { classifyDealKeywordOnly } from "@/lib/ingestion/dealClassificationEngine";
import {
  type ClassifiedDeal,
  syncDealsToDatabase,
  type SyncResult,
} from "@/lib/ingestion/databaseSync";
import { buildSecDealNaturalKey } from "@/lib/ingestion/secDealNaturalKey";

export interface CsvCandidateRow {
  status?: string;
  targetName: string;
  acquirerName: string;
  acquirerTicker?: string;
  announcedDate?: string;
  closedDate?: string;
  dealType?: string;
  dealValueMillions?: number;
  dealValueNote?: string;
  primarySourceUrl: string;
  secondarySourceUrl?: string;
  strategicRationale?: string;
  inclusionNotes?: string;
}

export interface CsvImportResult {
  parsed: number;
  skipped: number;
  sync: SyncResult;
  errors: string[];
}

const HEADER = [
  "status",
  "target_name",
  "acquirer_name",
  "acquirer_ticker",
  "announced_date",
  "closed_date",
  "deal_type",
  "deal_value_millions",
  "deal_value_note",
  "primary_source_url",
  "secondary_source_url",
  "strategic_rationale",
  "inclusion_notes",
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function rowFromFields(fields: string[]): CsvCandidateRow | null {
  if (fields.length < HEADER.length) return null;
  const map = Object.fromEntries(
    HEADER.map((key, i) => [key, fields[i] ?? ""]),
  );
  if (!map.target_name || !map.acquirer_name || !map.primary_source_url) {
    return null;
  }
  const valueRaw = map.deal_value_millions.trim();
  const dealValueMillions = valueRaw ? Number.parseFloat(valueRaw) : undefined;
  return {
    status: map.status || undefined,
    targetName: map.target_name,
    acquirerName: map.acquirer_name,
    acquirerTicker: map.acquirer_ticker || undefined,
    announcedDate: map.announced_date || undefined,
    closedDate: map.closed_date || undefined,
    dealType: map.deal_type || "Acquisition",
    dealValueMillions: Number.isFinite(dealValueMillions)
      ? dealValueMillions
      : undefined,
    dealValueNote: map.deal_value_note || undefined,
    primarySourceUrl: map.primary_source_url,
    secondarySourceUrl: map.secondary_source_url || undefined,
    strategicRationale: map.strategic_rationale || undefined,
    inclusionNotes: map.inclusion_notes || undefined,
  };
}

/** Parse CSV text (skips comment lines starting with #). */
export function parseCandidatesCsv(text: string): {
  rows: CsvCandidateRow[];
  errors: string[];
} {
  const rows: CsvCandidateRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line.toLowerCase().startsWith("status,")) continue;
    const fields = parseCsvLine(line);
    const row = rowFromFields(fields);
    if (!row) {
      errors.push(`Skipped invalid row: ${line.slice(0, 80)}`);
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}

function csvRowToClassifiedDeal(row: CsvCandidateRow): ClassifiedDeal {
  const key = `${row.primarySourceUrl}|${row.targetName}|${row.acquirerName}`;
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
  const secAccession = `manual-${hash}`;
  const dealId = `manual-${slugify(row.targetName)}-${hash.slice(0, 8)}`;
  const reviewNotes = [
    row.secondarySourceUrl ? `Secondary: ${row.secondarySourceUrl}` : null,
    row.inclusionNotes ? `Notes: ${row.inclusionNotes}` : null,
    row.strategicRationale ? `Rationale: ${row.strategicRationale}` : null,
  ].filter(Boolean).join("\n");

  const classification = classifyDealKeywordOnly({
    filingText: [row.strategicRationale, row.inclusionNotes, row.targetName]
      .filter(Boolean)
      .join(" "),
    targetName: row.targetName,
    acquirerName: row.acquirerName,
  });

  const formType = "MANUAL";

  return {
    dealId,
    secAccession,
    naturalKey: buildSecDealNaturalKey(secAccession, "manual", formType),
    formType,
    acquirerName: row.acquirerName,
    acquirerTicker: row.acquirerTicker,
    acquirerCik: "manual",
    targetName: row.targetName,
    announcedDate: row.announcedDate,
    closedDate: row.closedDate,
    dealValueMillions: row.dealValueMillions,
    dealValueNote: row.dealValueNote,
    filingUrl: row.primarySourceUrl,
    filingDate: row.announcedDate ?? new Date().toISOString().slice(0, 10),
    item201Excerpt: row.strategicRationale ??
      "Manual CSV candidate — verify dual-source before promotion.",
    parseQuality: "keyword_only",
    filingTextSample: reviewNotes.slice(0, 500),
    classificationConfidence: "low",
    classificationKeywords: classification.matchedKeywords.length > 0
      ? [...classification.matchedKeywords, "manual_csv"]
      : ["manual_csv"],
    womensHealthRelevant: classification.womensHealthRelevant,
    reviewNotes: reviewNotes || null,
    status: "pending_review",
  };
}

/** Upsert parsed CSV rows into lacuna_deals (never touches verified JSON). */
export async function importCandidatesCsv(
  csvText: string,
): Promise<CsvImportResult> {
  const { rows, errors } = parseCandidatesCsv(csvText);
  const classified = rows.map(csvRowToClassifiedDeal);
  const sync = classified.length > 0
    ? await syncDealsToDatabase(classified)
    : { inserted: 0, updated: 0, skipped: 0, deduped: 0 };

  return {
    parsed: rows.length,
    skipped: errors.length,
    sync,
    errors,
  };
}
