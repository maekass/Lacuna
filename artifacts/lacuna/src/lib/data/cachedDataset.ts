import { getStaticVerifiedDataset } from "./staticDataset";
import type { VerifiedDataset } from "./datasetTypes";

let _cached: VerifiedDataset | null = null;

/** Cached static JSON — avoids re-parsing ~100KB on every call. */
export function getCachedStaticVerifiedDataset(): Promise<VerifiedDataset> {
  if (_cached) return Promise.resolve(_cached);
  _cached = getStaticVerifiedDataset();
  return Promise.resolve(_cached);
}
