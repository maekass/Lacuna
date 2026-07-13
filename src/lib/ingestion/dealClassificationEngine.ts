/**
 * Women's health deal classification with confidence scoring.
 * Medium+ confidence → eligible for DB insert; low → pending_review.
 *
 * Server-side LLM: Vercel AI Gateway via `src/lib/ai/inference.ts` (see docs/INFERENCE.md).
 * Keyword-only fallback when gateway/OpenAI auth is unset.
 */

import {
  CLASSIFICATION_GATEWAY_MODEL,
  CLASSIFICATION_OPENAI_MODEL,
  generateInferenceObject,
  isServerInferenceConfigured,
  resolveInferenceModel,
} from "@/lib/ai/inference";
import {
  buildClassificationPrompt,
  CLASSIFICATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  type DealClassificationAiOutput,
  dealClassificationSchema,
} from "@/lib/ai/schemas";
import type { LanguageModel } from "ai";

export type ClassificationConfidence = "high" | "medium" | "low";
export type ClassificationMethod = "keyword" | "ai";

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

export {
  CLASSIFICATION_GATEWAY_MODEL,
  CLASSIFICATION_OPENAI_MODEL,
  hasAiGatewayAuth,
} from "@/lib/ai/inference";

export {
  type DealClassificationAiOutput,
  dealClassificationSchema,
} from "@/lib/ai/schemas";

/** Curated keywords — sectors, products, and clinical areas in women's health M&A. */
export const WOMENS_HEALTH_KEYWORDS = [
  "women's health",
  "womens health",
  "female health",
  "fertility",
  "infertility",
  "ivf",
  "in vitro",
  "obstetric",
  "ob-gyn",
  "obgyn",
  "gynecolog",
  "gynaecolog",
  "maternal",
  "maternity",
  "prenatal",
  "postpartum",
  "menopause",
  "menstrual",
  "period tracking",
  "contraception",
  "birth control",
  "pelvic floor",
  "pelvic health",
  "endometriosis",
  "pcos",
  "polycystic ovary",
  "uterine",
  "fibroid",
  "ovarian",
  "breast health",
  "lactation",
  "midwifery",
  "egg freezing",
  "reproductive",
  "pregnancy",
  "femtech",
  "fem tech",
] as const;

const HIGH_SIGNAL = new Set([
  "women's health",
  "womens health",
  "fertility",
  "ob-gyn",
  "obgyn",
  "gynecolog",
  "gynaecolog",
  "maternal health",
  "reproductive health",
  "femtech",
]);

/** @deprecated Use DealClassificationAiOutput from @/lib/ai/schemas */
export type AiClassificationOutput = DealClassificationAiOutput;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function countMatches(text: string): string[] {
  const norm = normalize(text);
  return WOMENS_HEALTH_KEYWORDS.filter((kw) => norm.includes(kw));
}

function buildCorpus(input: DealClassificationInput): string {
  return [
    input.filingText,
    input.targetName ?? "",
    input.acquirerName ?? "",
    input.sicDescription ?? "",
  ].join(" ");
}

/**
 * Keyword-only classification — synchronous, no API keys required.
 * Does not use synthetic data — only supplied disclosure text/metadata.
 */
export function classifyDealKeywordOnly(
  input: DealClassificationInput,
): DealClassification {
  const corpus = buildCorpus(input);
  const matchedKeywords = countMatches(corpus);
  const unique = [...new Set(matchedKeywords)];

  if (unique.length === 0) {
    return {
      womensHealthRelevant: false,
      confidence: "low",
      matchedKeywords: [],
      matchedThemes: [],
      rationale: "No women's health keywords in filing excerpt or names",
      method: "keyword",
    };
  }

  const hasHighSignal = unique.some((kw) =>
    HIGH_SIGNAL.has(kw) || HIGH_SIGNAL.has(kw.replace(/y$/, "y"))
  );
  const healthcareSic = input.sicCode?.startsWith("283") === true ||
    input.sicCode?.startsWith("384") === true;

  let confidence: ClassificationConfidence;
  if (unique.length >= 2 || hasHighSignal) {
    confidence = "high";
  } else if (unique.length === 1 && healthcareSic) {
    confidence = "medium";
  } else if (unique.length === 1) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    womensHealthRelevant: true,
    confidence,
    matchedKeywords: unique,
    matchedThemes: [],
    rationale: confidence === "high"
      ? `Strong women's health signals: ${unique.slice(0, 4).join(", ")}`
      : `Possible women's health relevance: ${unique.join(", ")}`,
    method: "keyword",
  };
}

/** @deprecated Alias for classifyDealKeywordOnly — prefer classifyDealAsync in ingest pipelines. */
export function classifyDeal(
  input: DealClassificationInput,
): DealClassification {
  return classifyDealKeywordOnly(input);
}

/** True when any AI classification path is configured (gateway or direct OpenAI). */
export function isAiClassificationAvailable(): boolean {
  return isServerInferenceConfigured();
}

function resolveClassificationModel(override?: LanguageModel) {
  return resolveInferenceModel({
    gatewayModel: CLASSIFICATION_GATEWAY_MODEL,
    openaiModel: CLASSIFICATION_OPENAI_MODEL,
    override,
  });
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
    const { data: output } = await generateInferenceObject({
      resolved,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt: buildClassificationPrompt({
        filingText: input.filingText,
        targetName: input.targetName,
        acquirerName: input.acquirerName,
        sicCode: input.sicCode,
        sicDescription: input.sicDescription,
      }),
      schema: dealClassificationSchema,
      schemaName: "WomensHealthDealClassification",
      schemaDescription:
        "Women's health relevance of an SEC 8-K acquisition filing",
      feature: "sec-deal-classification",
      gatewayTags: ["feature:sec-ingest", "pipeline:deal-classification"],
      maxOutputTokens: 512,
      temperature: 0.1,
    });

    const keywordBaseline = classifyDealKeywordOnly(input);
    const mergedKeywords = [
      ...new Set([
        ...output.matchedKeywords,
        ...keywordBaseline.matchedKeywords,
      ]),
    ];

    return {
      womensHealthRelevant: output.womensHealthRelevant,
      confidence: output.confidence,
      matchedKeywords: mergedKeywords,
      matchedThemes: output.matchedThemes,
      rationale: output.rationale,
      method: "ai",
      modelId: resolved.modelId,
    };
  } catch {
    const fallback = classifyDealKeywordOnly(input);
    return {
      ...fallback,
      rationale:
        `${fallback.rationale} (AI classification unavailable — keyword fallback)`,
    };
  }
}

/** Medium and high confidence qualify for automatic lacuna_deals insert. */
export function shouldAutoInsert(
  confidence: ClassificationConfidence,
): boolean {
  return confidence === "high" || confidence === "medium";
}

/** DB status for candidates below auto-insert threshold. */
export function statusForConfidence(
  confidence: ClassificationConfidence,
): "pending" | "pending_review" {
  return shouldAutoInsert(confidence) ? "pending" : "pending_review";
}
