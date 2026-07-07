/**
 * Bounded 8-K enrichment for staging candidates (Phase E4).
 * Fetches one filing, parses Item 2.01, updates lacuna_deals — never auto-approves.
 */

import { classifyDealKeywordOnly } from "@/lib/ingestion/dealClassificationEngine";
import {
  detectPendingDealDuplicates,
  type DuplicateMatch,
} from "@/lib/ingestion/detectPendingDealDuplicates";
import {
  applyPendingDealEnrichment,
  type PendingDealRecord,
} from "@/lib/ingestion/pendingDeals";
import {
  fetchFilingText,
  parseItem201,
  type ParseQuality,
  resolvePrimaryFilingDocumentUrl,
  secRateLimitPause,
} from "@/lib/ingestion/secEdgarConnector";

export interface EnrichmentFieldChange {
  field: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface EnrichPendingDealResult {
  ok: boolean;
  skipped: boolean;
  skipReason?: string;
  before: PendingDealRecord;
  after: PendingDealRecord;
  changes: EnrichmentFieldChange[];
  duplicates: DuplicateMatch[];
  filingDocumentUrl?: string;
}

const FIELD_LABELS: Record<string, string> = {
  targetName: "Target name",
  announcedDate: "Announced date",
  closedDate: "Closed date",
  dealValueMillions: "Deal value ($M)",
  dealValueNote: "Value note",
  dealStructure: "Deal structure",
  earnoutTerms: "Earnout terms",
  item201Excerpt: "Item 2.01 excerpt",
  parseQuality: "Parse quality",
  filingUrl: "Filing document URL",
  classificationConfidence: "WH classification confidence",
  classificationKeywords: "WH keywords",
  womensHealthRelevant: "Women's health relevant",
};

function isEnrichable(deal: PendingDealRecord): boolean {
  if (deal.status === "merged") return false;
  return deal.parseQuality === "keyword_only" ||
    deal.parseQuality === "partial";
}

function formatValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.join(", ") || null;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  return text || null;
}

function buildChanges(
  before: PendingDealRecord,
  after: PendingDealRecord,
): EnrichmentFieldChange[] {
  const keys: Array<keyof PendingDealRecord> = [
    "targetName",
    "announcedDate",
    "closedDate",
    "dealValueMillions",
    "dealValueNote",
    "dealStructure",
    "earnoutTerms",
    "item201Excerpt",
    "parseQuality",
    "filingUrl",
    "classificationConfidence",
    "classificationKeywords",
    "womensHealthRelevant",
  ];

  const changes: EnrichmentFieldChange[] = [];
  for (const key of keys) {
    const prev = formatValue(before[key]);
    const next = formatValue(after[key]);
    if (prev === next) continue;
    if (key === "item201Excerpt" && prev && next) {
      const prevShort = String(prev).slice(0, 80);
      const nextShort = String(next).slice(0, 80);
      if (prevShort === nextShort) continue;
    }
    changes.push({
      field: key,
      label: FIELD_LABELS[key] ?? key,
      before: prev,
      after: next,
    });
  }
  return changes;
}

function parseQualityRank(quality: string): number {
  if (quality === "full") return 3;
  if (quality === "partial") return 2;
  return 1;
}

function mergeParseQuality(
  current: string,
  parsed: ParseQuality,
): ParseQuality {
  return parseQualityRank(parsed) >= parseQualityRank(current)
    ? parsed
    : current as ParseQuality;
}

/**
 * Fetch 8-K text for one staging candidate and merge parsed Item 2.01 fields.
 * Status is never promoted to `approved`.
 */
