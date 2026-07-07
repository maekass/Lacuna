/**
 * Optional LLM narrative blurbs for the UI — Vercel AI Gateway (see docs/INFERENCE.md).
 * All free-text output passes through the platform quality gate.
 */

import {
  INSIGHTS_GATEWAY_MODEL,
  INSIGHTS_OPENAI_MODEL,
  isServerInferenceConfigured,
  resolveInferenceModel,
} from "@/lib/ai/inference";
import {
  buildAcquisitionInsightPrompt,
  buildEvidenceSummaryPrompt,
  buildReimbursementInsightPrompt,
  buildSectorInsightPrompt,
  INSIGHTS_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  assessLlmOutput,
  generateQualifiedInference,
  type LlmQualityReport,
} from "@/lib/ai/quality";

export interface InsightResult {
  content: string;
  quality: LlmQualityReport | null;
  modelId: string | null;
}

async function runInsightPrompt(
  prompt: string,
  maxOutputTokens: number,
  groundingContext: string,
  requiredTerms?: string[],
): Promise<InsightResult> {
  const resolved = resolveInferenceModel({
    gatewayModel: INSIGHTS_GATEWAY_MODEL,
    openaiModel: INSIGHTS_OPENAI_MODEL,
  });
  if (!resolved) {
    return {
      content:
        "Server inference is not configured (set AI Gateway or OPENAI_API_KEY).",
      quality: null,
      modelId: null,
    };
  }

  try {
    const { text, quality } = await generateQualifiedInference({
      resolved,
      system: INSIGHTS_SYSTEM_PROMPT,
      prompt,
      feature: "ui-insights",
      groundingContext,
      requiredTerms,
      maxOutputTokens,
      temperature: 0.2,
    });
    return { content: text, quality, modelId: resolved.modelId };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Insight generation failed";
    const { text, quality } = assessLlmOutput(
      `Unable to generate narrative: ${message}`,
      {
        feature: "ui-insights",
        modelId: resolved.modelId,
        groundingContext,
      },
    );
    return { content: text, quality, modelId: resolved.modelId };
  }
}

export function isAIConfigured(): boolean {
  return isServerInferenceConfigured();
}

export function generateAcquisitionInsights(
  companyName: string,
  sector: string,
  topAcquirer: string,
  matchScore: number,
  estimatedValue: number,
  competitiveThreat: string,
  evidenceScore?: number,
): Promise<InsightResult> {
  const prompt = buildAcquisitionInsightPrompt({
    companyName,
    sector,
    topAcquirer,
    matchScore,
    estimatedValue,
    competitiveThreat,
    evidenceScore,
  });
  const grounding = [
    companyName,
    sector,
    topAcquirer,
    String(matchScore),
    String(estimatedValue),
    competitiveThreat,
    evidenceScore != null ? String(evidenceScore) : "",
  ].join("\n");

  return runInsightPrompt(prompt, 500, grounding, [companyName]);
}

export function generateEvidenceSummary(
  companyName: string,
  phase: string,
  fdaStatus: string,
  trialCount: number,
  overallScore: number,
): Promise<InsightResult> {
  const prompt = buildEvidenceSummaryPrompt({
    companyName,
    phase,
    fdaStatus,
    trialCount,
    overallScore,
  });
  const grounding = [
    companyName,
    phase,
    fdaStatus,
    String(trialCount),
    String(overallScore),
  ]
    .join("\n");
  return runInsightPrompt(prompt, 300, grounding, [companyName]);
}

export function generateSectorInsights(
  sector: string,
  dealCount: number,
  avgMultiple: number,
  medianTimeToExit: number,
  topAcquirers: string[],
): Promise<InsightResult> {
  const prompt = buildSectorInsightPrompt({
    sector,
    dealCount,
    avgMultiple,
    medianTimeToExit,
    topAcquirers,
  });
  const grounding = [
    sector,
    String(dealCount),
    String(avgMultiple),
    String(medianTimeToExit),
    ...topAcquirers,
  ].join("\n");
  return runInsightPrompt(prompt, 400, grounding);
}

export function generateReimbursementInsights(
  companyName: string,
  businessModel: string,
  insuranceRevenue: number,
  valuationMultiple: number,
  sectorBenchmark: number,
): Promise<InsightResult> {
  const prompt = buildReimbursementInsightPrompt({
    companyName,
    businessModel,
    insuranceRevenue,
    valuationMultiple,
    sectorBenchmark,
  });
  const grounding = [
    companyName,
    businessModel,
    String(insuranceRevenue),
    String(valuationMultiple),
    String(sectorBenchmark),
  ].join("\n");
  return runInsightPrompt(prompt, 300, grounding, [companyName]);
}

/** @deprecated Import from @/lib/ai/insights — kept for existing imports. */
export const aiClient = {
  generateAcquisitionInsights,
  generateEvidenceSummary,
  generateSectorInsights,
  generateReimbursementInsights,
  isConfigured: isAIConfigured,
};
