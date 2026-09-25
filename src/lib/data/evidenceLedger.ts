import { z } from "zod";
import { atDecisionDate } from "./pointInTime";
import type { VerifiedDataset } from "./datasetSchema";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const EVIDENCE_DATE_PRECISIONS = [
  "day",
  "month",
  "quarter",
  "year",
  "unknown",
] as const;

export const EVIDENCE_VERIFICATION_STATUSES = [
  "verified",
  "reported",
  "contested",
  "retracted",
] as const;

export const ECONOMIC_EVIDENCE_FIELDS = [
  "totalFunding",
  "lastKnownValuation",
] as const;

export type EconomicEvidenceField = (typeof ECONOMIC_EVIDENCE_FIELDS)[number];

const economicEvidenceRecordSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  field: z.enum(ECONOMIC_EVIDENCE_FIELDS),
  value: z.number().finite().nonnegative(),
  /** Values are stored in millions of US dollars, matching the legacy dataset contract. */
  unit: z.literal("USD_M"),
  /** Source locator/citation; not necessarily a resolvable URL in the legacy catalog. */
  sourceCitation: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  effectiveDate: isoDateSchema.nullable(),
  publicAsOfDate: isoDateSchema.nullable(),
  datePrecision: z.enum(EVIDENCE_DATE_PRECISIONS),
  verificationStatus: z.enum(EVIDENCE_VERIFICATION_STATUSES),
  recordedAt: isoDateSchema,
  /** A correction adds a record; it does not edit the earlier evidence row. */
  supersedesId: z.string().min(1).optional(),
});

export const economicEvidenceLedgerSchema = z.object({
  schemaVersion: z.literal("1.0"),
  records: z.array(economicEvidenceRecordSchema),
});

export type EconomicEvidenceRecord = z.infer<typeof economicEvidenceRecordSchema>;
export type EconomicEvidenceLedger = z.infer<typeof economicEvidenceLedgerSchema>;

/** Validate the version-controlled economic evidence ledger. */
export function parseEconomicEvidenceLedger(
  raw: unknown,
): EconomicEvidenceLedger {
  return economicEvidenceLedgerSchema.parse(raw);
}

function currentRecords(
  records: readonly EconomicEvidenceRecord[],
): Map<string, EconomicEvidenceRecord> {
  const ids = new Set(records.map((record) => record.id));
  const superseded = new Set<string>();
  for (const record of records) {
    if (record.supersedesId) {
      if (!ids.has(record.supersedesId)) {
        throw new Error(
          `Evidence record ${record.id} supersedes missing record ${record.supersedesId}`,
        );
      }
      superseded.add(record.supersedesId);
    }
  }

  const byCompanyAndField = new Map<string, EconomicEvidenceRecord>();
  for (const record of records) {
    if (superseded.has(record.id) || record.verificationStatus === "retracted") {
      continue;
    }
    const key = `${record.companyId}:${record.field}`;
    if (byCompanyAndField.has(key)) {
      throw new Error(
        `More than one current evidence record for ${key}; add supersedesId rather than silently choosing one`,
      );
    }
    byCompanyAndField.set(key, record);
  }
  return byCompanyAndField;
}

export type EconomicEvidenceDecisionResult =
  | { eligible: true; evidence: EconomicEvidenceRecord }
  | {
    eligible: false;
    reason:
      | "missing-evidence"
      | "missing-provenance"
      | "invalid-date"
      | "after-cutoff";
  };

/**
 * Return only the current evidence record that was publicly knowable by a
 * decision cutoff. A current catalog value with no public vintage fails closed.
 */
export function economicEvidenceAtDecisionDate(
  ledger: EconomicEvidenceLedger,
  companyId: string,
  field: EconomicEvidenceField,
  cutoff: string,
): EconomicEvidenceDecisionResult {
  const record = currentRecords(ledger.records).get(`${companyId}:${field}`);
  if (!record) return { eligible: false, reason: "missing-evidence" };
  const result = atDecisionDate({
    value: record,
    asOf: record.publicAsOfDate,
    source: record.sourceCitation,
  }, cutoff);
  return result.eligible
    ? { eligible: true, evidence: result.value }
    : result;
}

/**
 * Materialize the present-day economic fields from evidence. Historical queries
 * must additionally call `atDecisionDate` per field; a null public date is not
 * admitted merely because this projection can display the current catalog.
 */
export function applyEconomicEvidenceLedger(
  dataset: VerifiedDataset,
  ledger: EconomicEvidenceLedger,
): VerifiedDataset {
  const records = currentRecords(ledger.records);
  const companyIds = new Set(dataset.companies.map((company) => company.id));
  for (const record of records.values()) {
    if (!companyIds.has(record.companyId)) {
      throw new Error(
        `Evidence record ${record.id} references missing company ${record.companyId}`,
      );
    }
  }

  return {
    ...dataset,
    companies: dataset.companies.map((company) => {
      const funding = records.get(`${company.id}:totalFunding`);
      const valuation = records.get(`${company.id}:lastKnownValuation`);
      return {
        ...company,
        ...(funding ? { totalFunding: funding.value } : {}),
        ...(valuation
          ? {
            lastKnownValuation: valuation.value,
            valuationSource: valuation.sourceCitation,
          }
          : {}),
      };
    }),
  };
}
