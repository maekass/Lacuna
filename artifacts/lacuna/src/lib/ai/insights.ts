/**
 * Optional LLM narrative blurbs for the UI — Vercel AI Gateway only (see docs/INFERENCE.md).
 * Not validated research; heuristic scores remain the source of truth.
 *
 * Precision prompting v2: centralized templates, output sanitization, hallucination detection.
 */

import {
  generateInferenceText,
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
  sanitizeLLMOutput,
} from "@/lib/ai/prompts";

async function runInsightPrompt(
  prompt: string,
  maxOutputTokens: number,
): Promise<string> {
  const resolved = resolveInferenceModel({
    gatewayModel: INSIGHTS_GATEWAY_MODEL,
    openaiModel: INSIGHTS_OPENAI_MODEL,
  });
  if (!resolved) {
    return "Server inference is not configured (set AI Gateway or OPENAI_API_KEY).";
  }

  try {
    const raw = await generateInferenceText({
      resolved,
      system: INSIGHTS_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens,
      temperature: 0.2,
      gatewayTags: ["feature:ui-insights"],
    });

    const { clean, warnings } = sanitizeLLMOutput(raw);
    if (warnings.length > 0) {
      console.warn("[INSIGHTS] Sanitization warnings:", warnings);
    }

    return clean;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Insight generation failed";
    return `Unable to generate narrative: ${message}`;
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
): Promise<string> {
  const prompt = buildAcquisitionInsightPrompt({
    companyName,
    sector,
    topAcquirer,
    matchScore,
    estimatedValue,
    competitiveThreat,
    evidenceScore,
  });

  return runInsightPrompt(prompt, 500);
}

export function generateEvidenceSummary(
  companyName: string,
  phase: string,
  fdaStatus: string,
  trialCount: number,
  overallScore: number,
): Promise<string> {
  const prompt = buildEvidenceSummaryPrompt({
    companyName,
    phase,
    fdaStatus,
    trialCount,
    overallScore,
  });

  return runInsightPrompt(prompt, 300);
}

export function generateSectorInsights(
  sector: string,
  dealCount: number,
  avgMultiple: number,
  medianTimeToExit: number,
  topAcquirers: string[],
): Promise<string> {
  const prompt = buildSectorInsightPrompt({
    sector,
    dealCount,
    avgMultiple,
    medianTimeToExit,
    topAcquirers,
  });

  return runInsightPrompt(prompt, 400);
}

export function generateReimbursementInsights(
  companyName: string,
  businessModel: string,
  insuranceRevenue: number,
  valuationMultiple: number,
  sectorBenchmark: number,
): Promise<string> {
  const prompt = buildReimbursementInsightPrompt({
    companyName,
    businessModel,
    insuranceRevenue,
    valuationMultiple,
    sectorBenchmark,
  });

  return runInsightPrompt(prompt, 300);
}

/** @deprecated Import from @/lib/ai/insights — kept for existing imports. */
export const aiClient = {
  generateAcquisitionInsights,
  generateEvidenceSummary,
  generateSectorInsights,
  generateReimbursementInsights,
  isConfigured: isAIConfigured,
};
