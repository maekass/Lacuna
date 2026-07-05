/**
 * LLM analyst grounded in the patient empowerment pipeline snapshot.
 */

import {
  isServerInferenceConfigured,
  resolveInferenceModel,
  EMPOWERMENT_GAP_GATEWAY_MODEL,
  EMPOWERMENT_GAP_OPENAI_MODEL,
} from "@/lib/ai/inference";
import {
  buildPatientEmpowermentGapPrompt,
  PATIENT_EMPOWERMENT_GAP_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import {
  assessLlmOutput,
  generateQualifiedInference,
  type LlmQualityReport,
} from "@/lib/ai/quality";
import {
  empowermentSnapshotForLlm,
  type PatientEmpowermentSnapshot,
} from "@/lib/research/patientEmpowermentPipeline";

export function isPatientEmpowermentGapLlmConfigured(): boolean {
  return isServerInferenceConfigured();
}

export interface PatientEmpowermentGapAnswer {
  answer: string;
  modelId: string | null;
  configured: boolean;
  warnings: string[];
  quality: LlmQualityReport | null;
}

const DEFAULT_QUESTION =
  "Which empowerment gaps have the highest gap index and weakest portfolio coverage in Lacuna's sample?";

export async function answerPatientEmpowermentGapQuestion(
  snapshot: PatientEmpowermentSnapshot,
  question?: string,
): Promise<PatientEmpowermentGapAnswer> {
  const q = question?.trim() || DEFAULT_QUESTION;
  const snapshotJson = empowermentSnapshotForLlm(snapshot);

  const resolved = resolveInferenceModel({
    gatewayModel: EMPOWERMENT_GAP_GATEWAY_MODEL,
    openaiModel: EMPOWERMENT_GAP_OPENAI_MODEL,
  });

  if (!resolved) {
    const narrative = buildDeterministicEmpowermentNarrative(snapshot);
    const { text, quality } = assessLlmOutput(narrative, {
      feature: "patient-empowerment-gap",
      modelId: "deterministic",
      groundingContext: snapshotJson,
    });
    return {
      answer: text,
      modelId: null,
      configured: false,
      warnings: [
        "Server inference not configured — deterministic summary only.",
        ...quality.warnings,
      ],
      quality,
    };
  }

  try {
    const prompt = buildPatientEmpowermentGapPrompt({
      question: q,
      snapshotJson,
    });
    const { text, quality } = await generateQualifiedInference({
      resolved,
      system: PATIENT_EMPOWERMENT_GAP_SYSTEM_PROMPT,
      prompt,
      feature: "patient-empowerment-gap",
      groundingContext: snapshotJson,
      maxOutputTokens: 600,
      temperature: 0.2,
    });
    return {
      answer: text,
      modelId: resolved.modelId,
      configured: true,
      warnings: quality.warnings,
      quality,
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Empowerment gap analysis failed";
    const narrative =
      `${buildDeterministicEmpowermentNarrative(snapshot)} (LLM unavailable: ${message})`;
    const { text, quality } = assessLlmOutput(narrative, {
      feature: "patient-empowerment-gap",
      modelId: resolved.modelId,
      groundingContext: snapshotJson,
    });
    return {
      answer: text,
      modelId: resolved.modelId,
      configured: true,
      warnings: [message, ...quality.warnings],
      quality,
    };
  }
}

/** Non-LLM fallback narrative for the panel. */
export function buildDeterministicEmpowermentNarrative(
  snapshot: PatientEmpowermentSnapshot,
): string {
  const { summary, prerequisiteMatrix, dimensions } = snapshot;
  const topGaps = [...dimensions]
    .sort((a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct)
    .slice(0, 3)
    .map((d) =>
      `${d.metric.label} (index ${d.metric.gapIndexPct}, cited ${d.metric.citedValue})`
    )
    .join("; ");

  const weakPrereq = [...prerequisiteMatrix]
    .sort((a, b) => b.meanGapIndexPct - a.meanGapIndexPct)[0];

  const zeroCoverage = dimensions
    .filter((d) => d.isPortfolioGap)
    .slice(0, 3)
    .map((d) => d.metric.id.replace(/-/g, " "))
    .join(", ");

  return (
    `HLTH/Outcomes4Me 2022 breast cancer baseline (n=${summary.surveyRespondents}): ` +
    `mean gap index ${summary.meanGapIndexPct}/100 across ${summary.metricCount} dimensions. ` +
    (topGaps ? `Largest gaps: ${topGaps}. ` : "") +
    (weakPrereq
      ? `Weakest prerequisite: ${weakPrereq.label} (mean index ${weakPrereq.meanGapIndexPct}). `
      : "") +
    `${summary.linkedCompanyCount} sample companies and ${summary.linkedDealCount} verified deals crosswalked ` +
    `(${summary.curatedLinkCount} curated links). ` +
    (zeroCoverage
      ? `Portfolio gaps (zero match despite addressable sectors): ${zeroCoverage}. `
      : "") +
    `Crosswalk uses curated mappings, sector overlap, and keywords — not live patient data or investment advice.`
  );
}
