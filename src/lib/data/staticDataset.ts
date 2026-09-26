import staticVerifiedDataset from "@/data/dataset.verified.json";
import staticEconomicEvidenceLedger from "@/data/evidence.verified.json";
import {
  applyEconomicEvidenceLedger,
  parseEconomicEvidenceLedger,
} from "./evidenceLedger";
import { parseVerifiedDataset, type VerifiedDataset } from "./datasetSchema";

/** Parsed once at module load — schema mismatch fails build/import, not a live request. */
const parsedStaticDataset: VerifiedDataset = applyEconomicEvidenceLedger(
  parseVerifiedDataset(staticVerifiedDataset),
  parseEconomicEvidenceLedger(staticEconomicEvidenceLedger),
);

/** Synchronous static dataset for client bundles and build-time fallbacks. */
export function getStaticVerifiedDataset(): VerifiedDataset {
  return parsedStaticDataset;
}

/** Parse and validate raw JSON — used by scripts and tests. */
export function parseStaticVerifiedDatasetJson(raw: unknown): VerifiedDataset {
  return applyEconomicEvidenceLedger(
    parseVerifiedDataset(raw),
    parseEconomicEvidenceLedger(staticEconomicEvidenceLedger),
  );
}
