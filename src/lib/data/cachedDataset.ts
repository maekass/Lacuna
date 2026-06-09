import { unstable_cache } from "next/cache";
import { getStaticVerifiedDataset } from "./staticDataset";
import type { VerifiedDataset } from "./datasetTypes";

/** Cached static JSON — avoids re-parsing ~100KB on every RSC request. */
export function getCachedStaticVerifiedDataset(): Promise<VerifiedDataset> {
  if (process.env.NODE_ENV === "test") {
    return Promise.resolve(getStaticVerifiedDataset());
  }
  return unstable_cache(
    async () => getStaticVerifiedDataset(),
    ["lacuna-verified-dataset-static"],
    { revalidate: 86_400, tags: ["verified-dataset"] },
  )();
}
