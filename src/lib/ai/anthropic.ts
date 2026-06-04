/**
 * Anthropic Claude Integration
 * 
 * LLM client for generating investment insights from Lacuna data.
 * Uses Claude 3 Sonnet for cost-effective, high-quality analysis.
 */

import process from 'node:process';

/** Server-only; NEXT_PUBLIC_* kept for backward-compatible Vercel env setups. */
const ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY?.trim() ||
  process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY?.trim() ||
  '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: string;
}

/**
 * Call Anthropic Claude API
 */
export async function callClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const maxTokens = options?.maxTokens || 1000;
  const temperature = options?.temperature || 0.3; // Lower for factual analysis
  
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        temperature: temperature,
        system: options?.systemPrompt || getDefaultSystemPrompt(),
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { content: '', error: `API Error: ${error}` };
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || '',
      usage: data.usage
    };
    
  } catch (error) {
    return { 
      content: '', 
      error: `Network Error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

/**
 * Generate investment insights from acquisition analysis
 */
export async function generateAcquisitionInsights(
  companyName: string,
  sector: string,
  topAcquirer: string,
  matchScore: number,
  estimatedValue: number,
  competitiveThreat: string,
  evidenceScore?: number
): Promise<string> {
  const prompt = `
Analyze this women's health M&A scenario and provide 2-3 concise investment insights.

COMPANY DATA:
- Name: ${companyName}
- Sector: ${sector}
- Top Acquirer Match: ${topAcquirer} (${matchScore}% match)
- Estimated Valuation: $${estimatedValue}M
- Competitive Threat Level: ${competitiveThreat}
${evidenceScore ? `- Clinical Evidence Score: ${evidenceScore}/100` : ''}

Provide evidence-based insights covering:
1. Why the top acquirer makes strategic sense
2. Valuation implications and premium drivers
3. Competitive dynamics and exit likelihood

Format: Short paragraphs, cite specific reasoning, note data limitations if any.
Be strategic and objective. Avoid hype language.
`;

  const response = await callClaude(prompt, {
    maxTokens: 500,
    temperature: 0.2
  });
  
  return response.content || response.error || 'Unable to generate insights.';
}

/**
 * Generate evidence maturity assessment summary
 */
export async function generateEvidenceSummary(
  companyName: string,
  phase: string,
  fdaStatus: string,
  trialCount: number,
  overallScore: number
): Promise<string> {
  const prompt = `
Summarize this clinical evidence profile for investors in 2-3 sentences.

COMPANY: ${companyName}
EVIDENCE PROFILE:
- Highest Trial Phase: ${phase}
- FDA Status: ${fdaStatus}
- Clinical Trials: ${trialCount}
- Overall Evidence Score: ${overallScore}/100

Provide a concise assessment of:
- Regulatory maturity and its implications for acquirer confidence
- How this evidence level typically correlates with valuation
- Key strengths or gaps

Tone: Professional, evidence-based, strategic.
`;

  const response = await callClaude(prompt, {
    maxTokens: 300,
    temperature: 0.2
  });
  
  return response.content || response.error || 'Evidence summary unavailable.';
}

/**
 * Generate sector trend analysis
 */
export async function generateSectorInsights(
  sector: string,
  dealCount: number,
  avgMultiple: number,
  medianTimeToExit: number,
  topAcquirers: string[]
): Promise<string> {
  const prompt = `
Analyze ${sector} M&A trends based on this data:

SECTOR METRICS:
- Verified Acquisitions: ${dealCount}
- Average Valuation Multiple: ${avgMultiple.toFixed(1)}x
- Median Time to Exit: ${medianTimeToExit} months
- Most Active Acquirers: ${topAcquirers.join(', ')}

Provide 2-3 data-backed insights about:
1. What this sector's exit dynamics suggest for founders/investors
2. How the acquirer mix affects valuation and strategic options
3. Any patterns or anomalies worth noting

Flag any data limitations (small sample size, selection bias, etc.).
`;

  const response = await callClaude(prompt, {
    maxTokens: 400,
    temperature: 0.3
  });
  
  return response.content || response.error || 'Sector analysis unavailable.';
}

/**
 * Generate reimbursement impact summary
 */
export async function generateReimbursementInsights(
  companyName: string,
  businessModel: string,
  insuranceRevenue: number,
  valuationMultiple: number,
  sectorBenchmark: number
): Promise<string> {
  const premium = ((valuationMultiple / sectorBenchmark - 1) * 100).toFixed(0);
  
  const prompt = `
Analyze the reimbursement-driven valuation for ${companyName}.

REIMBURSEMENT PROFILE:
- Business Model: ${businessModel}
- Est. Insurance Revenue: ${(insuranceRevenue * 100).toFixed(0)}%
- Valuation Multiple: ${valuationMultiple.toFixed(1)}x
- Sector Benchmark: ${sectorBenchmark.toFixed(1)}x
- Premium/Discount: ${premium}%

Explain in 2-3 sentences:
- How reimbursement status affects this company's valuation relative to peers
- Strategic implications for potential acquirers (insurance vs consumer businesses)
- Key risk or opportunity factor

Note: This is a model-based estimate, not definitive valuation.
`;

  const response = await callClaude(prompt, {
    maxTokens: 300,
    temperature: 0.2
  });
  
  return response.content || response.error || 'Reimbursement analysis unavailable.';
}

function getDefaultSystemPrompt(): string {
  return `You are a women's health M&A analyst with expertise in venture capital and strategic acquisitions.

GUIDELINES:
- Be concise and evidence-based
- Cite specific data points when relevant
- Flag uncertainty and limitations
- Avoid promotional language
- Focus on actionable investor insights
- Use professional tone (not casual)`;
}

/**
 * Check if API key is configured
 */
export function isAIConfigured(): boolean {
  return !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10;
}

export const aiClient = {
  callClaude,
  generateAcquisitionInsights,
  generateEvidenceSummary,
  generateSectorInsights,
  generateReimbursementInsights,
  isConfigured: isAIConfigured
};
