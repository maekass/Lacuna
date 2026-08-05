import { NextRequest } from "next/server";
import { handleGroundedAskRequest } from "@/lib/api/groundedAskRoute";
import { buildPatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";
import { answerPatientEmpowermentGapQuestion } from "@/lib/research/patientEmpowermentGapLlm";

/** POST — LLM (or deterministic) empowerment gap analysis grounded in snapshot JSON. */
export function POST(request: NextRequest) {
  return handleGroundedAskRequest(request, {
    rateLimitKey: "patientEmpowermentGap",
    buildSnapshot: buildPatientEmpowermentSnapshot,
    answer: answerPatientEmpowermentGapQuestion,
    logLabel: "patient-empowerment",
    errorMessage: "Failed to analyze patient empowerment gaps",
  });
}
