/**
 * LLM-assisted domestic study discovery — structured candidates from public APIs.
 * Candidates are staging-only until a human merges into domesticStudyCatalog.ts.
 */

import {
  isServerInferenceConfigured,
  resolveInferenceModel,
  STUDY_DISCOVERY_GATEWAY_MODEL,
  STUDY_DISCOVERY_OPENAI_MODEL,
} from "@/lib/ai/inference";
import {
  buildStudyDiscoveryPrompt,
  STUDY_DISCOVERY_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { LlmQualityReport } from "@/lib/ai/quality";
import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";
import type { StudyDataTier } from "@/lib/research/domesticStudyCatalog";
import {
  groundingSnapshotForLlm,
  type ResearchDiscoveryGrounding,
} from "@/lib/research/researchDiscoveryFetch";
import type { ResearchDiscoveryPresetId } from "@/lib/research/researchDiscoveryPresets";
import { generateText, type LanguageModel, Output } from "ai";
import { z } from "zod";

export interface DomesticStudyCandidate {
  studyId: string;
  title: string;
  institution: DomesticInstitution;
  institutionLabel: string;
  sampleSize: number;
  sampleSizeNote: string;
  conditions: string[];
  markerGenes: string[];
  suggestedDataTier: StudyDataTier;
  source: string;
  sourceYear: number;
  clinicalTrialsSponsor?: string;
  nctIds: string[];
  nihApplIds: number[];
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface StudyDiscoveryResult {
  presetId: ResearchDiscoveryPresetId;
  candidates: DomesticStudyCandidate[];
  modelId: string | null;
  configured: boolean;
  warnings: string[];
  quality: LlmQualityReport | null;
  groundingSummary: {
    grantCount: number;
    trialCount: number;
    errors: string[];
  };
}

const candidateSchema = z.object({
  studyId: z.string().min(3).max(80),
  title: z.string().min(5).max(200),
  institution: z.enum(["nih", "harvard", "mit", "harvard_mit_collab"]),
  institutionLabel: z.string().min(3).max(120),
  sampleSize: z.number().int().min(0),
  sampleSizeNote: z.string().min(5).max(300),
  conditions: z.array(z.string()).max(8),
  markerGenes: z.array(z.string()).max(10),
  suggestedDataTier: z.enum([
    "cited_public",
    "illustrative_static",
    "llm_suggested",
  ]),
  source: z.string().min(5).max(300),
  sourceYear: z.number().int().min(2000).max(2030),
  clinicalTrialsSponsor: z.string().max(120).optional(),
  nctIds: z.array(z.string()).max(5),
  nihApplIds: z.array(z.number()).max(5),
  confidence: z.enum(["high", "medium", "low"]),
  rationale: z.string().min(10).max(400),
});

const discoveryOutputSchema = z.object({
  candidates: z.array(candidateSchema).max(12),
});

function buildDeterministicCandidates(
  grounding: ResearchDiscoveryGrounding,
): DomesticStudyCandidate[] {
  const existing = new Set(grounding.existingStudyIds);
  const candidates: DomesticStudyCandidate[] = [];
  const year = new Date().getFullYear();

  for (const trial of grounding.trials.slice(0, 5)) {
    const slug = `ctg-${trial.nctId.toLowerCase()}`;
    if (existing.has(slug)) continue;

    candidates.push({
      studyId: slug,
      title: trial.title,
      institution: grounding.presetId === "broad"
        ? "harvard_mit_collab"
        : grounding.presetId === "harvard"
        ? "harvard"
        : grounding.presetId === "nih"
        ? "nih"
        : "mit",
      institutionLabel: trial.sponsor,
      sampleSize: trial.enrollment ?? 0,
      sampleSizeNote: trial.enrollment
        ? `ClinicalTrials.gov enrollment: ${trial.enrollment} (${trial.status})`
        : `Enrollment not disclosed on ClinicalTrials.gov (${trial.status})`,
      conditions: trial.conditions,
      markerGenes: [],
      suggestedDataTier: trial.enrollment ? "cited_public" : "llm_suggested",
      source: `ClinicalTrials.gov ${trial.nctId} — ${trial.sponsor}`,
      sourceYear: year,
      clinicalTrialsSponsor: trial.sponsor,
      nctIds: [trial.nctId],
      nihApplIds: [],
      confidence: trial.enrollment ? "medium" : "low",
      rationale:
        `Trial ${trial.nctId} matched sponsor/condition filters (deterministic fallback).`,
    });
  }

  for (const grant of grounding.grants.slice(0, 4)) {
    const slug = `nih-${grant.applId}`;
    if (existing.has(slug)) continue;

    candidates.push({
      studyId: slug,
      title: grant.projectTitle,
      institution: grounding.presetId === "broad"
        ? "harvard_mit_collab"
        : grounding.presetId === "harvard"
        ? "harvard"
        : grounding.presetId === "nih"
        ? "nih"
        : "mit",
      institutionLabel: grant.orgName,
      sampleSize: 0,
      sampleSizeNote:
        "NIH RePORTER grant — participant N not in API; verify cohort size in publications",
      conditions: grant.terms.slice(0, 4),
      markerGenes: [],
      suggestedDataTier: "llm_suggested",
      source:
        `NIH RePORTER ApplId ${grant.applId} — ${grant.orgName} (FY${grant.fiscalYear})`,
      sourceYear: grant.fiscalYear || year,
      nctIds: [],
      nihApplIds: [grant.applId],
      confidence: "low",
      rationale:
        `Grant ${grant.applId} matched org + women's health text search (deterministic fallback).`,
    });
  }

  return candidates.slice(0, 8);
}

function dedupeCandidates(
  candidates: DomesticStudyCandidate[],
  existingStudyIds: string[],
): DomesticStudyCandidate[] {
  const seen = new Set(existingStudyIds);
  const out: DomesticStudyCandidate[] = [];

  for (const row of candidates) {
    if (seen.has(row.studyId)) continue;
    seen.add(row.studyId);
    out.push(row);
  }

  return out;
}

export function isStudyDiscoveryLlmConfigured(): boolean {
  return isServerInferenceConfigured();
}

/**
 * Propose catalog candidates from grounded NIH + CT.gov data.
 * Falls back to deterministic parsing when inference is unavailable.
 */
export async function discoverDomesticStudyCandidates(
  grounding: ResearchDiscoveryGrounding,
  options: {
    maxCandidates?: number;
    model?: LanguageModel;
  } = {},
): Promise<StudyDiscoveryResult> {
  const maxCandidates = options.maxCandidates ?? 8;
  const groundingJson = groundingSnapshotForLlm(grounding);
  const summary = {
    grantCount: grounding.grants.length,
    trialCount: grounding.trials.length,
    errors: grounding.errors,
  };

  const resolved = resolveInferenceModel({
    gatewayModel: STUDY_DISCOVERY_GATEWAY_MODEL,
    openaiModel: STUDY_DISCOVERY_OPENAI_MODEL,
    override: options.model,
  });

  if (!resolved) {
    const candidates = dedupeCandidates(
      buildDeterministicCandidates(grounding),
      grounding.existingStudyIds,
    );
    return {
      presetId: grounding.presetId,
      candidates,
      modelId: null,
      configured: false,
      warnings: [
        "Server inference not configured — deterministic NIH/CT.gov parse only.",
        ...grounding.errors,
      ],
      quality: null,
      groundingSummary: summary,
    };
  }

  try {
    const { output } = await generateText({
      model: resolved.model,
      ...(resolved.viaGateway
        ? {
          providerOptions: {
            gateway: {
              tags: ["feature:study-discovery", "pipeline:research-catalog"],
            },
          },
        }
        : {}),
      system: STUDY_DISCOVERY_SYSTEM_PROMPT,
      output: Output.object({
        name: "DomesticStudyDiscovery",
        description:
          "Women's health study catalog candidates grounded in NIH RePORTER and ClinicalTrials.gov",
        schema: discoveryOutputSchema,
      }),
      prompt: buildStudyDiscoveryPrompt({ groundingJson, maxCandidates }),
      temperature: 0.1,
    });

    if (!output?.candidates?.length) {
      throw new Error("AI discovery returned no candidates");
    }

    const candidates = dedupeCandidates(
      output.candidates.map((c) => ({
        ...c,
        clinicalTrialsSponsor: c.clinicalTrialsSponsor || undefined,
        nctIds: c.nctIds ?? [],
        nihApplIds: c.nihApplIds ?? [],
      })),
      grounding.existingStudyIds,
    );

    return {
      presetId: grounding.presetId,
      candidates: candidates.slice(0, maxCandidates),
      modelId: resolved.modelId,
      configured: true,
      warnings: grounding.errors,
      quality: null,
      groundingSummary: summary,
    };
  } catch (error) {
    console.error("study discovery LLM fallback:", error);
    const candidates = dedupeCandidates(
      buildDeterministicCandidates(grounding),
      grounding.existingStudyIds,
    );
    return {
      presetId: grounding.presetId,
      candidates,
      modelId: resolved.modelId,
      configured: true,
      warnings: [
        "LLM structuring failed — deterministic NIH/CT.gov parse used.",
        ...grounding.errors,
      ],
      quality: null,
      groundingSummary: summary,
    };
  }
}
