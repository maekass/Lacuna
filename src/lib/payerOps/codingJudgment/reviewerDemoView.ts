/**
 * Client-safe contracts for the reviewer demo page: the shape of the recorded
 * reviewer data and the test-case candidate a reviewer can download.
 *
 * No Node imports here; the page bundles this file. The data builder lives in
 * reviewerDemo.ts and runs only in scripts and tests.
 */
import { z } from "zod";
import {
  caseFactsSchema,
  claimIntakeSchema,
  conditionSchema,
  decisionSchema,
  routeSchema,
} from "./schemas";

export const REVIEWER_DEMO_SCHEMA_VERSION = "1.0.0";

export const pinnedRowViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.array(z.tuple([z.string(), z.string()])),
});
export type PinnedRowView = z.infer<typeof pinnedRowViewSchema>;

/** Claim facts for one case, shared by every model and arm that saw it. */
export const reviewerItemSchema = z.object({
  caseId: z.string(),
  question: z.string(),
  facts: caseFactsSchema,
  intake: claimIntakeSchema,
});
export type ReviewerItem = z.infer<typeof reviewerItemSchema>;

/** One recorded model reply on one case, with the guard's final route. */
export const reviewerRecordSchema = z.object({
  key: z.string(),
  runId: z.string(),
  caseId: z.string(),
  modelId: z.string(),
  condition: conditionSchema,
  model: z.union([
    z.object({
      ok: z.literal(true),
      decision: decisionSchema,
      route: routeSchema,
      confidence: z.number(),
      rationale: z.string(),
      citations: z.array(z.string()),
    }),
    z.object({ ok: z.literal(false), reason: z.string() }),
  ]),
  finalRoute: routeSchema,
  overrodeModel: z.boolean(),
  reasons: z.array(z.string()),
  reasonText: z.string(),
  ruleDecision: decisionSchema.nullable(),
  decidingRowIds: z.array(z.string()),
});
export type ReviewerRecord = z.infer<typeof reviewerRecordSchema>;

export const reviewerRunSchema = z.object({
  runId: z.string(),
  label: z.string(),
  note: z.string(),
  recordedAt: z.string(),
  promptVersion: z.string(),
  modelIds: z.array(z.string()),
  conditions: z.array(conditionSchema),
  caseCount: z.number().int(),
  items: z.array(reviewerItemSchema),
  /** Pinned rows cited by a model or used by the guard, keyed by row id. */
  rows: z.record(z.string(), pinnedRowViewSchema),
});
export type ReviewerRun = z.infer<typeof reviewerRunSchema>;

export const reviewerDemoSchema = z.object({
  schemaVersion: z.literal(REVIEWER_DEMO_SCHEMA_VERSION),
  guardVersion: z.string(),
  status: z.string(),
  runs: z.array(reviewerRunSchema),
  records: z.array(reviewerRecordSchema),
});
export type ReviewerDemo = z.infer<typeof reviewerDemoSchema>;

/** A test-case candidate built from a reviewer's disagreement. */
export const testCaseCandidateSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  kind: z.literal("coding-judgment-test-case-candidate"),
  status: z.literal("candidate_not_adjudicated"),
  createdAt: z.iso.datetime(),
  source: z.object({
    runId: z.string(),
    caseId: z.string(),
    modelId: z.string(),
    condition: conditionSchema,
    guardVersion: z.string(),
  }),
  question: z.string(),
  facts: caseFactsSchema,
  intake: claimIntakeSchema,
  recorded: z.object({
    modelDecision: decisionSchema.nullable(),
    modelRoute: routeSchema.nullable(),
    finalRoute: routeSchema,
    reasons: z.array(z.string()),
    citedIds: z.array(z.string()),
  }),
  reviewer: z.object({
    note: z.string().min(1),
    proposedDecision: decisionSchema.nullable(),
    proposedRoute: routeSchema.nullable(),
  }),
});
export type TestCaseCandidate = z.infer<typeof testCaseCandidateSchema>;

export function buildTestCaseCandidate(
  record: ReviewerRecord,
  item: ReviewerItem,
  guardVersion: string,
  reviewer: TestCaseCandidate["reviewer"],
  createdAt: string,
): TestCaseCandidate {
  if (record.caseId !== item.caseId) {
    throw new Error(`Record ${record.key} is not case ${item.caseId}`);
  }
  return testCaseCandidateSchema.parse({
    schemaVersion: "1.0.0",
    kind: "coding-judgment-test-case-candidate",
    status: "candidate_not_adjudicated",
    createdAt,
    source: {
      runId: record.runId,
      caseId: record.caseId,
      modelId: record.modelId,
      condition: record.condition,
      guardVersion,
    },
    question: item.question,
    facts: item.facts,
    intake: item.intake,
    recorded: {
      modelDecision: record.model.ok ? record.model.decision : null,
      modelRoute: record.model.ok ? record.model.route : null,
      finalRoute: record.finalRoute,
      reasons: record.reasons,
      citedIds: record.model.ok ? record.model.citations : [],
    },
    reviewer: { ...reviewer, note: reviewer.note.trim() },
  });
}
