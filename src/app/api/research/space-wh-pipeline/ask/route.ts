import { NextRequest, NextResponse } from "next/server";
import { withLlmDevHeaders } from "@/lib/ai/devHeaders";
import { resetLlmAccounting } from "@/lib/ai/inference";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { buildTrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";
import { answerSpaceWhGapQuestion } from "@/lib/research/spaceWhGapLlm";

/** POST — LLM (or deterministic) gap analysis grounded in pipeline JSON. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit({
    key: `spaceWhGap:${ip}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: limit.resetAtMs },
      { status: 429 },
    );
  }

  let question: string | undefined;
  try {
    const body = await request.json() as { question?: unknown };
    if (typeof body.question === "string") {
      question = body.question.slice(0, 500);
    }
  } catch {
    // empty body → default question
  }

  try {
    resetLlmAccounting();
    const dataset = await getVerifiedDataset();
    const snapshot = buildTrialToTransactionSnapshot(dataset);
    const result = await answerSpaceWhGapQuestion(snapshot, question);
    return withLlmDevHeaders(NextResponse.json(result));
  } catch (error) {
    console.error("space-wh-pipeline ask error:", error);
    return NextResponse.json(
      { error: "Failed to analyze space WH gaps" },
      { status: 500 },
    );
  }
}
