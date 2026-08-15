/**
 * Target-company `lastKnownValuation` is often a copy of the acquisition
 * print (Biotheranostics $230M). Deal pages and company views must not show
 * that as a second price. A figure is displayable only when it is sourced
 * and distinct from prices already on the dossier — never as a silent
 * TAM-style fallback.
 */

export interface SourcedLastKnownValuation {
  readonly value: number;
  readonly source: string;
}

export interface LastKnownValuationInput {
  readonly lastKnownValuation?: number;
  readonly valuationSource?: string;
  readonly dealValue?: number;
  readonly preDealValuation?: number;
}

export interface CompanyValuationRecord {
  readonly id: string;
  readonly lastKnownValuation?: number;
  readonly valuationSource?: string;
}

export interface DealPrintRecord {
  readonly targetId: string;
  readonly dealValue?: number;
  readonly preDealValuation?: number;
}

function isSamePrint(value: number, other?: number): boolean {
  return typeof other === "number" && Number.isFinite(other) && value === other;
}

/**
 * Returns a last-known company valuation only when `valuationSource` is
 * present and the number is not the disclosed deal value or pre-deal print.
 */
export function sourcedDistinctLastKnownValuation(
  input: LastKnownValuationInput,
): SourcedLastKnownValuation | null {
  const value = input.lastKnownValuation;
  const source = input.valuationSource?.trim();
  if (typeof value !== "number" || !Number.isFinite(value) || !source) {
    return null;
  }
  if (isSamePrint(value, input.dealValue)) return null;
  if (isSamePrint(value, input.preDealValuation)) return null;
  return { value, source };
}

/**
 * Company-row lastKnownValuation for display. Hidden when it copies a
 * matching acquisition print (Biotheranostics $230M) or lacks valuationSource.
 */
export function sourcedLastKnownValuationForCompany(
  company: CompanyValuationRecord,
  acquisitions: readonly DealPrintRecord[],
): SourcedLastKnownValuation | null {
  const deal = acquisitions.find((row) => row.targetId === company.id);
  return sourcedDistinctLastKnownValuation({
    lastKnownValuation: company.lastKnownValuation,
    valuationSource: company.valuationSource,
    dealValue: deal?.dealValue,
    preDealValuation: deal?.preDealValuation,
  });
}
