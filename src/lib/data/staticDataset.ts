import staticVerifiedDataset from "@/data/dataset.verified.json";
import staticEconomicEvidenceLedger from "@/data/evidence.verified.json";
import {
  applyEconomicEvidenceLedger,
  parseEconomicEvidenceLedger,
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
