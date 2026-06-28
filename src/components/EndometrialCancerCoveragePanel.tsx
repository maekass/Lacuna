"use client";

import { ENDOMETRIAL_CANCER_COVERAGE } from "@/lib/data/endometrialCancerCoverage";
import TherapeuticAreaCoveragePanel from "@/components/TherapeuticAreaCoveragePanel";

export default function EndometrialCancerCoveragePanel() {
  return (
    <TherapeuticAreaCoveragePanel
      manifest={ENDOMETRIAL_CANCER_COVERAGE}
    />
  );
}
