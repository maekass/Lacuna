import { z } from "zod";
import { EVIDENCE_CLASSES } from "../evidence";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const evidenceClassSchema = z.enum(EVIDENCE_CLASSES);

/** Optional field — absent is valid; explicit null is rejected (db/static parity). */
const optionalString = z.string().optional();
const optionalNumber = z.number().optional();
const optionalStringArray = z.array(z.string()).readonly().optional();

export const provenanceSchema = z.object({
  lastUpdated: isoDateSchema,
  datasetVersion: optionalString,
  datasetHash: optionalString,
  sources: z.array(z.string()),
  notes: z.array(z.string()),
  purpose: z.string().min(1),
  disclaimer: z.string().min(1),
});

export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  stage: z.string().min(1),
  founded: optionalNumber,
  hq: optionalString,
  description: optionalString,
  lastKnownValuation: optionalNumber,
  valuationSource: optionalString,
  totalFunding: optionalNumber,
  sources: optionalStringArray,
  evidenceClass: evidenceClassSchema.optional(),
  portfolioFunds: optionalStringArray,
  portfolioInitialInvestment: optionalString,
});

export const acquirerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ticker: optionalString,
  /** Omitted on some pharma/strategic acquirers in static JSON; DB import defaults to Healthcare. */
  sector: z.string().min(1).default("Healthcare"),
  hq: z.string().min(1),
  description: optionalString,
  type: optionalString,
});

export const acquisitionSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  acquirerId: z.string().min(1),
  targetName: z.string().min(1),
  acquirerName: z.string().min(1),
  announcedDate: isoDateSchema,
  closedDate: isoDateSchema.optional(),
  dealValue: optionalNumber,
  dealValueNote: optionalString,
  dealType: z.string().min(1),
  source: z.string().min(1),
  strategicRationale: z.string().min(1),
  dealStructure: optionalString,
  earnoutComponent: optionalString,
  preDealValuation: optionalNumber,
  preDealValuationSource: optionalString,
  preDealValuationDate: isoDateSchema.optional(),
  computedPremium: optionalNumber,
});

export const verifiedDatasetSchema = z.object({
  provenance: provenanceSchema,
  companies: z.array(companySchema),
  acquirers: z.array(acquirerSchema),
  acquisitions: z.array(acquisitionSchema),
});

export type VerifiedDataset = z.infer<typeof verifiedDatasetSchema>;
export type VerifiedCompany = z.infer<typeof companySchema>;
export type VerifiedAcquirer = z.infer<typeof acquirerSchema>;
export type VerifiedAcquisition = z.infer<typeof acquisitionSchema>;
export type DatasetProvenance = z.infer<typeof provenanceSchema>;

/** Runtime parse — single source of truth for static JSON and DB-mapped rows. */
export function parseVerifiedDataset(data: unknown): VerifiedDataset {
  return verifiedDatasetSchema.parse(data);
}

export const DB_PROVENANCE_FIELDS = [
  "lastUpdated",
  "sources",
  "notes",
  "purpose",
  "disclaimer",
] as const;

export function toDbComparableProvenance(
  provenance: DatasetProvenance,
): Pick<DatasetProvenance, (typeof DB_PROVENANCE_FIELDS)[number]> {
  return pickFields(provenance, DB_PROVENANCE_FIELDS);
}

export const DB_COMPANY_FIELDS = [
  "id",
  "name",
  "sector",
  "stage",
  "founded",
  "hq",
  "description",
  "lastKnownValuation",
  "valuationSource",
  "totalFunding",
  "sources",
] as const;

export const DB_ACQUIRER_FIELDS = [
  "id",
  "name",
  "ticker",
  "sector",
  "hq",
] as const;

export const DB_ACQUISITION_FIELDS = [
  "id",
  "targetId",
  "acquirerId",
  "targetName",
  "acquirerName",
  "announcedDate",
  "closedDate",
  "dealValue",
  "dealValueNote",
  "dealType",
  "source",
  "strategicRationale",
] as const;

function pickFields<T extends Record<string, unknown>, K extends keyof T>(
  row: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in row && row[key] !== undefined) {
      out[key] = row[key];
    }
  }
  return out;
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/** Project a company to the Postgres-backed field set for static/db comparisons. */
export function toDbComparableCompany(
  company: VerifiedCompany,
): Pick<VerifiedCompany, (typeof DB_COMPANY_FIELDS)[number]> {
  const founded = company.founded ?? 0;
  const hq = company.hq ?? "Unknown";
  return compact({
    id: company.id,
    name: company.name,
    sector: company.sector,
    stage: company.stage,
    ...(founded !== 0 ? { founded } : {}),
    ...(hq !== "Unknown" ? { hq } : {}),
    ...(company.description ? { description: company.description } : {}),
    lastKnownValuation: company.lastKnownValuation,
    valuationSource: company.valuationSource,
    totalFunding: company.totalFunding,
    sources: company.sources ?? [],
  }) as Pick<VerifiedCompany, (typeof DB_COMPANY_FIELDS)[number]>;
}

export function toDbComparableAcquirer(
  acquirer: VerifiedAcquirer,
): Pick<VerifiedAcquirer, (typeof DB_ACQUIRER_FIELDS)[number]> {
  return {
    ...pickFields(acquirer, DB_ACQUIRER_FIELDS),
    sector: acquirer.sector ?? "Healthcare",
  };
}

export function toDbComparableAcquisition(
  acquisition: VerifiedAcquisition,
): Pick<VerifiedAcquisition, (typeof DB_ACQUISITION_FIELDS)[number]> {
  return pickFields(acquisition, DB_ACQUISITION_FIELDS);
}
