/** Aggregated free-API snapshot for one Lacuna entity (company or acquirer). */

export type FreeApiSourceId =
  | "sec_submissions"
  | "sec_company_facts"
  | "clinical_trials_gov"
  | "openfda"
  | "nih_reporter"
  | "pubmed"
  | "patentsview"
  | "wikidata"
  | "eu_clinical_trials";

export interface FreeApiSourceResult {
  source: FreeApiSourceId;
  ok: boolean;
  fetchedAt: string;
  url?: string;
  error?: string;
  data?: unknown;
}

export interface FreeApiEntityRecord {
  entityId: string;
  name: string;
  kind: "company" | "acquirer";
  ticker?: string;
  cik?: string;
  sources: FreeApiSourceResult[];
}

export interface FreeApiDownloadManifest {
  downloadedAt: string;
  datasetPath: string;
  entityCount: number;
  sourcesRequested: FreeApiSourceId[];
  ncbiEmail: string;
  secUserAgentConfigured: boolean;
  patentsViewConfigured: boolean;
  notes: string[];
}
