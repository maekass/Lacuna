import { NextResponse } from "next/server";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { buildPatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";
import { isPatientEmpowermentGapLlmConfigured } from "@/lib/research/patientEmpowermentGapLlm";

/** GET — patient empowerment gap × portfolio crosswalk snapshot. */
export async function GET() {
  try {
    const dataset = await getVerifiedDataset();
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    return NextResponse.json({
      ...snapshot,
      llmConfigured: isPatientEmpowermentGapLlmConfigured(),
    });
  } catch (error) {
    console.error("patient-empowerment error:", error);
    return NextResponse.json(
      { error: "Failed to build patient empowerment snapshot" },
      { status: 500 },
    );
  }
}
