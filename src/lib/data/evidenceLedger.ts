import { z } from "zod";
import { atDecisionDate, isCalendarDay } from "./pointInTime";
import { inspectLedgerRecords } from "./ledgerStructure";
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

/**
 * What the stored millions figure is, in the citation's own words.
 * `stated` is a single point the citation quotes. Other bases keep the
 * number but stop it from being read as an exact whole-company price.
 */
export const ECONOMIC_VALUE_BASES = [
  "stated",
  "approximate",
  "range_high",
  "at_least",
  "up_to",
  "upfront",
  "fully_diluted",
  "enterprise_value",
  "equity_value",
  "stake",
  "sum_of_cited_rounds",
  "unquoted_fx",
  "unstated_conflict",
  "locator_only",
] as const;

export type EconomicValueBasis = (typeof ECONOMIC_VALUE_BASES)[number];

const economicEvidenceRecordSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  field: z.enum(ECONOMIC_EVIDENCE_FIELDS),
  value: z.number().finite().nonnegative(),
  /** Values are stored in millions of US dollars, matching the legacy dataset contract. */
  unit: z.literal("USD_M"),
  /**
   * Machine-readable reading of `value`. Omitted only on hand-built fixtures;
   * the static ledger must set it on every row.
   */
  valueBasis: z.enum(ECONOMIC_VALUE_BASES).optional(),
  /** Source locator/citation; not necessarily a resolvable URL in the legacy catalog. */
  sourceCitation: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  /**
   * Earliest day of the cited disclosure window.
   * Equal to `publicAsOfDate` when `datePrecision` is `day`.
   */
  effectiveDate: isoDateSchema.nullable(),
  /**
   * First day the figure is known to have been public.
   * Month and year precision use the last calendar day of that window so a
   * dated replay cannot admit the value before the cited period ends.
   * Null means the citation does not date this figure.
   */
  publicAsOfDate: isoDateSchema.nullable(),
  datePrecision: z.enum(EVIDENCE_DATE_PRECISIONS),
  verificationStatus: z.enum(EVIDENCE_VERIFICATION_STATUSES),
  recordedAt: isoDateSchema,
  /** A value correction adds a record; it does not edit the earlier row's value. */
  supersedesId: z.string().min(1).optional(),
});

export const economicEvidenceLedgerSchema = z.object({
  schemaVersion: z.literal("1.0"),
  records: z.array(economicEvidenceRecordSchema),
});

export type EconomicEvidenceRecord = z.infer<
  typeof economicEvidenceRecordSchema
>;
export type EconomicEvidenceLedger = z.infer<
  typeof economicEvidenceLedgerSchema
>;

/** Validate the version-controlled economic evidence ledger. */
export function parseEconomicEvidenceLedger(
  raw: unknown,
): EconomicEvidenceLedger {
  return economicEvidenceLedgerSchema.parse(raw);
}

function currentRecords(
  records: readonly EconomicEvidenceRecord[],
): Map<string, EconomicEvidenceRecord> {
  const inspection = inspectLedgerRecords(records);
  const blocking = inspection.issues[0];
  if (blocking) {
    throw new Error(`${blocking.rule}: ${blocking.why}`);
  }
  return inspection.active;
}

export type EconomicEvidenceDecisionResult =
  | { eligible: true; evidence: EconomicEvidenceRecord }
  | {
    eligible: false;
    reason:
      | "missing-evidence"
      | "missing-provenance"
      | "invalid-date"
      | "imprecise-date"
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
  if (!record.publicAsOfDate || !record.sourceCitation?.trim()) {
    return { eligible: false, reason: "missing-provenance" };
  }
  if (record.datePrecision !== "day") {
    return { eligible: false, reason: "imprecise-date" };
  }
  if (
    !isCalendarDay(record.publicAsOfDate) ||
    !isCalendarDay(record.recordedAt) ||
    record.publicAsOfDate > record.recordedAt ||
    (record.effectiveDate != null &&
      (!isCalendarDay(record.effectiveDate) ||
        record.publicAsOfDate < record.effectiveDate))
  ) {
    return { eligible: false, reason: "invalid-date" };
  }
  const result = atDecisionDate({
    value: record,
    asOf: record.publicAsOfDate,
    source: record.sourceCitation,
  }, cutoff);
  return result.eligible ? { eligible: true, evidence: result.value } : result;
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
