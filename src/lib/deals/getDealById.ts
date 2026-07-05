import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { DealDetail } from "./dealTypes";
import { toDealAcquisitionDetail } from "./toDealAcquisitionDetail";

/**
 * Resolves a verified acquisition by id with target company and acquirer profiles.
 * Returns null when the id is missing or target/acquirer links are broken.
 */
export function getDealById(
  dataset: VerifiedDataset,
  id: string,
): DealDetail | null {
  const row = dataset.acquisitions.find((a) => a.id === id);
  if (!row) return null;

  const target = dataset.companies.find((c) => c.id === row.targetId);
  const acquirer = dataset.acquirers.find((a) => a.id === row.acquirerId);
  if (!target || !acquirer) return null;

  return {
    acquisition: toDealAcquisitionDetail(row),
    target,
    acquirer,
  };
}
