/**
 * Optional LLM narrative blurbs for the UI — Vercel AI Gateway only (see docs/INFERENCE.md).
 * Not validated research; heuristic scores remain the source of truth.
 */

import {
  generateInferenceText,
  INSIGHTS_GATEWAY_MODEL,
  INSIGHTS_OPENAI_MODEL,
  isServerInferenceConfigured,
  resolveInferenceModel,
} from '@/lib/ai/inference';

const INSIGHTS_SYSTEM = `You are a women's health M&A educator helping readers interpret curated, verified deal data.

GUIDELINES:
- Be concise and evidence-based
- Cite specific data points when relevant
- Flag uncertainty and limitations (small n, static dataset)
- Avoid promotional language and prediction claims
- Do not present yourself as a trained model or forecast engine`;

async function runInsightPrompt(prompt: string, maxOutputTokens: number): Promise<string> {
  const resolved = resolveInferenceModel({
    gatewayModel: INSIGHTS_GATEWAY_MODEL,
    openaiModel: INSIGHTS_OPENAI_MODEL,
  });
  if (!resolved) {
    return 'Server inference is not configured (set AI Gateway or OPENAI_API_KEY).';
  }

  try {
    return await generateInferenceText({
      resolved,
      system: INSIGHTS_SYSTEM,
      prompt,
      maxOutputTokens,
      temperature: 0.2,
      gatewayTags: ['feature:ui-insights'],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Insight generation failed';
    return `Unable to generate narrative: ${message}`;
  }
}

export function isAIConfigured(): boolean {
  return isServerInferenceConfigured();
}

export async function generateAcquisitionInsights(
  companyName: string,
  sector: string,
  topAcquirer: string,
  matchScore: number,
  estimatedValue: number,
  competitiveThreat: string,
  evidenceScore?: number,
): Promise<string> {
  const prompt = `
Summarize this women's health M&A scenario in 2-3 short paragraphs for an educational demo.
Stress that match scores are descriptive heuristics, not forecasts.

COMPANY: ${companyName} (${sector})
Top acquirer fit (heuristic): ${topAcquirer} (${matchScore}% match)
Estimated value context: $${estimatedValue}M
Competitive threat label: ${competitiveThreat}
${evidenceScore !== undefined ? `Evidence maturity score (descriptive): ${evidenceScore}/100` : ''}
`;

  return runInsightPrompt(prompt, 500);
}

export async function generateEvidenceSummary(
  companyName: string,
  phase: string,
  fdaStatus: string,
  trialCount: number,
  overallScore: number,
): Promise<string> {
  const prompt = `
Summarize this clinical evidence profile in 2-3 sentences for learners (not investment advice).

COMPANY: ${companyName}
Phase: ${phase} · FDA: ${fdaStatus} · Trials: ${trialCount} · Descriptive score: ${overallScore}/100
`;

  return runInsightPrompt(prompt, 300);
}

export async function generateSectorInsights(
  sector: string,
  dealCount: number,
  avgMultiple: number,
  medianTimeToExit: number,
  topAcquirers: string[],
): Promise<string> {
  const prompt = `
Describe ${sector} patterns from a small verified deal sample (educational only).

Deals: ${dealCount} · Avg multiple: ${avgMultiple.toFixed(1)}x · Median time to exit: ${medianTimeToExit} months
Active acquirers: ${topAcquirers.join(', ')}
`;

  return runInsightPrompt(prompt, 400);
}

export async function generateReimbursementInsights(
  companyName: string,
  businessModel: string,
  insuranceRevenue: number,
  valuationMultiple: number,
  sectorBenchmark: number,
): Promise<string> {
  const premium = ((valuationMultiple / sectorBenchmark - 1) * 100).toFixed(0);
  const prompt = `
Explain reimbursement context for ${companyName} in 2-3 sentences (illustrative, not advice).

Model: ${businessModel} · Insurance revenue est.: ${(insuranceRevenue * 100).toFixed(0)}%
Multiple: ${valuationMultiple.toFixed(1)}x vs sector ${sectorBenchmark.toFixed(1)}x (${premium}% vs benchmark)
`;

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
