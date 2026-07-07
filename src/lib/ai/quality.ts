/**
 * Platform-wide LLM quality gate — sanitize, ground, score, and flag risk.
 * Applied after every free-text inference call.
 */

import {
  generateInferenceText,
  type ResolvedInferenceModel,
} from "@/lib/ai/inference";
import {
  PROMPT_VERSION,
  sanitizeLLMOutput,
  validatePromptTemplate,
} from "@/lib/ai/prompts";

export type LlmQualityLevel = "high" | "medium" | "low" | "blocked";

export interface LlmQualityFlags {
  sanitized: boolean;
  hallucinationRisk: boolean;
  adviceRisk: boolean;
  groundingOk: boolean;
  lengthOk: boolean;
  promptValid: boolean;
}

export interface LlmQualityReport {
  level: LlmQualityLevel;
  score: number;
  warnings: string[];
  flags: LlmQualityFlags;
  feature: string;
  modelId: string;
  promptVersion: string;
}

export interface AssessQualityOptions {
  feature: string;
  modelId: string;
  /** Source context the model was allowed to use (pipeline JSON, metrics, etc.). */
  groundingContext?: string;
  /** Terms that should appear when the prompt is about a specific entity. */
  requiredTerms?: string[];
  /** Prompt string for pre-flight validation (optional). */
  prompt?: string;
}

/** Investment / clinical advice patterns — educational demos must not produce these. */
const ADVICE_PATTERNS = [
  /\b(?:you should|we recommend)\s+(?:buy|sell|invest|acquire|prescribe|diagnose)\b/i,
  /\b(?:buy|sell)\s+(?:shares?|stock|equity)\b/i,
  /\bguaranteed\s+(?:return|profit|outcome)\b/i,
  /\bthis is (?:a )?(?:strong )?(?:buy|sell)\b/i,
  /\b(?:prescribe|diagnose|treat)\s+(?:the patient|your patient)\b/i,
] as const;

/**
 * Assess free-text LLM output for Lacuna quality standards.
 * Pure function — no network.
 */
export function assessLlmOutput(
  rawText: string,
  options: AssessQualityOptions,
): { text: string; quality: LlmQualityReport } {
  const warnings: string[] = [];
  const { clean, warnings: sanitizeWarnings } = sanitizeLLMOutput(rawText);
  warnings.push(...sanitizeWarnings);

  let promptValid = true;
  if (options.prompt) {
    const validation = validatePromptTemplate(options.prompt);
    promptValid = validation.valid;
    if (!validation.valid) {
      warnings.push(...validation.issues.map((i) => `Prompt: ${i}`));
    }
  }

  const hallucinationRisk = sanitizeWarnings.some((w) =>
    w.toLowerCase().includes("hallucination")
  );

  let adviceRisk = false;
  for (const pattern of ADVICE_PATTERNS) {
    if (pattern.test(clean)) {
      adviceRisk = true;
      warnings.push(
        "Advice risk: output resembles investment or clinical advice",
      );
      break;
    }
  }

  const lengthOk = clean.length >= 20 && clean.length <= 2000;
  if (clean.length < 20) {
    warnings.push("Output too short (< 20 chars)");
  }

  let groundingOk = true;
  if (options.groundingContext) {
    const grounding = checkGrounding(clean, options.groundingContext);
    groundingOk = grounding.ok;
    if (!grounding.ok) {
      warnings.push(
        `Grounding: terms not found in context: ${
          grounding.missing.slice(0, 5).join(", ")
        }`,
      );
    }
  }

  if (options.requiredTerms?.length) {
    for (const term of options.requiredTerms) {
      if (term && !clean.toLowerCase().includes(term.toLowerCase())) {
        // Soft signal — narratives may paraphrase entity names
        warnings.push(`Entity term not echoed: ${term}`);
      }
    }
  }

  let score = 100;
  if (hallucinationRisk) score -= 35;
  if (adviceRisk) score -= 40;
  if (!groundingOk) score -= 25;
  if (!lengthOk) score -= 15;
  if (!promptValid) score -= 10;
  score -= Math.min(20, Math.max(0, warnings.length - 2) * 5);
  score = Math.max(0, Math.min(100, score));

  let level: LlmQualityLevel = "high";
  if (adviceRisk || score < 40) level = "blocked";
  else if (score < 60 || hallucinationRisk) level = "low";
  else if (score < 80 || warnings.length > 0) level = "medium";

  // Blocked: replace with safe message
  let text = clean;
  if (level === "blocked") {
    text =
      "This narrative was withheld because it failed Lacuna quality checks (possible advice or high-risk claims). Use the underlying verified metrics instead.";
    warnings.push("Output blocked by quality gate");
  }

  return {
    text,
    quality: {
      level,
      score,
      warnings,
      flags: {
        sanitized: true,
        hallucinationRisk,
        adviceRisk,
        groundingOk,
        lengthOk,
        promptValid,
      },
      feature: options.feature,
      modelId: options.modelId,
      promptVersion: PROMPT_VERSION,
    },
  };
}

