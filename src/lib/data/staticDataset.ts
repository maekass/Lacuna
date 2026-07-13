import staticVerifiedDataset from "@/data/dataset.verified.json";
import { parseVerifiedDataset, type VerifiedDataset } from "./datasetSchema";

/** Parsed once at module load — schema mismatch fails build/import, not a live request. */
const parsedStaticDataset: VerifiedDataset = parseVerifiedDataset(
  staticVerifiedDataset,
);

/** Synchronous static dataset for client bundles and build-time fallbacks. */
export function getStaticVerifiedDataset(): VerifiedDataset {
  return parsedStaticDataset;
}

/** Parse and validate raw JSON — used by scripts and tests. */
export function parseStaticVerifiedDatasetJson(raw: unknown): VerifiedDataset {
  return parseVerifiedDataset(raw);
}
