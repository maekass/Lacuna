import { generateText, Output } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  classifyDeal,
  classifyDealAsync,
  classifyDealKeywordOnly,
  hasAiGatewayAuth,
  isAiClassificationAvailable,
  shouldAutoInsert,
  statusForConfidence,
  WOMENS_HEALTH_KEYWORDS,
} from '@/lib/ingestion/dealClassificationEngine';

const aiClassificationSchema = z.object({
  womensHealthRelevant: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  matchedKeywords: z.array(z.string()),
  matchedThemes: z.array(z.string()),
  rationale: z.string(),
});

function mockAiModel(payload: z.infer<typeof aiClassificationSchema>) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 50, text: 50, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe('dealClassificationEngine', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('classifies fertility filing as high confidence (success)', () => {
    const result = classifyDeal({
      filingText: 'Acquisition of a leading fertility clinic platform for women\'s health.',
      targetName: 'FertilityCo',
      acquirerName: 'HealthCorp',
    });
    expect(result.womensHealthRelevant).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.method).toBe('keyword');
    expect(result.matchedThemes).toEqual([]);
  });

  it('returns low confidence when no keywords match (edge)', () => {
    const result = classifyDeal({
      filingText: 'Completion of acquisition of a logistics software company.',
      targetName: 'LogiSoft',
    });
    expect(result.womensHealthRelevant).toBe(false);
    expect(result.confidence).toBe('low');
  });

  it('shouldAutoInsert allows medium and high only (success)', () => {
    expect(shouldAutoInsert('high')).toBe(true);
    expect(shouldAutoInsert('medium')).toBe(true);
    expect(shouldAutoInsert('low')).toBe(false);
  });

  it('statusForConfidence maps low to pending_review (edge)', () => {
    expect(statusForConfidence('low')).toBe('pending_review');
    expect(statusForConfidence('medium')).toBe('pending');
  });

  it('exports a non-empty keyword list (success)', () => {
    expect(WOMENS_HEALTH_KEYWORDS.length).toBeGreaterThan(10);
  });

  it('isAiClassificationAvailable is false without API keys', () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.OPENAI_API_KEY;
    expect(isAiClassificationAvailable()).toBe(false);
    expect(hasAiGatewayAuth()).toBe(false);
  });

  it('hasAiGatewayAuth is true with VERCEL_OIDC_TOKEN', () => {
    vi.stubEnv('VERCEL_OIDC_TOKEN', 'oidc-test-token');
    expect(hasAiGatewayAuth()).toBe(true);
    expect(isAiClassificationAvailable()).toBe(true);
  });

  it('classifyDealAsync uses keyword path when no API keys (fallback)', async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.OPENAI_API_KEY;

    const result = await classifyDealAsync({
      filingText: 'Acquisition of a fertility services network.',
    });

    expect(result.method).toBe('keyword');
    expect(result.womensHealthRelevant).toBe(true);
    expect(result.modelId).toBeUndefined();
  });

  it('classifyDealAsync returns structured AI output with mock model', async () => {
    const model = mockAiModel({
      womensHealthRelevant: true,
      confidence: 'high',
      matchedKeywords: ['IVF'],
      matchedThemes: ['fertility', 'reproductive health'],
      rationale: 'Filing describes acquisition of an IVF clinic operator.',
    });

    const result = await classifyDealAsync(
      {
        filingText: 'We completed the acquisition of an IVF clinic operator.',
        acquirerName: 'Acme Health',
      },
      { model },
    );

    expect(result.method).toBe('ai');
    expect(result.modelId).toBe('mock');
    expect(result.confidence).toBe('high');
    expect(result.matchedThemes).toContain('fertility');
    expect(result.matchedKeywords.map((k) => k.toLowerCase())).toContain('ivf');
  });

  it('classifyDealAsync falls back to keyword on AI failure', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error('upstream failure');
      },
    });

    const result = await classifyDealAsync(
      { filingText: 'Acquisition of a menopause digital health platform.' },
      { model },
    );

    expect(result.method).toBe('keyword');
    expect(result.rationale).toContain('keyword fallback');
    expect(result.womensHealthRelevant).toBe(true);
  });

  it('classifyDealKeywordOnly matches classifyDeal alias', () => {
    const input = { filingText: 'Femtech acquisition for menstrual health.' };
    expect(classifyDeal(input)).toEqual(classifyDealKeywordOnly(input));
  });

  it('generateText + Output.object validates mock integration shape', async () => {
    const model = mockAiModel({
      womensHealthRelevant: false,
      confidence: 'low',
      matchedKeywords: [],
      matchedThemes: [],
      rationale: 'General logistics software.',
    });

    const { output } = await generateText({
      model,
      output: Output.object({ schema: aiClassificationSchema }),
      prompt: 'classify',
    });

    expect(output?.womensHealthRelevant).toBe(false);
  });
});
