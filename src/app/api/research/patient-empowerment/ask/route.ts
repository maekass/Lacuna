import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { buildPatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";
import { answerPatientEmpowermentGapQuestion } from "@/lib/research/patientEmpowermentGapLlm";

/** POST — LLM (or deterministic) empowerment gap analysis grounded in snapshot JSON. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit({
    key: `patientEmpowermentGap:${ip}`,
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
    const dataset = await getVerifiedDataset();
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    const result = await answerPatientEmpowermentGapQuestion(
      snapshot,
      question,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("patient-empowerment ask error:", error);
    return NextResponse.json(
      { error: "Failed to analyze patient empowerment gaps" },
      { status: 500 },
    );
  }
}
