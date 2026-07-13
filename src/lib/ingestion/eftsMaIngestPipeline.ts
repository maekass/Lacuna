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
import { WH_CONDITION_SEARCH_TERMS } from "@/lib/ingestion/publicRecords/whSearchTerms";
import { buildDealId } from "@/lib/ingestion/secEdgarConnector";
import { buildSecDealNaturalKey } from "@/lib/ingestion/secDealNaturalKey";
import {
  type EftsHit,
  searchMaFilingsWomensHealth,
} from "@/lib/ingestion/secFullTextSearch";

export interface EftsMaIngestOptions {
  sinceDate?: string;
  maxResults?: number;
  dryRun?: boolean;
  /** After sync, enrich keyword-only rows (bounded SEC fetches). */
  enrich?: boolean;
  enrichMax?: number;
}

export interface EftsMaIngestResult {
  sinceDateUsed: string;
  hits: EftsHit[];
  classified: ClassifiedDeal[];
  sync: SyncResult | null;
  enrich?: Awaited<
    ReturnType<
      typeof import("@/lib/ingestion/enrichPendingDeal").enrichKeywordOnlyDeals
    >
  >;
}

function buildFilingIndexUrl(cik: string, accession: string): string {
  const normalized = accession.includes("-")
    ? accession
    : `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${
      accession.slice(12)
    }`;
  const dashless = normalized.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${dashless}/${normalized}-index.htm`;
}

/** Map an EFTS hit to a staging row (keyword-only until full 8-K parse). */
export function eftsHitToClassifiedDeal(hit: EftsHit): ClassifiedDeal {
  const whContext = WH_CONDITION_SEARCH_TERMS.slice(0, 4).join(" ");
  const excerpt =
    `Women's health EFTS query (${whContext}) — 8-K Item 2.01 hit: ${hit.companyName} (${hit.form}, ${hit.filingDate}). Review filing for target and consideration.`;
  const classification = classifyDealKeywordOnly({
    filingText: excerpt,
    acquirerName: hit.companyName,
    targetName: undefined,
  });

  const eligible = shouldAutoInsert(classification.confidence);

  const formType = hit.form || "8-K";

  return {
    dealId: buildDealId(hit.accession, hit.cik, formType),
    secAccession: hit.accession,
    naturalKey: buildSecDealNaturalKey(hit.accession, hit.cik, formType),
    formType,
    acquirerName: hit.companyName,
    acquirerCik: hit.cik,
    targetName: undefined,
    announcedDate: hit.filingDate || undefined,
    filingUrl: buildFilingIndexUrl(hit.cik, hit.accession),
    filingDate: hit.filingDate || new Date().toISOString().slice(0, 10),
    item201Excerpt: excerpt,
    parseQuality: "keyword_only",
    filingTextSample: excerpt.slice(0, 500),
    classificationConfidence: classification.confidence,
    classificationKeywords: classification.matchedKeywords.length > 0
      ? classification.matchedKeywords
      : ["efts_wh_query"],
    womensHealthRelevant: classification.womensHealthRelevant,
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

  let enrich: EftsMaIngestResult["enrich"];
  if (options.enrich && !options.dryRun && process.env.DATABASE_URL) {
    const { enrichKeywordOnlyDeals } = await import(
      "@/lib/ingestion/enrichPendingDeal"
    );
    const dealIds = classified
      .filter((row) => row.parseQuality === "keyword_only")
      .map((row) => row.dealId);
    enrich = await enrichKeywordOnlyDeals(dealIds, {
      max: options.enrichMax ?? 10,
    });
  }

  return { sinceDateUsed, hits, classified, sync, enrich };
}
