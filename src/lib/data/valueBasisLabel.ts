import staticEconomicEvidenceLedger from "@/data/evidence.verified.json";
import {
  ECONOMIC_VALUE_BASES,
  type EconomicEvidenceField,
  type EconomicValueBasis,
  parseEconomicEvidenceLedger,
} from "@/lib/data/evidenceLedger";
import { inspectLedgerRecords } from "@/lib/data/ledgerStructure";

/**
 * Plain-language reading of a ledger `valueBasis`.
 * These words describe the citation. They do not say the figure is verified,
 * and they are not a probability.
 */
export const VALUE_BASIS_PLAIN_LABEL: Record<EconomicValueBasis, string> = {
  stated: "stated",
  approximate: "approximate",
  range_high: "high end of a range",
  at_least: "at least",
  up_to: "up to",
  upfront: "upfront cash",
  fully_diluted: "fully diluted",
  enterprise_value: "enterprise value",
  equity_value: "equity value",
  stake: "partial stake",
  sum_of_cited_rounds: "sum of cited rounds",
  unquoted_fx: "unquoted exchange rate",
  unstated_conflict: "source does not state this total",
  locator_only: "citation does not state this total",
};

export const BASIS_NOT_RECORDED = "basis not recorded";

const activeBasis = new Map<string, EconomicValueBasis>();
{
  const ledger = parseEconomicEvidenceLedger(staticEconomicEvidenceLedger);
  for (const record of inspectLedgerRecords(ledger.records).active.values()) {
    if (
      (ECONOMIC_VALUE_BASES as readonly string[]).includes(record.valueBasis)
    ) {
      activeBasis.set(
        `${record.companyId}:${record.field}`,
        record.valueBasis as EconomicValueBasis,
      );
    }
  }
}

/** Visible words for one ledger basis, or the explicit missing-basis phrase. */
export function valueBasisPlainLabel(
  basis: EconomicValueBasis | undefined,
): string {
  if (!basis) return BASIS_NOT_RECORDED;
  return VALUE_BASIS_PLAIN_LABEL[basis];
}

/**
 * Basis label for the current ledger row of a company field.
 * A company with no active row is "basis not recorded".
 */
export function ledgerBasisLabel(
  companyId: string,
  field: EconomicEvidenceField,
): string {
  return valueBasisPlainLabel(
    activeBasis.get(`${companyId}:${field}`),
  );
}

/** Append a basis label without changing the formatted number. */
export function withBasisLabel(displayed: string, label: string): string {
  return `${displayed} · ${label}`;
}
