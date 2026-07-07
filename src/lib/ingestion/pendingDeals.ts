/**
 * Read paths for SEC candidate deals in `lacuna_deals` (staging — not verified JSON).
 */

import { query } from "@/lib/data/dbClient";
import type { ClassificationConfidence } from "@/lib/ingestion/dealClassificationEngine";

export type PendingDealStatus =
  | "pending"
  | "pending_review"
  | "approved"
  | "rejected"
  | "merged";

const REVIEWABLE_STATUSES: PendingDealStatus[] = ["pending", "pending_review"];

export interface PendingDealRecord {
  id: number;
  dealId: string;
  secAccession: string;
  acquirerName: string | null;
  acquirerTicker: string | null;
  acquirerCik: string | null;
  targetName: string | null;
  announcedDate: string | null;
  closedDate: string | null;
  dealValueMillions: number | null;
  dealValueNote: string | null;
  dealStructure: string | null;
  earnoutTerms: string | null;
  filingUrl: string;
  filingDate: string | null;
  item201Excerpt: string | null;
  classificationConfidence: ClassificationConfidence;
  classificationKeywords: string[];
  womensHealthRelevant: boolean;
  status: PendingDealStatus;
  sicCode: string | null;
  parseQuality: string;
  ingestedAt: string;
  updatedAt: string;
  reviewNotes: string | null;
  mergedAcquisitionId: string | null;
  promotedAt: string | null;
}

export interface ListPendingDealsOptions {
  limit?: number;
  offset?: number;
  /** When set, filter to a single status; default lists reviewable queue only. */
  status?: PendingDealStatus;
  womensHealthOnly?: boolean;
}

export interface PendingDealsPage {
  items: PendingDealRecord[];
  meta: {
    limit: number;
    offset: number;
    total: number;
    reviewableTotal: number;
  };
}

export interface UpdatePendingDealInput {
  status?: PendingDealStatus;
  reviewNotes?: string | null;
}

/** Parsed fields merged by 8-K enrichment — never changes review status. */
export interface PendingDealEnrichmentInput {
  targetName?: string | null;
  announcedDate?: string | null;
  closedDate?: string | null;
  dealValueMillions?: number | null;
  dealValueNote?: string | null;
  dealStructure?: string | null;
  earnoutTerms?: string | null;
  item201Excerpt?: string | null;
  parseQuality?: string;
  filingUrl?: string;
  classificationConfidence?: ClassificationConfidence;
  classificationKeywords?: string[];
  womensHealthRelevant?: boolean;
}

const DEAL_ROW_COLUMNS = `
  id,
  deal_id,
  sec_accession,
  acquirer_name,
  acquirer_ticker,
  acquirer_cik,
  target_name,
  announced_date,
  closed_date,
  deal_value_millions,
  deal_value_note,
  deal_structure,
  earnout_terms,
  filing_url,
  filing_date,
  item_201_excerpt,
  classification_confidence,
  classification_keywords,
  womens_health_relevant,
  status,
  sic_code,
  parse_quality,
  ingested_at,
  updated_at,
  review_notes,
  merged_acquisition_id,
  promoted_at
`;

interface LacunaDealRow {
  id: number;
  deal_id: string;
  sec_accession: string;
  acquirer_name: string | null;
  acquirer_ticker: string | null;
  acquirer_cik: string | null;
  target_name: string | null;
  announced_date: Date | string | null;
  closed_date: Date | string | null;
  deal_value_millions: string | number | null;
  deal_value_note: string | null;
  deal_structure: string | null;
  earnout_terms: string | null;
  filing_url: string;
  filing_date: Date | string | null;
  item_201_excerpt: string | null;
  classification_confidence: ClassificationConfidence;
  classification_keywords: string[];
  womens_health_relevant: boolean;
  status: PendingDealStatus;
  sic_code: string | null;
  parse_quality: string;
  ingested_at: Date | string;
  updated_at: Date | string;
  review_notes: string | null;
  merged_acquisition_id: string | null;
  promoted_at: Date | string | null;
  total_count?: string;
}

