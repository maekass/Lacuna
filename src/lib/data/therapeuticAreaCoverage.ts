import type { TherapeuticAreaCoverageManifest } from "./therapeuticAreaCoverageTypes";

export function getTherapeuticAreaCoverageStats(
  manifest: TherapeuticAreaCoverageManifest,
) {
  return {
    crunchbaseSearchTotal: manifest.crunchbaseSearchTotal,
    parsedFromPaste: manifest.parsedFromPaste,
    includedCount: manifest.includedCount,
    verifiedOverlap: manifest.verifiedDatasetOverlap,
    excludedNonForProfit: manifest.excludedNonForProfit,
    excludedClinicalServices: manifest.excludedClinicalServices,
    excludedNoFundingStatus: manifest.excludedNoFundingStatus,
  };
}
