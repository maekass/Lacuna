import process from "node:process";
import { unstable_cache } from "next/cache";
import { parseStaticVerifiedDatasetJson } from "./staticDataset";
import staticVerifiedDataset from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "./datasetSchema";

/** Cached static JSON — parse once, fail at build/cache-fill time on schema mismatch. */
export function getCachedStaticVerifiedDataset(): Promise<VerifiedDataset> {
  if (process.env.NODE_ENV === "test") {
    return Promise.resolve(
      parseStaticVerifiedDatasetJson(staticVerifiedDataset),
    );
  }
  return unstable_cache(
    () =>
      Promise.resolve(parseStaticVerifiedDatasetJson(staticVerifiedDataset)),
    ["lacuna-verified-dataset-static"],
    { revalidate: 86_400, tags: ["verified-dataset"] },
  )();
}
