/**
 * Zod schemas for structured LLM outputs — one per inference pipeline.
 * Used with {@link generateInferenceObject} so malformed output triggers typed retry.
 */

import { z } from "zod";

/** SEC 8-K women's-health deal classification (cron / ingest). */
export const dealClassificationSchema = z.object({
  womensHealthRelevant: z
    .boolean()
    .describe(
      "True when the acquisition target or rationale is primarily women's / female health",
    ),
  confidence: z.enum(["high", "medium", "low"]).describe(
    "high = explicit WH focus; low = tangential",
  ),
  matchedKeywords: z
    .array(z.string())
    .describe("Specific women's health terms found in the disclosure"),
  matchedThemes: z
    .array(z.string())
    .describe(
      "Broader themes e.g. fertility, maternal care, femtech, OB-GYN devices",
    ),
  rationale: z.string().describe(
    "One or two sentences citing evidence from the filing excerpt",
  ),
});

export type DealClassificationAiOutput = z.infer<
  typeof dealClassificationSchema
>;

/** Grounded narrative for gap-analyst and insight pipelines. */
export const groundedNarrativeSchema = z.object({
  answer: z
    .string()
    .min(20)
    .max(2_000)
    .describe(
      "Plain-text educational answer grounded only in the provided context JSON",
    ),
  citedLabels: z
    .array(z.string())
    .max(12)
    .optional()
    .describe("Asset, company, or metric labels echoed from context"),
});

export type GroundedNarrativeOutput = z.infer<typeof groundedNarrativeSchema>;

/** Domestic study discovery candidate from NIH / CT.gov context. */
export const studyDiscoveryCandidateSchema = z.object({
  title: z.string().min(3),
  conditions: z.array(z.string()).min(1).max(8),
  institutionHint: z.string().describe(
    "Institution or sponsor name from the source text",
  ),
  sourceHint: z.string().describe(
    "Public source citation (registry, program name, or URL fragment)",
  ),
  rationale: z.string().describe(
    "Why this study fits women's health and the institution preset",
  ),
});

export const studyDiscoverySchema = z.object({
  candidates: z.array(studyDiscoveryCandidateSchema).max(12),
  summary: z.string().max(500).optional(),
});

export type StudyDiscoveryOutput = z.infer<typeof studyDiscoverySchema>;
