import { getStaticVerifiedDataset } from "./staticDataset";
import type { VerifiedDataset } from "./datasetSchema";

/**
 * Static mode returns the verified JSON module. A content-less
 * `unstable_cache` key previously reused a prior build's dataset from
 * `.next` and served stale `lastUpdated` / deal fields on prerendered
 * workspace pages.
 */
export function getCachedStaticVerifiedDataset(): Promise<VerifiedDataset> {
  return Promise.resolve(getStaticVerifiedDataset());
}