export async function enrichPendingDeal(
  deal: PendingDealRecord,
): Promise<EnrichPendingDealResult> {
  const duplicates = await detectPendingDealDuplicates(deal);

  if (!isEnrichable(deal)) {
    return {
      ok: true,
      skipped: true,
      skipReason: deal.status === "merged"
        ? "Merged deals cannot be enriched."
        : "Only keyword-only or partial parses are enriched.",
      before: deal,
      after: deal,
      changes: [],
      duplicates,
    };
  }

  if (!deal.acquirerCik?.trim()) {
    return {
      ok: false,
      skipped: true,
      skipReason: "Missing acquirer CIK — cannot resolve SEC filing document.",
      before: deal,
      after: deal,
      changes: [],
      duplicates,
    };
  }

  const filingDocumentUrl = await resolvePrimaryFilingDocumentUrl({
    cik: deal.acquirerCik,
    accession: deal.secAccession,
    fallbackUrl: deal.filingUrl,
  });

  if (!filingDocumentUrl) {
    return {
      ok: false,
      skipped: true,
      skipReason:
        "Could not resolve primary 8-K document from SEC submissions.",
      before: deal,
      after: deal,
      changes: [],
      duplicates,
    };
  }

  await secRateLimitPause();
  const text = await fetchFilingText(filingDocumentUrl);

  const parsed = parseItem201({
    text,
    accession: deal.secAccession,
    filingUrl: filingDocumentUrl,
    filingDate: deal.filingDate ?? deal.announcedDate ?? "",
    acquirerName: deal.acquirerName ?? "Unknown acquirer",
    acquirerTicker: deal.acquirerTicker ?? undefined,
    acquirerCik: deal.acquirerCik,
    sicCode: deal.sicCode ?? undefined,
  });

  if (!parsed) {
    return {
      ok: false,
      skipped: true,
      skipReason: "Filing does not contain Item 2.01 acquisition disclosure.",
      before: deal,
      after: deal,
      changes: [],
      duplicates,
      filingDocumentUrl,
    };
  }

  const excerpt = parsed.item201Excerpt ?? parsed.filingTextSample;
  const classification = classifyDealKeywordOnly({
    filingText: excerpt,
    targetName: parsed.targetName ?? deal.targetName ?? undefined,
    acquirerName: deal.acquirerName ?? undefined,
    sicCode: deal.sicCode ?? undefined,
  });

  const enrichment = {
    targetName: parsed.targetName ?? null,
    announcedDate: parsed.announcedDate ?? null,
    closedDate: parsed.closedDate ?? null,
    dealValueMillions: parsed.dealValueMillions ?? null,
    dealValueNote: parsed.dealValueNote ?? null,
    dealStructure: parsed.dealStructure ?? null,
    earnoutTerms: parsed.earnoutTerms ?? null,
    item201Excerpt: parsed.item201Excerpt ?? null,
    parseQuality: mergeParseQuality(deal.parseQuality, parsed.parseQuality),
    filingUrl: filingDocumentUrl,
    classificationConfidence: classification.confidence,
    classificationKeywords: classification.matchedKeywords.length > 0
      ? classification.matchedKeywords
      : null,
    womensHealthRelevant: classification.womensHealthRelevant,
  };

  const after = await applyPendingDealEnrichment(deal.dealId, enrichment);
  if (!after) {
    throw new Error(`Failed to persist enrichment for ${deal.dealId}`);
  }

  return {
    ok: true,
    skipped: false,
    before: deal,
    after,
    changes: buildChanges(deal, after),
    duplicates,
    filingDocumentUrl,
  };
}

export interface EnrichBatchResult {
  enriched: number;
  skipped: number;
  failed: number;
  results: EnrichPendingDealResult[];
}

/** Enrich up to `max` keyword-only staging rows (CLI batch helper). */
export async function enrichKeywordOnlyDeals(
  dealIds: string[],
  options: { max?: number } = {},
): Promise<EnrichBatchResult> {
  const { getPendingDealByDealId } = await import(
    "@/lib/ingestion/pendingDeals"
  );
  const max = options.max ?? 10;
  const results: EnrichPendingDealResult[] = [];
  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const dealId of dealIds.slice(0, max)) {
    const deal = await getPendingDealByDealId(dealId);
    if (!deal || deal.parseQuality !== "keyword_only") {
      skipped += 1;
      continue;
    }
    try {
      const result = await enrichPendingDeal(deal);
      results.push(result);
      if (result.skipped || result.changes.length === 0) {
        skipped += 1;
      } else {
        enriched += 1;
      }
    } catch {
      failed += 1;
    }
    await secRateLimitPause();
  }

  return { enriched, skipped, failed, results };
}
