/**
 * Source-grounded QA evaluation for offline, researcher-reviewed evidence answers.
 *
 * This module evaluates a frozen benchmark and exported model runs. It does not
 * call a model, retrieve evidence, or establish clinical validity.
 */
import { createHash } from "node:crypto";
import { z } from "zod";

export const dispositionSchema = z.enum([
  "answer",
  "qualified_answer",
  "abstain",
]);
export type AnswerDisposition = z.infer<typeof dispositionSchema>;

const citationJudgmentSchema = z.enum([
  "supports",
  "partially_supports",
  "does_not_support",
  "not_assessed",
]);

export const clinicalEvidenceCaseSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  expectedDisposition: dispositionSchema,
  relevantEvidenceIds: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)),
  limitationTags: z.array(z.string().min(1)),
  adjudication: z.object({
    status: z.enum(["pending", "adjudicated"]),
    reviewerAliases: z.array(z.string().min(1)),
    reviewerRoles: z.array(z.enum(["clinician", "researcher", "methodologist"])),
    adjudicatedAt: z.string().optional(),
    rationale: z.string().optional(),
  }),
});
export type ClinicalEvidenceCase = z.infer<typeof clinicalEvidenceCaseSchema>;

export const clinicalEvidenceBenchmarkSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  benchmarkId: z.string().min(1),
  benchmarkVersion: z.string().min(1),
  intendedUse: z.string().min(1),
  status: z.enum(["development", "reviewed"]),
  minimumSliceN: z.number().int().positive().default(5),
  cases: z.array(clinicalEvidenceCaseSchema).min(1),
});
export type ClinicalEvidenceBenchmark = z.infer<
  typeof clinicalEvidenceBenchmarkSchema
>;

const runCaseSchema = z.object({
  caseId: z.string().min(1),
  disposition: dispositionSchema,
  answer: z.string(),
  retrievedEvidenceIds: z.array(z.string().min(1)),
  citations: z.array(z.object({
    claimId: z.string().min(1),
    evidenceId: z.string().min(1),
    judgment: citationJudgmentSchema,
  })),
});
export type ClinicalEvidenceRunCase = z.infer<typeof runCaseSchema>;

export const clinicalEvidenceRunSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().min(1),
  createdAt: z.string().datetime(),
  gitCommit: z.string().min(1),
  modelProvider: z.string().min(1),
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  promptVersion: z.string().min(1),
  retrieverVersion: z.string().min(1),
  retrievalConfigHash: z.string().min(1),
  sourceSnapshotHash: z.string().min(1),
  reviewerProtocolVersion: z.string().min(1),
  cases: z.array(runCaseSchema).min(1),
});
export type ClinicalEvidenceRun = z.infer<typeof clinicalEvidenceRunSchema>;

export interface SliceMetric {
  tag: string;
  n: number | null;
  dispositionAccuracy: number | null;
  citationSupportRate: number | null;
  suppressed: boolean;
}

