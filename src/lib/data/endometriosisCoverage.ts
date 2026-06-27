import type { TherapeuticAreaCoverageManifest } from "./therapeuticAreaCoverageTypes";
import manifest from "@/data/computed-endometriosis-coverage.json";

export const ENDOMETRIOSIS_COVERAGE =
  manifest as TherapeuticAreaCoverageManifest;

export function getEndometriosisCoverageStats() {
  const m = ENDOMETRIOSIS_COVERAGE;
  return {
    crunchbaseSearchTotal: m.crunchbaseSearchTotal,
    parsedFromPaste: m.parsedFromPaste,
    includedCount: m.includedCount,
    verifiedOverlap: m.verifiedDatasetOverlap,
    excludedNonForProfit: m.excludedNonForProfit,
    excludedClinicalServices: m.excludedClinicalServices,
    excludedNoFundingStatus: m.excludedNoFundingStatus,
  };
}
