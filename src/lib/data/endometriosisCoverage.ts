import type { TherapeuticAreaCoverageManifest } from "./therapeuticAreaCoverageTypes";
import manifest from "@/data/computed-endometriosis-coverage.json";
import { getTherapeuticAreaCoverageStats } from "./therapeuticAreaCoverage";

export const ENDOMETRIOSIS_COVERAGE =
  manifest as TherapeuticAreaCoverageManifest;

export function getEndometriosisCoverageStats() {
  return getTherapeuticAreaCoverageStats(ENDOMETRIOSIS_COVERAGE);
}
