/**
 * SEC EFTS 8-K Item 2.01 discovery → lacuna_deals staging (no verified JSON merge).
 */

import process from "node:process";
import {
  classifyDealKeywordOnly,
  shouldAutoInsert,
  statusForConfidence,
} from "@/lib/ingestion/dealClassificationEngine";
import {
  type ClassifiedDeal,
  syncDealsToDatabase,
  type SyncResult,
} from "@/lib/ingestion/databaseSync";
import { buildDealId } from "@/lib/ingestion/secEdgarConnector";
import {
  type EftsHit,
  searchMaFilingsWomensHealth,
} from "@/lib/ingestion/secFullTextSearch";

export interface EftsMaIngestOptions {
  sinceDate?: string;
  maxResults?: number;
  dryRun?: boolean;
}

export interface EftsMaIngestResult {
  sinceDateUsed: string;
  hits: EftsHit[];
  classified: ClassifiedDeal[];
  sync: SyncResult | null;
}

function buildFilingIndexUrl(cik: string, accession: string): string {
  const normalized = accession.includes("-")
    ? accession
    : `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${accession.slice(12)}`;
  const dashless = normalized.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${dashless}/${normalized}-index.htm`;
}

/** Map an EFTS hit to a staging row (keyword-only until full 8-K parse). */
export function eftsHitToClassifiedDeal(hit: EftsHit): ClassifiedDeal {
  const excerpt =
    `EFTS 8-K Item 2.01 hit — ${hit.companyName} (${hit.form}, ${hit.filingDate}). Review filing for target and consideration.`;
  const classification = classifyDealKeywordOnly({
    filingText: excerpt,
    acquirerName: hit.companyName,
    targetName: undefined,
  });

  const eligible = shouldAutoInsert(classification.confidence);

  return {
    dealId: buildDealId(hit.accession, hit.cik),
    secAccession: hit.accession,
    acquirerName: hit.companyName,
    acquirerCik: hit.cik,
    targetName: undefined,
    announcedDate: hit.filingDate || undefined,
    filingUrl: buildFilingIndexUrl(hit.cik, hit.accession),
    filingDate: hit.filingDate || new Date().toISOString().slice(0, 10),
    item201Excerpt: excerpt,
    parseQuality: "keyword_only",
    filingTextSample: excerpt.slice(0, 500),
    classificationConfidence: classification.confidence === "low"
      ? "medium"
      : classification.confidence,
    classificationKeywords: classification.matchedKeywords.length > 0
      ? classification.matchedKeywords
      : ["efts_wh_query"],
    womensHealthRelevant: true,
    classificationMethod: "keyword",
    status: eligible
      ? statusForConfidence(classification.confidence)
      : "pending_review",
  };
}

/**
 * Search SEC EFTS for WH 8-K Item 2.01 filings and upsert into lacuna_deals.
 */
export async function runEftsMaIngest(
  options: EftsMaIngestOptions = {},
): Promise<EftsMaIngestResult> {
  const sinceDateUsed = options.sinceDate ??
    process.env.SEC_EFTS_SINCE ??
    `${new Date().getFullYear() - 1}-01-01`;
  const maxResults = options.maxResults ??
    Number(process.env.SEC_EFTS_MAX_RESULTS ?? 50);

  const hits = await searchMaFilingsWomensHealth(
    sinceDateUsed,
    Number.isFinite(maxResults) && maxResults > 0 ? maxResults : 50,
  );

  const classified = hits.map(eftsHitToClassifiedDeal);

  let sync: SyncResult | null = null;
  if (!options.dryRun && process.env.DATABASE_URL) {
    sync = await syncDealsToDatabase(classified);
  }

  return { sinceDateUsed, hits, classified, sync };
}
