import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { isAIConfigured } from "@/lib/ai/insights";
import {
  buildAcquisitionInsightPrompt,
  buildEvidenceSummaryPrompt,
  buildReimbursementInsightPrompt,
  INSIGHTS_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  gatewayProviderOptions,
  INSIGHTS_GATEWAY_MODEL,
  INSIGHTS_OPENAI_MODEL,
  resolveInferenceModel,
} from "@/lib/ai/inference";

interface AcquisitionPayload {
  topAcquirer: string;
  matchScore: number;
  estimatedValue: number;
  competitiveThreat: string;
}

interface EvidencePayload {
  phase: string;
  fdaStatus: string;
  trialCount: number;
  overallScore: number;
}

interface ReimbursementPayload {
  businessModel: string;
  insuranceRevenue: number;
  valuationMultiple: number;
  sectorBenchmark: number;
}

/** GET — confirm streaming endpoint is reachable */
export function GET() {
  return NextResponse.json({ streaming: isAIConfigured() });
}

/** POST — same payload shape as /api/ai/insights but returns a text stream */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit({
    key: `aiStream:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: limit.resetAtMs },
      { status: 429 },
    );
  }

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "Server inference is not configured." },
      { status: 503 },
    );
  }

  const resolved = resolveInferenceModel({
    gatewayModel: INSIGHTS_GATEWAY_MODEL,
    openaiModel: INSIGHTS_OPENAI_MODEL,
  });
  if (!resolved) {
    return NextResponse.json(
      { error: "No inference model available." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const { type, companyName, sector } = record as {
    type: string;
    companyName: string;
    sector: string;
  };

  if (!type || !companyName || !sector) {
    return NextResponse.json(
      { error: "type, companyName, and sector are required" },
      { status: 400 },
    );
  }

  let prompt: string;

  switch (type) {
    case "acquisition": {
      const analysis = record.analysis as AcquisitionPayload | undefined;
      if (!analysis?.topAcquirer) {
        return NextResponse.json(
          { error: "analysis payload required" },
          { status: 400 },
        );
      }
      const evidenceScore = typeof record.evidenceScore === "number"
        ? record.evidenceScore
        : undefined;
      prompt = buildAcquisitionInsightPrompt({
        companyName,
        sector,
        topAcquirer: analysis.topAcquirer,
        matchScore: analysis.matchScore,
        estimatedValue: analysis.estimatedValue,
        competitiveThreat: analysis.competitiveThreat,
        evidenceScore,
      });
      break;
    }
    case "evidence": {
      const evidence = record.evidence as EvidencePayload | undefined;
      if (!evidence?.phase) {
        return NextResponse.json(
          { error: "evidence payload required" },
          { status: 400 },
        );
      }
      prompt = buildEvidenceSummaryPrompt({
        companyName,
        phase: evidence.phase,
        fdaStatus: evidence.fdaStatus,
        trialCount: evidence.trialCount,
        overallScore: evidence.overallScore,
      });
      break;
    }
    case "reimbursement": {
      const reimbursement = record.reimbursement as
        | ReimbursementPayload
        | undefined;
      if (!reimbursement?.businessModel) {
        return NextResponse.json(
          { error: "reimbursement payload required" },
          { status: 400 },
        );
      }
      prompt = buildReimbursementInsightPrompt({
        companyName,
        businessModel: reimbursement.businessModel,
        insuranceRevenue: reimbursement.insuranceRevenue,
        valuationMultiple: reimbursement.valuationMultiple,
        sectorBenchmark: reimbursement.sectorBenchmark,
      });
      break;
    }
    default:
      return NextResponse.json(
        { error: `Unknown insight type: ${type}` },
        { status: 400 },
      );
  }

  const baseParams = {
    model: resolved.model,
    system: INSIGHTS_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 256,
    temperature: 0.2,
  } as Parameters<typeof streamText>[0];

  if (resolved.viaGateway) {
    const opts = gatewayProviderOptions([
      "feature:ui-stream",
      "quality:stream-ungated",
    ]);
    if (opts) (baseParams as Record<string, unknown>).providerOptions = opts;
  }

  const result = streamText(baseParams);
  return result.toTextStreamResponse();
}
