import staticVerifiedDataset from "@/data/dataset.verified.json";
import staticEconomicEvidenceLedger from "@/data/evidence.verified.json";
import {
  applyEconomicEvidenceLedger,
  type EconomicEvidenceField,
  parseEconomicEvidenceLedger,
  ratioDenominatorAdmission,
} from "./evidenceLedger";
import { assertEconomicEvidenceIntegrity } from "./evidenceLedgerIntegrity";
import { parseVerifiedDataset, type VerifiedDataset } from "./datasetSchema";

const staticLedger = parseEconomicEvidenceLedger(
  staticEconomicEvidenceLedger,
);
const staticParsed = parseVerifiedDataset(staticVerifiedDataset);
assertEconomicEvidenceIntegrity(staticLedger, staticParsed);

/** Parsed once at module load — schema or ledger mismatch fails build/import. */
const parsedStaticDataset: VerifiedDataset = applyEconomicEvidenceLedger(
  staticParsed,
  staticLedger,
);

/** Synchronous static dataset for client bundles and build-time fallbacks. */
export function getStaticVerifiedDataset(): VerifiedDataset {
  return parsedStaticDataset;
}

/** Parse and validate raw JSON — used by scripts and tests. */
export function parseStaticVerifiedDatasetJson(raw: unknown): VerifiedDataset {
  const dataset = parseVerifiedDataset(raw);
  const ledger = parseEconomicEvidenceLedger(staticEconomicEvidenceLedger);
  assertEconomicEvidenceIntegrity(ledger, dataset);
  return applyEconomicEvidenceLedger(dataset, ledger);
}

/**
 * Whether the static ledger admits a company's current economic field as a
 * ratio denominator. See `ratioDenominatorAdmission` for the fail-closed rules.
 */
export function isStaticRatioDenominatorAdmissible(
  companyId: string,
  field: EconomicEvidenceField,
): boolean {
  return ratioDenominatorAdmission(staticLedger, companyId, field).admissible;
}

/**
 * Admitted ratio denominators from the static ledger, keyed by company id, with
 * the exact ledger value admitted. Server layouts pass this to
 * `VerifiedDatasetProvider`; a loaded catalog value that differs (for example
 * a database row) is not admitted, so the gate fails closed outside static mode.
 */
export function staticRatioDenominatorValues(
  field: EconomicEvidenceField,
): Record<string, number> {
  const admitted: Record<string, number> = {};
  for (const record of staticLedger.records) {
    if (
      record.field === field &&
      ratioDenominatorAdmission(staticLedger, record.companyId, field)
        .admissible &&
      admittedRecordValue(record.companyId, field) === record.value
    ) {
      admitted[record.companyId] = record.value;
    }
  }
  return admitted;
}

function admittedRecordValue(
  companyId: string,
  field: EconomicEvidenceField,
): number | undefined {
  const company = parsedStaticDataset.companies.find((c) => c.id === companyId);
  return company?.[field];
}
