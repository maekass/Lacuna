/**
 * On-demand company enrichment from free public APIs (Tier 1).
 */

import {
  fetchClinicalTrialsGov,
  fetchNihReporter,
  fetchOpenFda,
} from "@/lib/ingestion/freeApi/clients";
import type { FreeApiSourceResult } from "@/lib/ingestion/freeApi/types";

export interface CompanyEnrichmentResult {
  companyName: string;
  fetchedAt: string;
  sources: FreeApiSourceResult[];
}

/**
 * Fetch clinical trials, FDA, and NIH RePORTER data for a company name.
 * Server-only — respect provider rate limits.
 */
export async function enrichCompanyFromPublicApis(
  companyName: string,
): Promise<CompanyEnrichmentResult> {
  const trimmed = companyName.trim();
  if (!trimmed) {
    throw new Error("companyName is required");
  }

  const sources: FreeApiSourceResult[] = [];
  sources.push(await fetchClinicalTrialsGov(trimmed));
  sources.push(await fetchOpenFda(trimmed));
  sources.push(await fetchNihReporter(trimmed));

  return {
    companyName: trimmed,
    fetchedAt: new Date().toISOString(),
    sources,
  };
}
