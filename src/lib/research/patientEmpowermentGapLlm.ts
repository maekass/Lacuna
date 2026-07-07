/**
 * LLM analyst grounded in the patient empowerment pipeline snapshot.
 */

import {
  EMPOWERMENT_GAP_GATEWAY_MODEL,
  EMPOWERMENT_GAP_OPENAI_MODEL,
  isServerInferenceConfigured,
  resolveInferenceModel,
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
  "Where is gap index high but portfolio coverage low in Lacuna's sample?";

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
    const narrative = `${
      buildDeterministicEmpowermentNarrative(snapshot)
    } (LLM unavailable: ${message})`;
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
  const { summary, prerequisiteMatrix, priorityRankings } = snapshot;

  const topPriority = priorityRankings.slice(0, 3).map((d) =>
    `${d.metric.label} (priority ${d.priorityScore}, gap ${d.metric.gapIndexPct}, curated ${d.curatedCoveragePct}%, evidence ${d.evidenceCoveragePct}%)`
  ).join("; ");

  const weakPrereq = [...prerequisiteMatrix]
    .sort((a, b) => b.meanGapIndexPct - a.meanGapIndexPct)[0];

  const portfolioGaps = priorityRankings
    .filter((d) => d.isPortfolioGap)
    .slice(0, 3)
    .map((d) => d.metric.label)
    .join(", ");

  return (
    `HLTH/Outcomes4Me 2022 breast cancer baseline (n=${summary.surveyRespondents}): ` +
    `median gap ${summary.medianGapIndexPct}/100, weighted burden ${summary.weightedBurdenIndexPct}/100, ` +
    `${summary.criticalMetricCount} critical and ${summary.highMetricCount} high-severity dimensions. ` +
    `Max gap: ${summary.maxGapMetricLabel} (${summary.maxGapIndexPct}/100). ` +
    (topPriority
      ? `Highest priority (gap × thin coverage): ${topPriority}. `
      : "") +
    (weakPrereq
      ? `Weakest prerequisite: ${weakPrereq.label} (mean ${weakPrereq.meanGapIndexPct}/100). `
      : "") +
    `${summary.linkedCompanyCount} companies, ${summary.linkedDealCount} deals, ${summary.curatedLinkCount} curated links. ` +
    (portfolioGaps ? `Portfolio gaps (zero match): ${portfolioGaps}. ` : "") +
    `Not live patient data or investment advice.`
  );
}
