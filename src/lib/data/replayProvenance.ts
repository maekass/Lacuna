import {
  ECONOMIC_EVIDENCE_FIELDS,
  type EconomicEvidenceField,
  type EconomicEvidenceRecord,
  economicReplayBlockReason,
} from "./evidenceLedger";
import { inspectLedgerRecords } from "./ledgerStructure";

export interface FieldReplayDebt {
  readonly field: EconomicEvidenceField;
  readonly records: number;
  readonly historicalReplayEligible: number;
  readonly historicalReplayEligibleRate: number;
  readonly currentOnlyMissingPublicAsOf: number;
  readonly currentOnlyMissingPublicAsOfRate: number;
}

export interface ReplayProvenanceCensus {
  readonly definition: string;
  readonly note: string;
  /** Active economic claims: not retracted and not superseded. */
  readonly economicRecords: number;
  readonly historicalReplayEligible: number;
  readonly historicalReplayEligibleRate: number;
  readonly currentOnlyMissingPublicAsOf: number;
  readonly currentOnlyMissingPublicAsOfRate: number;
  /** Ineligible for a reason other than a missing publicAsOfDate. */
  readonly otherReplayIneligible: number;
  readonly byField: readonly FieldReplayDebt[];
}

export const REPLAY_PROVENANCE_DEFINITION =
  "Active economic ledger rows (not retracted, not superseded) that can enter a historical replay. Eligibility requires a real day-precision publicAsOfDate on or before recordedAt, a non-empty citation, and publicAsOfDate on or after effectiveDate when both exist. A missing publicAsOfDate is current-catalog only.";

export const REPLAY_PROVENANCE_NOTE =
  "A missing publicAsOfDate means the record is current-catalog only. Do not infer a date from a deal announcement, close, or filing year, and do not treat the gap as zero. Backfill only when a source shows the fact was publicly knowable on that date.";

function rate(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

function isMissingPublicAsOf(record: EconomicEvidenceRecord): boolean {
  return record.publicAsOfDate == null || record.publicAsOfDate.trim() === "";
}

function fieldDebt(
  field: EconomicEvidenceField,
  records: readonly EconomicEvidenceRecord[],
): FieldReplayDebt {
  const rows = records.filter((record) => record.field === field);
  const historicalReplayEligible =
    rows.filter((record) => economicReplayBlockReason(record) === null).length;
  const currentOnlyMissingPublicAsOf = rows.filter(isMissingPublicAsOf).length;
  return {
    field,
    records: rows.length,
    historicalReplayEligible,
    historicalReplayEligibleRate: rate(historicalReplayEligible, rows.length),
    currentOnlyMissingPublicAsOf,
    currentOnlyMissingPublicAsOfRate: rate(
      currentOnlyMissingPublicAsOf,
      rows.length,
    ),
  };
}

/**
 * Honest replay-coverage census. Missing public dates stay missing; the
 * percentage is not a target to raise by invention.
 */
export function computeReplayProvenanceCensus(
  records: readonly EconomicEvidenceRecord[],
): ReplayProvenanceCensus {
  const { active } = inspectLedgerRecords(records);
  const current = [...active.values()] as EconomicEvidenceRecord[];
  const historicalReplayEligible =
    current.filter((record) => economicReplayBlockReason(record) === null)
      .length;
  const currentOnlyMissingPublicAsOf = current.filter(isMissingPublicAsOf)
    .length;
  const otherReplayIneligible = current.length - historicalReplayEligible -
    currentOnlyMissingPublicAsOf;
  return {
    definition: REPLAY_PROVENANCE_DEFINITION,
    note: REPLAY_PROVENANCE_NOTE,
    economicRecords: current.length,
    historicalReplayEligible,
    historicalReplayEligibleRate: rate(
      historicalReplayEligible,
      current.length,
    ),
    currentOnlyMissingPublicAsOf,
    currentOnlyMissingPublicAsOfRate: rate(
      currentOnlyMissingPublicAsOf,
      current.length,
    ),
    otherReplayIneligible,
    byField: ECONOMIC_EVIDENCE_FIELDS.map((field) => fieldDebt(field, current)),
  };
}
