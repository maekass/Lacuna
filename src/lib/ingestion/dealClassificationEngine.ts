/**
 * Women's health deal classification with confidence scoring.
 * Medium+ confidence → eligible for DB insert; low → pending_review.
 *
 * Environment (optional — keyword-only fallback when unset):
 * - AI_GATEWAY_API_KEY — Vercel AI Gateway (preferred; model openai/gpt-5.4-mini)
 * - OPENAI_API_KEY — direct OpenAI via @ai-sdk/openai when gateway key absent
 * - SEC_EDGAR_USER_AGENT — required for SEC fetch paths, not classification itself
 */

import { generateText, Output, type LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export type ClassificationConfidence = 'high' | 'medium' | 'low';
export type ClassificationMethod = 'keyword' | 'ai';

export interface DealClassificationInput {
  filingText: string;
  targetName?: string;
  acquirerName?: string;
  sicDescription?: string;
  sicCode?: string;
}

export interface DealClassification {
  womensHealthRelevant: boolean;
  confidence: ClassificationConfidence;
  matchedKeywords: string[];
  /** Thematic labels from AI (empty for keyword-only path). */
  matchedThemes: string[];
  rationale: string;
  method: ClassificationMethod;
  /** Populated when method === 'ai'. */
  modelId?: string;
}

export interface ClassifyDealAsyncOptions {
  /** Inject a mock model in tests. */
  model?: LanguageModel;
  /** Skip AI even when API keys are present. */
  forceKeywordOnly?: boolean;
}

/** Default gateway model — fetched from AI Gateway catalog (openai/gpt-* family). */
export const CLASSIFICATION_GATEWAY_MODEL = 'openai/gpt-5.4-mini' as const;
export const CLASSIFICATION_OPENAI_MODEL = 'gpt-5.4-mini' as const;

/** Curated keywords — sectors, products, and clinical areas in women's health M&A. */
export const WOMENS_HEALTH_KEYWORDS = [
  'women\'s health',
  'womens health',
  'female health',
  'fertility',
  'infertility',
  'ivf',
  'in vitro',
  'obstetric',
  'ob-gyn',
  'obgyn',
  'gynecolog',
  'gynaecolog',
  'maternal',
  'maternity',
  'prenatal',
  'postpartum',
  'menopause',
  'menstrual',
  'period tracking',
  'contraception',
  'birth control',
  'pelvic floor',
  'pelvic health',
  'endometriosis',
  'pcos',
  'polycystic ovary',
  'uterine',
  'fibroid',
  'ovarian',
  'breast health',
  'lactation',
  'midwifery',
  'egg freezing',
  'reproductive',
  'pregnancy',
  'femtech',
  'fem tech',
] as const;

const HIGH_SIGNAL = new Set([
  'women\'s health',
  'womens health',
  'fertility',
  'ob-gyn',
  'obgyn',
  'gynecolog',
  'gynaecolog',
  'maternal health',
  'reproductive health',
  'femtech',
]);

const aiClassificationSchema = z.object({
  womensHealthRelevant: z
    .boolean()
    .describe('True when the acquisition target or rationale is primarily women\'s / female health'),
  confidence: z.enum(['high', 'medium', 'low']).describe('high = explicit WH focus; low = tangential'),
  matchedKeywords: z
    .array(z.string())
    .describe("Specific women's health terms found in the disclosure"),
  matchedThemes: z
    .array(z.string())
    .describe('Broader themes e.g. fertility, maternal care, femtech, OB-GYN devices'),
  rationale: z.string().describe('One or two sentences citing evidence from the filing excerpt'),
});

export type AiClassificationOutput = z.infer<typeof aiClassificationSchema>;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

function countMatches(text: string): string[] {
  const norm = normalize(text);
  return WOMENS_HEALTH_KEYWORDS.filter((kw) => norm.includes(kw));
}

function buildCorpus(input: DealClassificationInput): string {
  return [
    input.filingText,
    input.targetName ?? '',
    input.acquirerName ?? '',
    input.sicDescription ?? '',
  ].join(' ');
}

/**
 * Keyword-only classification — synchronous, no API keys required.
 * Does not use synthetic data — only supplied disclosure text/metadata.
 */
export function classifyDealKeywordOnly(input: DealClassificationInput): DealClassification {
  const corpus = buildCorpus(input);
  const matchedKeywords = countMatches(corpus);
  const unique = [...new Set(matchedKeywords)];

  if (unique.length === 0) {
    return {
      womensHealthRelevant: false,
      confidence: 'low',
      matchedKeywords: [],
      matchedThemes: [],
      rationale: 'No women\'s health keywords in filing excerpt or names',
      method: 'keyword',
    };
  }

  const hasHighSignal = unique.some((kw) => HIGH_SIGNAL.has(kw) || HIGH_SIGNAL.has(kw.replace(/y$/, 'y')));
  const healthcareSic =
    input.sicCode?.startsWith('283') === true || input.sicCode?.startsWith('384') === true;

  let confidence: ClassificationConfidence;
  if (unique.length >= 2 || hasHighSignal) {
    confidence = 'high';
  } else if (unique.length === 1 && healthcareSic) {
    confidence = 'medium';
  } else if (unique.length === 1) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    womensHealthRelevant: true,
    confidence,
    matchedKeywords: unique,
    matchedThemes: [],
    rationale:
      confidence === 'high'
        ? `Strong women's health signals: ${unique.slice(0, 4).join(', ')}`
        : `Possible women's health relevance: ${unique.join(', ')}`,
    method: 'keyword',
  };
}

