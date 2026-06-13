/**
 * Orchestrates free-API downloads for Lacuna verified-dataset entities.
 */

import process from "node:process";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  ALL_FREE_API_SOURCES,
  fetchClinicalTrialsGov,
  fetchEuClinicalTrials,
  fetchNihReporter,
  fetchOpenFda,
  fetchPatentsView,
  fetchPubMedIds,
  fetchSecCompanyFacts,
  fetchSecSubmissions,
  fetchWikidataSearch,
  preloadSecTickerMap,
} from "./clients";
import type {
  FreeApiDownloadManifest,
  FreeApiEntityRecord,
  FreeApiSourceId,
} from "./types";

export interface DownloadEntitiesOptions {
  sources?: FreeApiSourceId[];
  limit?: number;
  datasetPath: string;
  onProgress?: (message: string) => void;
}

interface EntityRef {
  entityId: string;
  name: string;
  kind: "company" | "acquirer";
  ticker?: string;
}

function uniqueEntities(dataset: VerifiedDataset): EntityRef[] {
  const seen = new Set<string>();
  const out: EntityRef[] = [];

  for (const c of dataset.companies) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ entityId: c.id, name: c.name, kind: "company" });
  }
  for (const a of dataset.acquirers) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push({
      entityId: a.id,
      name: a.name,
      kind: "acquirer",
      ticker: a.ticker?.trim().toUpperCase(),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadEntity(
  entity: EntityRef,
  sources: FreeApiSourceId[],
  needsSec: boolean,
): Promise<FreeApiEntityRecord> {
  const record: FreeApiEntityRecord = {
    entityId: entity.entityId,
    name: entity.name,
    kind: entity.kind,
    ticker: entity.ticker,
    sources: [],
  };

  if (needsSec && entity.ticker) {
    if (sources.includes("sec_submissions")) {
      record.sources.push(await fetchSecSubmissions(entity.ticker));
    }
    if (sources.includes("sec_company_facts")) {
      record.sources.push(await fetchSecCompanyFacts(entity.ticker));
    }
    const secSub = record.sources.find((s) => s.source === "sec_submissions");
    if (secSub?.ok && secSub.data && typeof secSub.data === "object") {
      const cik = (secSub.data as { cik?: number }).cik;
      if (cik) record.cik = String(cik);
    }
  } else if (
    needsSec &&
    (sources.includes("sec_submissions") ||
      sources.includes("sec_company_facts"))
  ) {
    const skipMsg = "No ticker — SEC endpoints skipped";
    if (sources.includes("sec_submissions")) {
      record.sources.push({
        source: "sec_submissions",
        ok: false,
        fetchedAt: new Date().toISOString(),
        error: skipMsg,
      });
    }
    if (sources.includes("sec_company_facts")) {
      record.sources.push({
        source: "sec_company_facts",
        ok: false,
        fetchedAt: new Date().toISOString(),
        error: skipMsg,
      });
    }
  }

  if (sources.includes("clinical_trials_gov")) {
    record.sources.push(await fetchClinicalTrialsGov(entity.name));
  }
  if (sources.includes("openfda")) {
    record.sources.push(await fetchOpenFda(entity.name));
  }
  if (sources.includes("nih_reporter")) {
    record.sources.push(await fetchNihReporter(entity.name));
  }
  if (sources.includes("pubmed")) {
    record.sources.push(await fetchPubMedIds(entity.name));
  }
  if (sources.includes("patentsview")) {
    record.sources.push(await fetchPatentsView(entity.name));
  }
  if (sources.includes("wikidata")) {
    record.sources.push(await fetchWikidataSearch(entity.name));
  }
  if (sources.includes("eu_clinical_trials")) {
    record.sources.push(await fetchEuClinicalTrials(entity.name));
  }

  return record;
}

/**
 * Download free-API bundles for all (or limited) verified-dataset entities.
 */
export async function downloadFreeApiBundles(
  dataset: VerifiedDataset,
  options: DownloadEntitiesOptions,
): Promise<
  { manifest: FreeApiDownloadManifest; records: FreeApiEntityRecord[] }
> {
  const sources = options.sources ?? ALL_FREE_API_SOURCES;
  const needsSec = sources.some((s) =>
    s === "sec_submissions" || s === "sec_company_facts"
  );

  if (needsSec) {
    options.onProgress?.("Loading SEC ticker map…");
    await preloadSecTickerMap();
  }

  let entities = uniqueEntities(dataset);
  if (typeof options.limit === "number" && options.limit > 0) {
    entities = entities.slice(0, options.limit);
  }

  const records: FreeApiEntityRecord[] = [];
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    options.onProgress?.(
      `[${i + 1}/${entities.length}] ${entity.name}${
        entity.ticker ? ` (${entity.ticker})` : ""
      }`,
    );
    records.push(await downloadEntity(entity, sources, needsSec));
  }

  const manifest: FreeApiDownloadManifest = {
    downloadedAt: new Date().toISOString(),
    datasetPath: options.datasetPath,
    entityCount: records.length,
    sourcesRequested: sources,
    ncbiEmail: process.env.NCBI_TOOL_EMAIL?.trim() || "mps5cy@virginia.edu",
    secUserAgentConfigured: Boolean(
      process.env.SEC_EDGAR_USER_AGENT?.trim(),
    ),
    patentsViewConfigured: Boolean(process.env.PATENTSVIEW_API_KEY?.trim()),
    notes: [
      "CMS Physician Fee Schedule is bulk-only — not included; see data.cms.gov for manual downloads.",
      "SEC endpoints require acquirer tickers; private companies skip SEC.",
      "PatentsView requires PATENTSVIEW_API_KEY (free registration).",
      "Attribution: cite SEC, ClinicalTrials.gov, openFDA, NIH, NCBI, USPTO, Wikidata per their terms.",
      "Educational use only — not investment advice.",
    ],
  };

  return { manifest, records };
}
