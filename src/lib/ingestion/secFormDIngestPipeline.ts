/**
 * SEC Form D ingest — EFTS search → parse → classify → lacuna_funding_events.
 */

import process from "node:process";
import {
  classifyDealKeywordOnly,
  shouldAutoInsert,
  statusForConfidence,
} from "@/lib/ingestion/dealClassificationEngine";
import {
  fetchAndParseFormD,
  type ParsedFormD,
} from "@/lib/ingestion/secFormDConnector";
import {
  type ClassifiedFormD,
  type FormDSyncResult,
  syncFormDToDatabase,
} from "@/lib/ingestion/secFormDSync";
import { searchFormDFilingsWomensHealth } from "@/lib/ingestion/secFullTextSearch";
import { mapWithConcurrency } from "@/lib/util/concurrency";

export interface FormDIngestOptions {
  sinceDate?: string;
  maxResults?: number;
  dryRun?: boolean;
}

export interface FormDIngestResult {
  eftsHits: number;
  parsed: ParsedFormD[];
  classified: ClassifiedFormD[];
  sync: FormDSyncResult | null;
  sinceDateUsed: string;
}

function classifyFormD(parsed: ParsedFormD): ClassifiedFormD {
  const classification = classifyDealKeywordOnly({
    filingText: parsed.rawExcerpt,
    targetName: parsed.issuerName,
    acquirerName: parsed.industryGroup ?? "",
    sicDescription: parsed.isHealthcareIndustry ? "Health Care" : undefined,
  });

  const eligible = shouldAutoInsert(classification.confidence);

  return {
    ...parsed,
    classificationConfidence: classification.confidence,
    classificationKeywords: classification.matchedKeywords,
    womensHealthRelevant: classification.womensHealthRelevant,
    status: eligible
      ? statusForConfidence(classification.confidence)
      : "pending_review",
  };
}

/**
 * Run Form D ingest: EFTS WH search → parse XML → keyword classify → DB upsert.
 */
export async function runFormDIngest(
  options: FormDIngestOptions = {},
): Promise<FormDIngestResult> {
  const sinceDateUsed = options.sinceDate ??
    process.env.SEC_FORM_D_SINCE ??
    `${new Date().getFullYear() - 1}-01-01`;

  const maxResults = options.maxResults ??
    Number(process.env.SEC_FORM_D_MAX_RESULTS ?? 50);

  const hits = await searchFormDFilingsWomensHealth(
    sinceDateUsed,
    Number.isFinite(maxResults) && maxResults > 0 ? maxResults : 50,
  );

  const parseConcurrency = Number(
    process.env.SEC_FORM_D_PARSE_CONCURRENCY ?? 2,
  );
  const parsed = (
    await mapWithConcurrency(
      hits,
      Number.isFinite(parseConcurrency) && parseConcurrency > 0
        ? parseConcurrency
        : 2,
      async (hit) => fetchAndParseFormD(hit),
    )
  ).filter((p): p is ParsedFormD => p != null);

  const classified = parsed.map(classifyFormD);

  let sync: FormDSyncResult | null = null;
  if (!options.dryRun && process.env.DATABASE_URL) {
    sync = await syncFormDToDatabase(classified);
  }

  return {
    eftsHits: hits.length,
    parsed,
    classified,
    sync,
    sinceDateUsed,
  };
}