/**
 * Lightweight grounding: dollar amounts and multi-word Title Case phrases
 * in the output should appear in the grounding context (case-insensitive).
 */
export function checkGrounding(
  output: string,
  context: string,
): { ok: boolean; missing: string[] } {
  const ctx = context.toLowerCase();
  const missing: string[] = [];

  const money =
    output.match(/\$[\d,]+(?:\.\d+)?\s*(?:million|billion|M|B)?/gi) ??
      [];
  for (const m of money) {
    const norm = m.toLowerCase().replace(/,/g, "");
    if (!ctx.includes(norm) && !ctx.includes(m.toLowerCase())) {
      missing.push(m);
    }
  }

  // NCT IDs
  const ncts = output.match(/\bNCT\d{8}\b/gi) ?? [];
  for (const nct of ncts) {
    if (!ctx.includes(nct.toLowerCase())) missing.push(nct);
  }

  return { ok: missing.length === 0, missing };
}

export interface QualifiedInferenceParams {
  resolved: ResolvedInferenceModel;
  system: string;
  prompt: string;
  feature: string;
  groundingContext?: string;
  requiredTerms?: string[];
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Run inference then the platform quality gate.
 * Prefer this over bare generateInferenceText for user-facing text.
 */
export async function generateQualifiedInference(
  params: QualifiedInferenceParams,
): Promise<{ text: string; quality: LlmQualityReport }> {
  const promptCheck = validatePromptTemplate(params.prompt);
  if (
    !promptCheck.valid &&
    promptCheck.issues.some((i) => i.includes("too short"))
  ) {
    return assessLlmOutput("", {
      feature: params.feature,
      modelId: params.resolved.modelId,
      prompt: params.prompt,
      groundingContext: params.groundingContext,
      requiredTerms: params.requiredTerms,
    });
  }

  const raw = await generateInferenceText({
    resolved: params.resolved,
    system: params.system,
    prompt: params.prompt,
    maxOutputTokens: params.maxOutputTokens,
    temperature: params.temperature,
    gatewayTags: [`feature:${params.feature}`, "quality:gated"],
  });

  return assessLlmOutput(raw, {
    feature: params.feature,
    modelId: params.resolved.modelId,
    groundingContext: params.groundingContext,
    requiredTerms: params.requiredTerms,
    prompt: params.prompt,
  });
}

/** Catalog of LLM features and their quality expectations (for /api/ai/quality). */
export const LLM_QUALITY_CATALOG = [
  {
    feature: "ui-insights",
    route: "POST /api/ai/insights",
    description:
      "Company narrative blurbs (acquisition, evidence, reimbursement)",
    grounded: true,
  },
  {
    feature: "space-wh-gap",
    route: "POST /api/research/space-wh-pipeline/ask",
    description: "Space research → trial → transaction gap analyst",
    grounded: true,
  },
  {
    feature: "patient-empowerment-gap",
    route: "POST /api/research/patient-empowerment/ask",
    description: "HLTH empowerment baseline × portfolio gap analyst",
    grounded: true,
  },
  {
    feature: "sec-ingest",
    route: "dealClassificationEngine (cron/CLI)",
    description: "SEC 8-K WH classification (structured output)",
    grounded: true,
  },
] as const;
