"use client";

import { ENDOMETRIOSIS_COVERAGE } from "@/lib/data/endometriosisCoverage";
import TherapeuticAreaCoveragePanel from "@/components/TherapeuticAreaCoveragePanel";

export default function EndometriosisCoveragePanel() {
  return <TherapeuticAreaCoveragePanel manifest={ENDOMETRIOSIS_COVERAGE} />;
}