export interface ClinicalEvidenceEvalReport {
  schemaVersion: "1.0.0";
  benchmarkId: string;
  benchmarkVersion: string;
  runId: string;
  runManifestHash: string;
  caseCount: number;
  adjudicatedCaseCount: number;
  dispositionAccuracy: number | null;
  unanswerableAbstentionRecall: number | null;
  answerableAbstentionRate: number | null;
  retrievalRecallAtK: number | null;
  citationValidityRate: number | null;
  citationSupportRate: number | null;
  unsupportedCitationCount: number;
  unresolvedCitationCount: number;
  reviewCoverage: number;
  sliceMetrics: SliceMetric[];
  interpretation: string[];
  clinicalValidationAuthorized: false;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Hashes normalized JSON; object key order is fixed by constructing typed payloads. */
export function sha256Json(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

/** Evaluates only cases with completed adjudication and a matching run result. */
export function evaluateClinicalEvidenceRun(
  benchmarkInput: unknown,
  runInput: unknown,
): ClinicalEvidenceEvalReport {
  const benchmark = clinicalEvidenceBenchmarkSchema.parse(benchmarkInput);
  const run = clinicalEvidenceRunSchema.parse(runInput);
  const caseIds = benchmark.cases.map((item) => item.id);
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error("Benchmark case IDs must be unique");
  }
  const runIds = run.cases.map((item) => item.caseId);
  if (new Set(runIds).size !== runIds.length) {
    throw new Error("Run case IDs must be unique");
  }
  if (runIds.some((id) => !caseIds.includes(id))) {
    throw new Error("Run contains a case ID absent from the benchmark");
  }

  const runById = new Map(run.cases.map((item) => [item.caseId, item]));
  const evaluated = benchmark.cases.flatMap((gold) => {
    const result = runById.get(gold.id);
    return result && gold.adjudication.status === "adjudicated"
      ? [{ gold, result }]
      : [];
  });

  let correctDisposition = 0;
  let unanswerable = 0;
  let correctlyAbstained = 0;
  let answerable = 0;
  let answerableAbstentions = 0;
  let relevantRetrieved = 0;
  let relevantTotal = 0;
  let citationCount = 0;
  let validCitationCount = 0;
  let supportedCitationCount = 0;
  let unsupportedCitationCount = 0;
  let unresolvedCitationCount = 0;

  for (const { gold, result } of evaluated) {
    if (gold.expectedDisposition === result.disposition) correctDisposition++;
    if (gold.expectedDisposition === "abstain") {
      unanswerable++;
      if (result.disposition === "abstain") correctlyAbstained++;
    } else {
      answerable++;
      if (result.disposition === "abstain") answerableAbstentions++;
    }

    const relevant = new Set(gold.relevantEvidenceIds);
    const retrieved = new Set(result.retrievedEvidenceIds);
    relevantTotal += relevant.size;
    relevantRetrieved += [...relevant].filter((id) => retrieved.has(id)).length;

    const retrievedIds = new Set(result.retrievedEvidenceIds);
    for (const citation of result.citations) {
      citationCount++;
      if (!retrievedIds.has(citation.evidenceId)) unresolvedCitationCount++;
      else validCitationCount++;
      if (citation.judgment === "supports") supportedCitationCount++;
      else if (citation.judgment === "does_not_support") {
        unsupportedCitationCount++;
      } else if (citation.judgment === "not_assessed") {
        unresolvedCitationCount++;
      }
    }
  }

  const adjudicatedIds = new Set(evaluated.map(({ gold }) => gold.id));
  const tags = unique(benchmark.cases.flatMap((item) => item.tags));
  const sliceMetrics = tags.map((tag) => {
    const slice = evaluated.filter(({ gold }) => gold.tags.includes(tag));
    const suppressed = slice.length < benchmark.minimumSliceN;
    const cited = slice.flatMap(({ result }) => result.citations);
    const supported = cited.filter((item) => item.judgment === "supports").length;
    return {
      tag,
      n: suppressed ? null : slice.length,
      dispositionAccuracy: suppressed
        ? null
        : ratio(
          slice.filter(({ gold, result }) =>
            gold.expectedDisposition === result.disposition
          ).length,
          slice.length,
        ),
      citationSupportRate: suppressed ? null : ratio(supported, cited.length),
      suppressed,
    };
  });

  const reviewCoverage = ratio(adjudicatedIds.size, benchmark.cases.length) ?? 0;
  const interpretation = [
    "Descriptive benchmark results only; this report does not establish clinical validity, safety, efficacy, fairness, or fitness for patient care.",
    "Only adjudicated benchmark cases contribute to performance metrics; pending cases remain in the review-coverage denominator.",
    "Small subgroup slices are suppressed below the predeclared minimum and are not evidence of subgroup equivalence.",
  ];
  if (benchmark.status !== "reviewed") {
    interpretation.push(
      "The benchmark is marked development; do not describe these metrics as researcher-reviewed.",
    );
  }
  if (reviewCoverage < 1) {
    interpretation.push(
      "Review is incomplete; report coverage and pending cases alongside every metric.",
    );
  }

  return {
    schemaVersion: "1.0.0",
    benchmarkId: benchmark.benchmarkId,
    benchmarkVersion: benchmark.benchmarkVersion,
    runId: run.runId,
    runManifestHash: sha256Json(run),
    caseCount: benchmark.cases.length,
    adjudicatedCaseCount: evaluated.length,
    dispositionAccuracy: ratio(correctDisposition, evaluated.length),
    unanswerableAbstentionRecall: ratio(correctlyAbstained, unanswerable),
    answerableAbstentionRate: ratio(answerableAbstentions, answerable),
    retrievalRecallAtK: ratio(relevantRetrieved, relevantTotal),
    citationValidityRate: ratio(validCitationCount, citationCount),
    citationSupportRate: ratio(supportedCitationCount, citationCount),
    unsupportedCitationCount,
    unresolvedCitationCount,
    reviewCoverage,
    sliceMetrics,
    interpretation,
    clinicalValidationAuthorized: false,
  };
}