/** @deprecated Alias for classifyDealKeywordOnly — prefer classifyDealAsync in ingest pipelines. */
export function classifyDeal(input: DealClassificationInput): DealClassification {
  return classifyDealKeywordOnly(input);
}

/** True when an AI provider API key is configured. */
export function isAiClassificationAvailable(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  );
}

function resolveClassificationModel(
  override?: LanguageModel,
): { model: LanguageModel; modelId: string } | null {
  if (override) {
    return { model: override, modelId: 'mock' };
  }
  if (process.env.AI_GATEWAY_API_KEY?.trim()) {
    return { model: CLASSIFICATION_GATEWAY_MODEL, modelId: CLASSIFICATION_GATEWAY_MODEL };
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return {
      model: openai(CLASSIFICATION_OPENAI_MODEL),
      modelId: CLASSIFICATION_OPENAI_MODEL,
    };
  }
  return null;
}

function buildClassificationPrompt(input: DealClassificationInput): string {
  const excerpt = input.filingText.slice(0, 6000);
  return [
    'You classify SEC Form 8-K Item 2.01 acquisition disclosures for women\'s health M&A relevance.',
    'Be conservative: general healthcare or pharma without female-specific focus → womensHealthRelevant false.',
    'Only cite terms present in the excerpt; do not invent deal details.',
    '',
    input.acquirerName ? `Acquirer: ${input.acquirerName}` : '',
    input.targetName ? `Target (if known): ${input.targetName}` : '',
    input.sicCode ? `Acquirer SIC: ${input.sicCode}${input.sicDescription ? ` (${input.sicDescription})` : ''}` : '',
    '',
    'Filing excerpt:',
    excerpt,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Classify with AI structured output when API keys are set; otherwise keyword-only.
 * On AI failure, degrades honestly to keyword path (method: keyword).
 */
export async function classifyDealAsync(
  input: DealClassificationInput,
  options: ClassifyDealAsyncOptions = {},
): Promise<DealClassification> {
  if (options.forceKeywordOnly) {
    return classifyDealKeywordOnly(input);
  }

  const resolved = resolveClassificationModel(options.model);
  if (!resolved) {
    return classifyDealKeywordOnly(input);
  }

  try {
    const { output } = await generateText({
      model: resolved.model,
      output: Output.object({
        name: 'WomensHealthDealClassification',
        description: 'Women\'s health relevance of an SEC 8-K acquisition filing',
        schema: aiClassificationSchema,
      }),
      prompt: buildClassificationPrompt(input),
    });

    if (!output) {
      throw new Error('AI classification returned no structured output');
    }

    const keywordBaseline = classifyDealKeywordOnly(input);
    const mergedKeywords = [
      ...new Set([...output.matchedKeywords, ...keywordBaseline.matchedKeywords]),
    ];

    return {
      womensHealthRelevant: output.womensHealthRelevant,
      confidence: output.confidence,
      matchedKeywords: mergedKeywords,
      matchedThemes: output.matchedThemes,
      rationale: output.rationale,
      method: 'ai',
      modelId: resolved.modelId,
    };
  } catch {
    const fallback = classifyDealKeywordOnly(input);
    return {
      ...fallback,
      rationale: `${fallback.rationale} (AI classification unavailable — keyword fallback)`,
    };
  }
}

/** Medium and high confidence qualify for automatic lacuna_deals insert. */
export function shouldAutoInsert(confidence: ClassificationConfidence): boolean {
  return confidence === 'high' || confidence === 'medium';
}

/** DB status for candidates below auto-insert threshold. */
export function statusForConfidence(confidence: ClassificationConfidence): 'pending' | 'pending_review' {
  return shouldAutoInsert(confidence) ? 'pending' : 'pending_review';
}
