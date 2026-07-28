import { NextRequest } from "next/server";
import { handleGroundedAskRequest } from "@/lib/api/groundedAskRoute";
import { buildTrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";
import { answerSpaceWhGapQuestion } from "@/lib/research/spaceWhGapLlm";

/** POST — LLM (or deterministic) gap analysis grounded in pipeline JSON. */
export function POST(request: NextRequest) {
  return handleGroundedAskRequest(request, {
    rateLimitKey: "spaceWhGap",
    buildSnapshot: buildTrialToTransactionSnapshot,
    answer: answerSpaceWhGapQuestion,
    logLabel: "space-wh-pipeline",
    errorMessage: "Failed to analyze space WH gaps",
  });
}
