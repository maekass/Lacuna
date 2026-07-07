/**
 * Read paths for SEC Form D candidates in `lacuna_funding_events` (funding, not M&A).
 */

import { query } from "@/lib/data/dbClient";
import type { ClassificationConfidence } from "@/lib/ingestion/dealClassificationEngine";

export type FundingEventStatus =
  | "pending"
  | "pending_review"
  | "approved"
  | "rejected";

const REVIEWABLE_STATUSES: FundingEventStatus[] = ["pending", "pending_review"];

export interface FundingEventRecord {
  id: number;
  eventId: string;
  secAccession: string;
  issuerName: string;
  issuerCik: string | null;
  filingDate: string | null;
  filingUrl: string;
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  firstSaleDate: string | null;
  industryGroup: string | null;
  jurisdiction: string | null;
  exemptionType: string | null;
  womensHealthRelevant: boolean;
  classificationConfidence: ClassificationConfidence;
  classificationKeywords: string[];
  status: FundingEventStatus;
  rawExcerpt: string | null;
  ingestedAt: string;
  updatedAt: string;
  reviewNotes: string | null;
}

export interface ListFundingEventsOptions {
  limit?: number;
  offset?: number;
  status?: FundingEventStatus;
  womensHealthOnly?: boolean;
}

export interface FundingEventsPage {
  items: FundingEventRecord[];
  meta: {
    limit: number;
    offset: number;
    total: number;
    reviewableTotal: number;
  };
}

const ROW_COLUMNS = `
  id,
  event_id,
  sec_accession,
  issuer_name,
  issuer_cik,
  filing_date,
  filing_url,
  total_offering_amount,
  total_amount_sold,
  first_sale_date,
  industry_group,
  jurisdiction,
  exemption_type,
  womens_health_relevant,
  classification_confidence,
  classification_keywords,
  status,
  raw_excerpt,
  ingested_at,
  updated_at,
  review_notes
`;

interface FundingRow {
  id: number;
  event_id: string;
  sec_accession: string;
  issuer_name: string;
  issuer_cik: string | null;
  filing_date: Date | string | null;
  filing_url: string;
  total_offering_amount: string | number | null;
  total_amount_sold: string | number | null;
  first_sale_date: Date | string | null;
  industry_group: string | null;
  jurisdiction: string | null;
  exemption_type: string | null;
  womens_health_relevant: boolean;
  classification_confidence: ClassificationConfidence;
  classification_keywords: string[];
  status: FundingEventStatus;
  raw_excerpt: string | null;
  ingested_at: Date | string;
  updated_at: Date | string;
  review_notes: string | null;
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

function mapRow(row: FundingRow): FundingEventRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    secAccession: row.sec_accession,
    issuerName: row.issuer_name,
    issuerCik: row.issuer_cik,
    filingDate: toIsoDate(row.filing_date),
    filingUrl: row.filing_url,
    totalOfferingAmount: toNumber(row.total_offering_amount),
    totalAmountSold: toNumber(row.total_amount_sold),
    firstSaleDate: toIsoDate(row.first_sale_date),
    industryGroup: row.industry_group,
    jurisdiction: row.jurisdiction,
    exemptionType: row.exemption_type,
    womensHealthRelevant: row.womens_health_relevant,
    classificationConfidence: row.classification_confidence,
    classificationKeywords: row.classification_keywords ?? [],
    status: row.status,
    rawExcerpt: row.raw_excerpt,
    ingestedAt: toIsoDateTime(row.ingested_at),
    updatedAt: toIsoDateTime(row.updated_at),
    reviewNotes: row.review_notes,
  };
}

export async function listFundingEvents(
  options: ListFundingEventsOptions = {},
): Promise<FundingEventsPage> {
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

  const rows = await query<FundingRow>(
    `SELECT ${ROW_COLUMNS}, COUNT(*) OVER() AS total_count
     FROM lacuna_funding_events
     WHERE ${where}
     ORDER BY filing_date DESC NULLS LAST, ingested_at DESC
     LIMIT $2 OFFSET $3`,
    params,
  );

  const reviewableTotal = await countPendingFundingEvents();
  return {
    items: rows.map(mapRow),
    meta: {
      limit,
      offset,
      total: Number(rows[0]?.total_count ?? 0),
      reviewableTotal,
    },
  };
}

export async function countPendingFundingEvents(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM lacuna_funding_events WHERE status = ANY($1::text[])`,
    [REVIEWABLE_STATUSES],
  );
  return Number(rows[0]?.count ?? 0);
}
