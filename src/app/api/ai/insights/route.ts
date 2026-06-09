import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import {
  generateAcquisitionInsights,
  generateEvidenceSummary,
  generateReimbursementInsights,
  isAIConfigured,
} from "@/lib/ai/insights";

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

/** GET — whether server-side inference (AI Gateway or OpenAI fallback) is configured. */
export function GET() {
  return NextResponse.json({ configured: isAIConfigured() });
}

/** POST — generate one insight type for a company context. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `aiInsights:${ip}`,
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
      {
        error:
          "Server inference is not configured (AI Gateway or OPENAI_API_KEY).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body required" }, {
      status: 400,
    });
  }

  const record = body as Record<string, unknown>;
  const type = record.type;
  const companyName = record.companyName;
  const sector = record.sector;

  if (
    typeof type !== "string" || typeof companyName !== "string" ||
    typeof sector !== "string"
  ) {
    return NextResponse.json(
      { error: "type, companyName, and sector are required strings" },
      { status: 400 },
    );
  }

  try {
    let content = "";

    switch (type) {
      case "acquisition": {
        const analysis = record.analysis as AcquisitionPayload | undefined;
        if (!analysis?.topAcquirer) {
          return NextResponse.json(
            { error: "analysis payload required for acquisition insights" },
            { status: 400 },
          );
        }
        const evidenceScore = typeof record.evidenceScore === "number"
          ? record.evidenceScore
          : undefined;
        content = await generateAcquisitionInsights(
          companyName,
          sector,
          analysis.topAcquirer,
          analysis.matchScore,
          analysis.estimatedValue,
          analysis.competitiveThreat,
          evidenceScore,
        );
        break;
      }
      case "evidence": {
        const evidence = record.evidence as EvidencePayload | undefined;
        if (!evidence?.phase) {
          return NextResponse.json(
            { error: "evidence payload required for evidence insights" },
            { status: 400 },
          );
        }
        content = await generateEvidenceSummary(
          companyName,
          evidence.phase,
          evidence.fdaStatus,
          evidence.trialCount,
          evidence.overallScore,
        );
        break;
      }
      case "reimbursement": {
        const reimbursement = record.reimbursement as
          | ReimbursementPayload
          | undefined;
        if (!reimbursement?.businessModel) {
          return NextResponse.json(
            {
              error:
                "reimbursement payload required for reimbursement insights",
            },
            { status: 400 },
          );
        }
        content = await generateReimbursementInsights(
          companyName,
          reimbursement.businessModel,
          reimbursement.insuranceRevenue,
          reimbursement.valuationMultiple,
          reimbursement.sectorBenchmark,
        );
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown insight type: ${type}` }, {
          status: 400,
        });
    }

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
