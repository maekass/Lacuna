/**
 * LLM-assisted domestic study discovery — structured candidates from source text.
 */

import type { LanguageModel } from "ai";
import {
  generateInferenceObject,
  isServerInferenceConfigured,
  resolveInferenceModel,
  STUDY_DISCOVERY_GATEWAY_MODEL,
  STUDY_DISCOVERY_OPENAI_MODEL,
} from "@/lib/ai/inference";
import {
  buildStudyDiscoveryPrompt,
  STUDY_DISCOVERY_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  type StudyDiscoveryOutput,
  studyDiscoverySchema,
} from "@/lib/ai/schemas";
import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";

export function isStudyDiscoveryLlmConfigured(): boolean {
  return isServerInferenceConfigured();
}

export interface DiscoverDomesticStudiesOptions {
  institution: DomesticInstitution;
  /** Raw NIH / CT.gov / catalog text to mine for candidates. */
  sourceText: string;
  model?: LanguageModel;
  maxCandidates?: number;
}

export interface StudyDiscoveryResult {
  candidates: StudyDiscoveryOutput["candidates"];
  summary?: string;
  modelId: string | null;
  configured: boolean;
  warnings: string[];
}

/**
 * Extract structured study candidates from public source text.
 * Returns empty candidates when inference is not configured.
 */
export async function discoverDomesticStudies(
  options: DiscoverDomesticStudiesOptions,
): Promise<StudyDiscoveryResult> {
  const resolved = resolveInferenceModel({
    gatewayModel: STUDY_DISCOVERY_GATEWAY_MODEL,
    openaiModel: STUDY_DISCOVERY_OPENAI_MODEL,
    override: options.model,
  });

  if (!resolved) {
    return {
      candidates: [],
      modelId: null,
      configured: false,
      warnings: ["Server inference not configured — no LLM discovery."],
    };
  }

  try {
    const { data } = await generateInferenceObject({
      resolved,
      system: STUDY_DISCOVERY_SYSTEM_PROMPT,
      prompt: buildStudyDiscoveryPrompt({
        institution: options.institution,
        sourceText: options.sourceText,
        maxCandidates: options.maxCandidates ?? 8,
      }),
      schema: studyDiscoverySchema,
      schemaName: "DomesticStudyDiscovery",
      schemaDescription:
        "Women's health research study candidates from public US sources",
      feature: "study-discovery",
      gatewayTags: ["feature:study-discovery", "pipeline:domestic-catalog"],
      maxOutputTokens: 1200,
      temperature: 0.15,
    });

    return {
      candidates: data.candidates,
      summary: data.summary,
      modelId: resolved.modelId,
      configured: true,
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Study discovery failed";
    return {
      candidates: [],
      modelId: resolved.modelId,
      configured: true,
      warnings: [message],
    };
  }
}
