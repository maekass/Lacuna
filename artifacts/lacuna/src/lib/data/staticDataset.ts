import type { VerifiedDataset } from "./datasetTypes";
import staticVerifiedDataset from "@/data/dataset.verified.json";

/** Synchronous static dataset for client bundles and build-time fallbacks. */
export function getStaticVerifiedDataset(): VerifiedDataset {
  return staticVerifiedDataset as VerifiedDataset;
}
