/**
 * Upsert SEC candidate deals into lacuna_deals (PostgreSQL).
 * Does not write to dataset.verified.json — human review required.
 */

import { withTransaction } from "@/lib/data/dbClient";
import type {
  ClassificationConfidence,
  ClassificationMethod,
} from "@/lib/ingestion/dealClassificationEngine";
import type { ParsedAcquisition } from "@/lib/ingestion/secEdgarConnector";
import { updateIngestCheckpoint } from "@/lib/ingestion/ingestRunState";
import { alertNewDeal } from "@/lib/ingestion/monitoringAlerts";
import { buildSecDealNaturalKey } from "@/lib/ingestion/secDealNaturalKey";

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
  /** Legacy alias — always 0 with ON CONFLICT DO NOTHING dedup. */
  updated: number;
  skipped: number;
  deduped: number;
}

const INSERT_SQL = `
INSERT INTO lacuna_deals (
  deal_id,
  sec_accession,
  natural_key,
  form_type,
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
  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW()
)
ON CONFLICT (natural_key) DO NOTHING
RETURNING deal_id
`;

function resolveFormType(deal: ClassifiedDeal): string {
  return deal.formType ?? "8-K";
}

function resolveNaturalKey(deal: ClassifiedDeal): string {
  return deal.naturalKey ??
    buildSecDealNaturalKey(
      deal.secAccession,
      deal.acquirerCik,
      resolveFormType(deal),
    );
}

function toParams(deal: ClassifiedDeal): unknown[] {
  const formType = resolveFormType(deal);
  return [
    deal.dealId,
    deal.secAccession,
    resolveNaturalKey(deal),
    resolveFormType(deal),
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

export type UpsertLacunaDealResult = "inserted" | "deduped";

/** Insert one classified deal; dedupes on natural_key (idempotent replay). */
export async function upsertLacunaDeal(
  deal: ClassifiedDeal,
): Promise<UpsertLacunaDealResult> {
  let result: UpsertLacunaDealResult = "deduped";

  await withTransaction(async (client) => {
    const insertResult = await client.query<{ deal_id: string }>(
      INSERT_SQL,
      toParams(deal),
    );
    const inserted = insertResult.rows.length > 0;
    result = inserted ? "inserted" : "deduped";

    if (inserted) {
      await updateIngestCheckpoint(client, {
        accession: deal.secAccession,
        naturalKey: resolveNaturalKey(deal),
        filingDate: deal.filingDate,
      });

      if (
        deal.womensHealthRelevant && deal.classificationConfidence !== "low"
      ) {
        alertNewDeal({
          dealId: deal.dealId,
          acquirerName: deal.acquirerName,
          targetName: deal.targetName,
          confidence: deal.classificationConfidence,
          filingUrl: deal.filingUrl,
        });
      }
    }
  });

  return result;
}

/**
 * Sync classified deals — one transaction per deal so partial batches commit.
 * Non-WH rows are counted as skipped; duplicates as deduped.
 */
export async function syncDealsToDatabase(
  deals: ClassifiedDeal[],
): Promise<SyncResult> {
  let inserted = 0;
  let skipped = 0;
  let deduped = 0;

  for (const deal of deals) {
    if (!deal.womensHealthRelevant) {
      skipped += 1;
      continue;
    }

    const outcome = await upsertLacunaDeal(deal);
    if (outcome === "inserted") {
      inserted += 1;
    } else {
      deduped += 1;
      await withTransaction(async (client) => {
        await updateIngestCheckpoint(client, {
          accession: deal.secAccession,
          naturalKey: resolveNaturalKey(deal),
          filingDate: deal.filingDate,
        });
      });
    }
  }

  return { inserted, updated: 0, skipped, deduped };
}

/** @deprecated Import from `@/lib/ingestion/pendingDeals` */
export { countPendingDeals } from "@/lib/ingestion/pendingDeals";
