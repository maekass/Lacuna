import type { TherapeuticAreaCoverageManifest } from "./therapeuticAreaCoverageTypes";
import manifest from "@/data/computed-endometrial-cancer-coverage.json";
import { getTherapeuticAreaCoverageStats } from "./therapeuticAreaCoverage";

export const ENDOMETRIAL_CANCER_COVERAGE =
  manifest as TherapeuticAreaCoverageManifest;

export function getEndometrialCancerCoverageStats() {
  return getTherapeuticAreaCoverageStats(ENDOMETRIAL_CANCER_COVERAGE);
}
