/**
 * Upsert SEC candidate deals into lacuna_deals (PostgreSQL).
 * Does not write to dataset.verified.json — human review required.
 */

import { query, withTransaction } from "@/lib/data/dbClient";
import type {
  ClassificationConfidence,
  ClassificationMethod,
} from "@/lib/ingestion/dealClassificationEngine";
import type { ParsedAcquisition } from "@/lib/ingestion/secEdgarConnector";
import { alertNewDeal } from "@/lib/ingestion/monitoringAlerts";

export interface ClassifiedDeal extends ParsedAcquisition {
  classificationConfidence: ClassificationConfidence;
  classificationKeywords: string[];
  womensHealthRelevant: boolean;
  classificationMethod?: ClassificationMethod;
  classificationModelId?: string;
  status: "pending" | "pending_review";
  reviewNotes?: string | null;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  skipped: number;
}

const UPSERT_SQL = `
INSERT INTO lacuna_deals (
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
  review_notes,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
)
ON CONFLICT (sec_accession) DO UPDATE SET
  acquirer_name = EXCLUDED.acquirer_name,
  acquirer_ticker = EXCLUDED.acquirer_ticker,
  target_name = COALESCE(EXCLUDED.target_name, lacuna_deals.target_name),
  announced_date = COALESCE(EXCLUDED.announced_date, lacuna_deals.announced_date),
  closed_date = COALESCE(EXCLUDED.closed_date, lacuna_deals.closed_date),
  deal_value_millions = COALESCE(EXCLUDED.deal_value_millions, lacuna_deals.deal_value_millions),
  deal_value_note = COALESCE(EXCLUDED.deal_value_note, lacuna_deals.deal_value_note),
  deal_structure = COALESCE(EXCLUDED.deal_structure, lacuna_deals.deal_structure),
  earnout_terms = COALESCE(EXCLUDED.earnout_terms, lacuna_deals.earnout_terms),
  filing_url = EXCLUDED.filing_url,
  filing_date = EXCLUDED.filing_date,
  item_201_excerpt = COALESCE(EXCLUDED.item_201_excerpt, lacuna_deals.item_201_excerpt),
  classification_confidence = EXCLUDED.classification_confidence,
  classification_keywords = EXCLUDED.classification_keywords,
  womens_health_relevant = EXCLUDED.womens_health_relevant,
  status = CASE
    WHEN lacuna_deals.status IN ('approved', 'rejected', 'merged') THEN lacuna_deals.status
    ELSE EXCLUDED.status
  END,
  sic_code = COALESCE(EXCLUDED.sic_code, lacuna_deals.sic_code),
  parse_quality = EXCLUDED.parse_quality,
  review_notes = COALESCE(EXCLUDED.review_notes, lacuna_deals.review_notes),
  updated_at = NOW()
RETURNING (xmax = 0) AS inserted
`;

function toParams(deal: ClassifiedDeal): unknown[] {
  return [
    deal.dealId,
    deal.secAccession,
    deal.acquirerName,
    deal.acquirerTicker ?? null,
    deal.acquirerCik,
    deal.targetName ?? null,
    deal.announcedDate ?? null,
    deal.closedDate ?? null,
    deal.dealValueMillions ?? null,
    deal.dealValueNote ?? null,
    deal.dealStructure ?? null,
    deal.earnoutTerms ?? null,
    deal.filingUrl,
    deal.filingDate,
    deal.item201Excerpt ?? null,
    deal.classificationConfidence,
    deal.classificationKeywords,
    deal.womensHealthRelevant,
    deal.status,
    deal.sicCode ?? null,
    deal.parseQuality,
    deal.reviewNotes ?? null,
  ];
}

/** Upsert one classified deal; dedupes on sec_accession. */
export async function upsertLacunaDeal(
  deal: ClassifiedDeal,
): Promise<"inserted" | "updated"> {
  const rows = await query<{ inserted: boolean }>(UPSERT_SQL, toParams(deal));
  const inserted = rows[0]?.inserted === true;

  if (
    inserted && deal.womensHealthRelevant &&
    deal.classificationConfidence !== "low"
  ) {
    alertNewDeal({
      dealId: deal.dealId,
      acquirerName: deal.acquirerName,
      targetName: deal.targetName,
      confidence: deal.classificationConfidence,
      filingUrl: deal.filingUrl,
    });
  }

  return inserted ? "inserted" : "updated";
}

/** Sync batch of classified deals inside a transaction. */
export async function syncDealsToDatabase(
  deals: ClassifiedDeal[],
): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await withTransaction(async (client) => {
    for (const deal of deals) {
      if (!deal.womensHealthRelevant) {
        skipped += 1;
        continue;
      }

      const result = await client.query<{ inserted: boolean }>(
        UPSERT_SQL,
        toParams(deal),
      );
      if (result.rows[0]?.inserted) {
        inserted += 1;
        if (deal.classificationConfidence !== "low") {
          alertNewDeal({
            dealId: deal.dealId,
            acquirerName: deal.acquirerName,
            targetName: deal.targetName,
            confidence: deal.classificationConfidence,
            filingUrl: deal.filingUrl,
          });
        }
      } else {
        updated += 1;
      }
    }
  });

  return { inserted, updated, skipped };
}

/** @deprecated Import from `@/lib/ingestion/pendingDeals` */
export { countPendingDeals } from "@/lib/ingestion/pendingDeals";
