import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { DealAcquisitionDetail } from "./dealTypes";

type RawAcquisition = VerifiedDataset["acquisitions"][number] & {
  dealStructure?: string;
  preDealValuation?: number;
  preDealValuationSource?: string;
  preDealValuationDate?: string;
  computedPremium?: number;
};

/** Maps a verified acquisition row to a detail shape including optional JSON fields. */
export function toDealAcquisitionDetail(
  row: VerifiedDataset["acquisitions"][number],
): DealAcquisitionDetail {
  const raw = row as RawAcquisition;
  return {
    ...row,
    dealStructure: raw.dealStructure,
    preDealValuation: raw.preDealValuation,
    preDealValuationSource: raw.preDealValuationSource,
    preDealValuationDate: raw.preDealValuationDate,
    computedPremium: raw.computedPremium,
  };
}
