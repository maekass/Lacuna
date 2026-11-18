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
 * Company ids whose current static-ledger `field` is admitted as a ratio
 * denominator. Server layouts pass this list to `VerifiedDatasetProvider` so
 * client views can gate funding multiples without bundling the ledger.
 */
export function staticRatioDenominatorCompanyIds(
  field: EconomicEvidenceField,
): string[] {
  const ids = new Set(
    staticLedger.records
      .filter((record) => record.field === field)
      .map((record) => record.companyId),
  );
  return [...ids].filter((id) => isStaticRatioDenominatorAdmissible(id, field))
    .sort();
}
