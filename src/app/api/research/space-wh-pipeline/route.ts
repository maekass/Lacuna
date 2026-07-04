import { NextResponse } from "next/server";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { buildTrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";
import { isSpaceWhGapLlmConfigured } from "@/lib/research/spaceWhGapLlm";

/** GET — space WH trial→transaction pipeline snapshot (no LLM). */
export async function GET() {
  try {
    const dataset = await getVerifiedDataset();
    const snapshot = buildTrialToTransactionSnapshot(dataset);
    return NextResponse.json({
      ...snapshot,
      llmConfigured: isSpaceWhGapLlmConfigured(),
    });
  } catch (error) {
    console.error("space-wh-pipeline error:", error);
    return NextResponse.json(
      { error: "Failed to build space WH pipeline" },
      { status: 500 },
    );
  }
}
