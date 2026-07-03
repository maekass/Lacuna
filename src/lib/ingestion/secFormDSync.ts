/**
 * Upsert SEC Form D candidates into lacuna_funding_events (PostgreSQL).
 */

import process from "node:process";
import { query, withTransaction } from "@/lib/data/dbClient";
import type { ClassificationConfidence } from "@/lib/ingestion/dealClassificationEngine";
import type { ParsedFormD } from "@/lib/ingestion/secFormDConnector";

export interface ClassifiedFormD extends ParsedFormD {
  classificationConfidence: ClassificationConfidence;
  classificationKeywords: string[];
  womensHealthRelevant: boolean;
  status: "pending" | "pending_review";
}

export interface FormDSyncResult {
  inserted: number;
  updated: number;
  skipped: number;
}

const UPSERT_SQL = `
INSERT INTO lacuna_funding_events (
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
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15, $16, $17, NOW()
)
ON CONFLICT (sec_accession) DO UPDATE SET
  issuer_name = EXCLUDED.issuer_name,
  issuer_cik = EXCLUDED.issuer_cik,
  filing_date = EXCLUDED.filing_date,
  filing_url = EXCLUDED.filing_url,
  total_offering_amount = COALESCE(EXCLUDED.total_offering_amount, lacuna_funding_events.total_offering_amount),
  total_amount_sold = COALESCE(EXCLUDED.total_amount_sold, lacuna_funding_events.total_amount_sold),
  first_sale_date = COALESCE(EXCLUDED.first_sale_date, lacuna_funding_events.first_sale_date),
  industry_group = COALESCE(EXCLUDED.industry_group, lacuna_funding_events.industry_group),
  jurisdiction = COALESCE(EXCLUDED.jurisdiction, lacuna_funding_events.jurisdiction),
  exemption_type = COALESCE(EXCLUDED.exemption_type, lacuna_funding_events.exemption_type),
  womens_health_relevant = EXCLUDED.womens_health_relevant,
  classification_confidence = EXCLUDED.classification_confidence,
  classification_keywords = EXCLUDED.classification_keywords,
  status = CASE
    WHEN lacuna_funding_events.status IN ('approved', 'rejected') THEN lacuna_funding_events.status
    ELSE EXCLUDED.status
  END,
  raw_excerpt = COALESCE(EXCLUDED.raw_excerpt, lacuna_funding_events.raw_excerpt),
  updated_at = NOW()
RETURNING (xmax = 0) AS inserted
`;

function toParams(event: ClassifiedFormD): unknown[] {
  return [
    event.eventId,
    event.secAccession,
    event.issuerName,
    event.issuerCik,
    event.filingDate || null,
    event.filingUrl,
    event.totalOfferingAmount,
    event.totalAmountSold,
    event.firstSaleDate,
    event.industryGroup,
    event.jurisdiction,
    event.exemptionType,
    event.womensHealthRelevant,
    event.classificationConfidence,
    event.classificationKeywords,
    event.status,
    event.rawExcerpt,
  ];
}

export async function upsertFundingEvent(
  event: ClassifiedFormD,
): Promise<"inserted" | "updated"> {
  const rows = await query<{ inserted: boolean }>(UPSERT_SQL, toParams(event));
  return rows[0]?.inserted ? "inserted" : "updated";
}

/** Sync classified Form D events; skips non-WH unless SEC_FORM_D_SYNC_ALL=true. */
export async function syncFormDToDatabase(
  events: ClassifiedFormD[],
): Promise<FormDSyncResult> {
  const syncAll = process.env.SEC_FORM_D_SYNC_ALL === "true";
  const eligible = syncAll
    ? events
    : events.filter((e) => e.womensHealthRelevant);

  let inserted = 0;
  let updated = 0;
  const skipped = events.length - eligible.length;

  await withTransaction(async (client) => {
    for (const event of eligible) {
      const result = await client.query<{ inserted: boolean }>(
        UPSERT_SQL,
        toParams(event),
      );
      if (result.rows[0]?.inserted) inserted += 1;
      else updated += 1;
    }
  });

  return { inserted, updated, skipped };
}
