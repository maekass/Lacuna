import { describe, expect, it } from "vitest";
import { evaluateClinicalEvidenceRun } from "@/lib/ai/evals/clinicalEvidenceEval";

const benchmark = {
  schemaVersion: "1.0.0",
  benchmarkId: "reviewer-pilot",
  benchmarkVersion: "0.1.0",
  intendedUse: "Offline answer and citation QA only",
  status: "development",
  minimumSliceN: 2,
  cases: [
    {
      id: "answerable-1",
      question: "What does source A report?",
      expectedDisposition: "answer",
      relevantEvidenceIds: ["source-a"],
      tags: ["trial"],
      limitationTags: ["single-site"],
      independentReviews: [
        {
          reviewerAlias: "reviewer-1",
          reviewerRole: "researcher",
          expectedDisposition: "answer",
          relevantEvidenceIds: ["source-a"],
          reviewedAt: "2026-09-30",
          rationale: "The frozen source directly reports this finding.",
        },
        {
          reviewerAlias: "reviewer-1b",
          reviewerRole: "clinician",
          expectedDisposition: "answer",
          relevantEvidenceIds: ["source-a"],
          reviewedAt: "2026-09-30",
          rationale: "The frozen source directly reports this finding.",
        },
      ],
      adjudication: {
        status: "adjudicated",
        reviewerAliases: ["reviewer-1", "reviewer-1b"],
        reviewerRoles: ["researcher", "clinician"],
        adjudicatedAt: "2026-10-01",
        rationale: "Reviewers agreed on answerability and relevant evidence.",
      },
    },
    {
      id: "unanswerable-1",
      question: "Does source B establish long-term benefit?",
      expectedDisposition: "abstain",
      relevantEvidenceIds: ["source-b"],
      tags: ["trial"],
      limitationTags: ["short-follow-up"],
      independentReviews: [
        {
          reviewerAlias: "reviewer-2",
          reviewerRole: "clinician",
          expectedDisposition: "abstain",
          relevantEvidenceIds: ["source-b"],
          reviewedAt: "2026-09-30",
          rationale: "The frozen source has no long-term outcome evidence.",
        },
        {
          reviewerAlias: "reviewer-2b",
          reviewerRole: "methodologist",
          expectedDisposition: "abstain",
          relevantEvidenceIds: ["source-b"],
          reviewedAt: "2026-09-30",
          rationale: "The frozen source has no long-term outcome evidence.",
        },
      ],
      adjudication: {
        status: "adjudicated",
        reviewerAliases: ["reviewer-2", "reviewer-2b"],
        reviewerRoles: ["clinician", "methodologist"],
        adjudicatedAt: "2026-10-01",
        rationale: "Reviewers agreed that the available source cannot support the claim.",
      },
    },
  ],
};

const run = {
  schemaVersion: "1.0.0",
  runId: "run-001",
  createdAt: "2026-10-02T12:00:00.000Z",
  gitCommit: "abc123",
  modelProvider: "offline-fixture",
  modelId: "fixture-model",
  modelVersion: "1",
  promptVersion: "1",
  retrieverVersion: "fixture-retriever-1",
  retrievalConfigHash: "sha256:config",
  sourceSnapshotHash: "sha256:sources",
  reviewerProtocolVersion: "1",
  retrievalTopK: 5,
  cases: [
    {
      caseId: "answerable-1",
      disposition: "answer",
      answer: "Source A reports the stated finding.",
      retrievedEvidenceIds: ["source-a"],
      citations: [
        {
          claimId: "claim-1",
          evidenceId: "source-a",
          judgment: "supports",
          reviewerAliases: ["reviewer-a", "reviewer-b"],
          reviewerRoles: ["clinician", "researcher"],
        },
        {
          claimId: "claim-2",
          evidenceId: "not-retrieved",
          judgment: "does_not_support",
          reviewerAliases: ["reviewer-a", "reviewer-b"],
          reviewerRoles: ["clinician", "researcher"],
        },
      ],
    },
    {
      caseId: "unanswerable-1",
      disposition: "abstain",
      answer: "The evidence does not answer this question.",
      retrievedEvidenceIds: ["source-b"],
      citations: [],
    },
  ],
};

describe("evaluateClinicalEvidenceRun", () => {
  it("reports disposition, retrieval, citation, review, and slice metrics", () => {
    const report = evaluateClinicalEvidenceRun(benchmark, run);
    expect(report.dispositionAccuracy).toBe(1);
    expect(report.unanswerableAbstentionRecall).toBe(1);
    expect(report.retrievalRecallAtK).toBe(1);\n    expect(report.retrievalPrecisionAtK).toBe(1);
    expect(report.citationValidityRate).toBe(0.5);
    expect(report.citationSupportRate).toBe(0.5);
    expect(report.citationReviewCoverage).toBe(1);
    expect(report.unsupportedCitationCount).toBe(1);
    expect(report.unresolvedCitationCount).toBe(1);
    expect(report.reviewCoverage).toBe(1);
    expect(report.sliceMetrics[0].suppressed).toBe(false);
    expect(report.clinicalValidationAuthorized).toBe(false);
    expect(report.runManifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("excludes pending benchmark cases and discloses incomplete review", () => {
    const pendingBenchmark = {
      ...benchmark,
      cases: benchmark.cases.map((item, index) => index === 1
        ? {
          ...item,
          adjudication: {
            status: "pending",
            reviewerAliases: [],
            reviewerRoles: [],
          },
        }
        : item),
    };
    const report = evaluateClinicalEvidenceRun(pendingBenchmark, run);
    expect(report.adjudicatedCaseCount).toBe(1);
    expect(report.reviewCoverage).toBe(0.5);
    expect(report.interpretation.some((item) => item.includes("incomplete"))).toBe(
      true,
    );
  });

  it("fails closed when a run references an unknown case", () => {
    expect(() =>
      evaluateClinicalEvidenceRun(benchmark, {
        ...run,
        cases: [...run.cases, { ...run.cases[0], caseId: "unknown" }],
      })
    ).toThrow("case ID absent from the benchmark");
  });
});
