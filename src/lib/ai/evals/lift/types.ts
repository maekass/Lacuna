/**
 * Shared shapes for the cited-answer lift eval.
 *
 * The eval asks the same frozen questions to two arms — closed-book
 * (no retrieval) and the app's real retrieval + cited-answer path — under
 * versioned prompt templates, then scores the recorded responses with
 * deterministic checks. See docs/LLM_LIFT_EVAL.md.
 */
import { z } from "zod";
import { dispositionSchema } from "@/lib/ai/evals/clinicalEvidenceEval";

export const LIFT_EVAL_SET_VERSION = "lift-eval-set.v1" as const;
export const LIFT_RESPONSE_SCHEMA = "lacuna.lift-eval.response/v1" as const;
export const LIFT_REPORT_SCHEMA = "lacuna.lift-eval.report/v1" as const;

/** Snapshot date used for every request so admissibility is fixed. */
export const LIFT_AS_OF_DATE = "2026-11-01" as const;
export const LIFT_TOP_K = 5 as const;

export const liftItemTypeSchema = z.enum(["answerable", "should_abstain"]);
export type LiftItemType = z.infer<typeof liftItemTypeSchema>;

/** How the gold answer is normalized and matched. */
export const liftAnswerKindSchema = z.enum([
  "usd_millions",
  "iso_date",
  "year",
  "entity",
  "none",
]);
export type LiftAnswerKind = z.infer<typeof liftAnswerKindSchema>;

export const liftTemplateSchema = z.enum([
  "deal_value",
  "announced_date",
  "acquirer",
  "founded_year",
  "undisclosed_deal_value",
  "pending_close_date",
  "undisclosed_founded_year",
  "out_of_scope_revenue",
  "out_of_scope_headcount",
]);
export type LiftTemplate = z.infer<typeof liftTemplateSchema>;

export const liftGoldSchema = z.object({
  kind: liftAnswerKindSchema,
  /** Normalized gold value; null for should-abstain items. */
  value: z.union([z.number(), z.string(), z.null()]),
  /** Accepted surface forms for entity answers (normalized at score time). */
  aliases: z.array(z.string().min(1)).default([]),
  /** Dataset field the value was copied from, e.g. acquisitions[deal1].dealValue. */
  sourceField: z.string().min(1),
});
export type LiftGold = z.infer<typeof liftGoldSchema>;

export const liftEvalItemSchema = z.object({
  id: z.string().min(1),
  type: liftItemTypeSchema,
  template: liftTemplateSchema,
  question: z.string().min(1),
  gold: liftGoldSchema,
  /** Verified-dataset record ids (deal / company) behind the gold answer. */
  goldRecordIds: z.array(z.string().min(1)),
  /** Corpus passage ids, at least one of which must be cited. */
  goldPassageIds: z.array(z.string().min(1)),
});
export type LiftEvalItem = z.infer<typeof liftEvalItemSchema>;

export const liftEvalSetSchema = z.object({
  version: z.literal(LIFT_EVAL_SET_VERSION),
  generator: z.string().min(1),
  source: z.object({
    file: z.string().min(1),
    datasetVersion: z.string().min(1),
    lastUpdated: z.string().min(1),
  }),
  counts: z.object({
    total: z.number().int(),
    answerable: z.number().int(),
    shouldAbstain: z.number().int(),
    byTemplate: z.record(z.string(), z.number().int()),
  }),
  /** sha256 of the canonical JSON of `items`. */
  itemsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  items: z.array(liftEvalItemSchema).min(100).max(200),
});
export type LiftEvalSet = z.infer<typeof liftEvalSetSchema>;

export const liftArmSchema = z.enum(["no_retrieval", "retrieval"]);
export type LiftArm = z.infer<typeof liftArmSchema>;

export const liftPromptVersionSchema = z.enum(["v1", "v2"]);
export type LiftPromptVersion = z.infer<typeof liftPromptVersionSchema>;

/** One recorded model response. Live runs write these; replay reads them. */
export const liftResponseRecordSchema = z.object({
  schema: z.literal(LIFT_RESPONSE_SCHEMA),
  itemId: z.string().min(1),
  arm: liftArmSchema,
  promptVersion: liftPromptVersionSchema,
  modelId: z.string().min(1),
  disposition: dispositionSchema,
  answer: z.string(),
  claimTexts: z.array(z.string()).default([]),
  citedIds: z.array(z.string()).default([]),
  retrievedIds: z.array(z.string()).default([]),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }),
  latencyMs: z.number().nonnegative(),
  /** Set when inference failed; the app path then abstains. */
  error: z.string().optional(),
  /** True for the unit-test fake model; never valid in a reported run. */
  fake: z.boolean().optional(),
});
export type LiftResponseRecord = z.infer<typeof liftResponseRecordSchema>;

export interface ConfidenceInterval {
  estimate: number | null;
  low: number | null;
  high: number | null;
  /** Items in the metric's denominator. */
  n: number;
}

export interface LiftCellMetrics {
  arm: LiftArm;
  promptVersion: LiftPromptVersion;
  modelIds: string[];
  responses: number;
  errors: number;
  accuracy: ConfidenceInterval;
  citationCorrectness: ConfidenceInterval;
  unsupportedClaimRate: ConfidenceInterval;
  abstentionRate: ConfidenceInterval;
  falseAbstentionRate: ConfidenceInterval;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LiftComparison {
  promptVersion: LiftPromptVersion;
  /** Retrieval minus no-retrieval, paired bootstrap over items. */
  accuracy: ConfidenceInterval;
  citationCorrectness: ConfidenceInterval;
  unsupportedClaimRate: ConfidenceInterval;
  abstentionRate: ConfidenceInterval;
  falseAbstentionRate: ConfidenceInterval;
}

export interface LiftReport {
  schema: typeof LIFT_REPORT_SCHEMA;
  /**
   * `invalid_provider_errors`: some cell's provider error rate exceeded the
   * report's limit. Errors score as abstentions, so such metrics are not
   * measurements and the gate rejects the report.
   */
  status: "measured" | "pending_live_run" | "invalid_provider_errors";
  mode: "live" | "replay";
  evalSet: { version: string; itemsSha256: string; items: number };
  corpus: { passages: number; snapshotHash: string };
  bootstrap: { resamples: number; seed: number; level: number };
  /** Deterministic, model-free: share of answerable items whose gold passage was retrieved. */
  retrievalRecallAtK: ConfidenceInterval & { k: number };
  cells: LiftCellMetrics[];
  lift: LiftComparison[];
  generatedAt: string;
}