function toIsoDate(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function toIsoDateTime(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: LacunaDealRow): PendingDealRecord {
  return {
    id: row.id,
    dealId: row.deal_id,
    secAccession: row.sec_accession,
    acquirerName: row.acquirer_name,
    acquirerTicker: row.acquirer_ticker,
    acquirerCik: row.acquirer_cik,
    targetName: row.target_name,
    announcedDate: toIsoDate(row.announced_date),
    closedDate: toIsoDate(row.closed_date),
    dealValueMillions: toNumber(row.deal_value_millions),
    dealValueNote: row.deal_value_note,
    dealStructure: row.deal_structure,
    earnoutTerms: row.earnout_terms,
    filingUrl: row.filing_url,
    filingDate: toIsoDate(row.filing_date),
    item201Excerpt: row.item_201_excerpt,
    classificationConfidence: row.classification_confidence,
    classificationKeywords: row.classification_keywords ?? [],
    womensHealthRelevant: row.womens_health_relevant,
    status: row.status,
    sicCode: row.sic_code,
    parseQuality: row.parse_quality,
    ingestedAt: toIsoDateTime(row.ingested_at),
    updatedAt: toIsoDateTime(row.updated_at),
    reviewNotes: row.review_notes,
    mergedAcquisitionId: row.merged_acquisition_id,
    promotedAt: row.promoted_at ? toIsoDateTime(row.promoted_at) : null,
  };
}

/**
 * Lists candidate deals awaiting or in human review (paginated).
 * Default: `pending` and `pending_review` rows, newest filings first.
 */
export async function listPendingDeals(
  options: ListPendingDealsOptions = {},
): Promise<PendingDealsPage> {
  const limit = Math.min(Math.max(1, options.limit ?? 20), 100);
  const offset = Math.max(0, options.offset ?? 0);
  const statuses = options.status ? [options.status] : REVIEWABLE_STATUSES;

  const conditions = ["status = ANY($1::text[])"];
  const params: unknown[] = [statuses];

  if (options.womensHealthOnly) {
    conditions.push("womens_health_relevant = TRUE");
  }

  const where = conditions.join(" AND ");
  params.push(limit, offset);

  const rows = await query<LacunaDealRow>(
    `SELECT
      ${DEAL_ROW_COLUMNS},
      COUNT(*) OVER() AS total_count
    FROM lacuna_deals
    WHERE ${where}
    ORDER BY filing_date DESC NULLS LAST, ingested_at DESC
    LIMIT $2 OFFSET $3`,
    params,
  );

  const reviewableTotal = await countPendingDeals();
  const total = Number(rows[0]?.total_count ?? 0);

  return {
    items: rows.map(mapRow),
    meta: {
      limit,
      offset,
      total,
      reviewableTotal,
    },
  };
}

/** Count candidates in `pending` or `pending_review`. */
export async function countPendingDeals(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM lacuna_deals WHERE status = ANY($1::text[])`,
    [REVIEWABLE_STATUSES],
  );
  return Number(rows[0]?.count ?? 0);
}

export interface OldestPendingDealSnapshot {
  dealId: string;
  ingestedAt: string;
}

/** Oldest candidate in `pending` or `pending_review` (for SLA chips). */
export async function getOldestPendingDeal(): Promise<
  OldestPendingDealSnapshot | null
> {
  const rows = await query<{ deal_id: string; ingested_at: Date | string }>(
    `SELECT deal_id, ingested_at
     FROM lacuna_deals
     WHERE status = ANY($1::text[])
     ORDER BY ingested_at ASC
     LIMIT 1`,
    [REVIEWABLE_STATUSES],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    dealId: row.deal_id,
    ingestedAt: row.ingested_at instanceof Date
      ? row.ingested_at.toISOString()
      : new Date(row.ingested_at).toISOString(),
  };
}

/**
 * Updates review status and/or notes for a candidate by `deal_id`.
 * Returns null when no row matches.
 */
export async function updatePendingDeal(
  dealId: string,
  input: UpdatePendingDealInput,
): Promise<PendingDealRecord | null> {
  if (!input.status && input.reviewNotes === undefined) {
    throw new Error("At least one of status or reviewNotes is required");
  }

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [dealId];
  let paramIndex = 2;

  if (input.status) {
    sets.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex += 1;
  }

  if (input.reviewNotes !== undefined) {
    sets.push(`review_notes = $${paramIndex}`);
    params.push(input.reviewNotes);
    paramIndex += 1;
  }

  const rows = await query<LacunaDealRow>(
    `UPDATE lacuna_deals
     SET ${sets.join(", ")}
     WHERE deal_id = $1
     RETURNING ${DEAL_ROW_COLUMNS}`,
    params,
  );

  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}

/** Fetch one staging row by public `deal_id`. */
export async function getPendingDealByDealId(
  dealId: string,
): Promise<PendingDealRecord | null> {
  const rows = await query<LacunaDealRow>(
    `SELECT ${DEAL_ROW_COLUMNS} FROM lacuna_deals WHERE deal_id = $1`,
    [dealId],
  );
  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}

/** Approved rows awaiting promotion into verified dataset. */
export async function listApprovedDealsForPromotion(): Promise<
  PendingDealRecord[]
> {
  const rows = await query<LacunaDealRow>(
    `SELECT ${DEAL_ROW_COLUMNS}
     FROM lacuna_deals
     WHERE status = 'approved'
     ORDER BY filing_date DESC NULLS LAST, ingested_at DESC`,
  );
  return rows.map(mapRow);
}

/**
 * Apply 8-K parse results to a staging row. Status is preserved (never set to
 * `approved` by enrichment alone).
 */
export async function applyPendingDealEnrichment(
  dealId: string,
  input: PendingDealEnrichmentInput,
): Promise<PendingDealRecord | null> {
  const rows = await query<LacunaDealRow>(
    `UPDATE lacuna_deals
     SET
       target_name = COALESCE($2, target_name),
       announced_date = COALESCE($3, announced_date),
       closed_date = COALESCE($4, closed_date),
       deal_value_millions = COALESCE($5, deal_value_millions),
       deal_value_note = COALESCE($6, deal_value_note),
       deal_structure = COALESCE($7, deal_structure),
       earnout_terms = COALESCE($8, earnout_terms),
       item_201_excerpt = COALESCE($9, item_201_excerpt),
       parse_quality = COALESCE($10, parse_quality),
       filing_url = COALESCE($11, filing_url),
       classification_confidence = COALESCE($12, classification_confidence),
       classification_keywords = COALESCE($13, classification_keywords),
       womens_health_relevant = COALESCE($14, womens_health_relevant),
       updated_at = NOW()
     WHERE deal_id = $1
       AND status <> 'merged'
     RETURNING ${DEAL_ROW_COLUMNS}`,
    [
      dealId,
      input.targetName ?? null,
      input.announcedDate ?? null,
      input.closedDate ?? null,
      input.dealValueMillions ?? null,
      input.dealValueNote ?? null,
      input.dealStructure ?? null,
      input.earnoutTerms ?? null,
      input.item201Excerpt ?? null,
      input.parseQuality ?? null,
      input.filingUrl ?? null,
      input.classificationConfidence ?? null,
      input.classificationKeywords ?? null,
      input.womensHealthRelevant ?? null,
    ],
  );

  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}

/** Mark a staging row as merged into verified dataset. */
export async function markDealMerged(
  dealId: string,
  mergedAcquisitionId: string,
): Promise<PendingDealRecord | null> {
  const rows = await query<LacunaDealRow>(
    `UPDATE lacuna_deals
     SET status = 'merged',
         merged_acquisition_id = $2,
         promoted_at = NOW(),
         updated_at = NOW()
     WHERE deal_id = $1
     RETURNING ${DEAL_ROW_COLUMNS}`,
    [dealId, mergedAcquisitionId],
  );
  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}
