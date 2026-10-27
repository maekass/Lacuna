import {
  type ClinicalEvidenceRun,
  clinicalEvidenceRunSchema,
} from "@/lib/ai/evals/clinicalEvidenceEval";
import type { EvidenceAskResponse } from "./contracts";

export interface EvidenceEvalCaseExport {
  caseId: string;
  response: EvidenceAskResponse;
}

/**
 * Maps endpoint responses into the existing clinical-evidence run contract.
 *
 * Citation judgment stays `not_assessed` until two human reviewers record a
 * judgment. This exporter does not change evaluator scoring.
 */
export function exportClinicalEvidenceRun(input: {
  runId: string;
  createdAt: string;
  gitCommit: string;
  modelProvider: string;
  modelId: string;
  modelVersion: string;
  reviewerProtocolVersion: string;
  retrievalTopK: number;
  cases: readonly EvidenceEvalCaseExport[];
}): ClinicalEvidenceRun {
  const first = input.cases[0]?.response;
  if (!first) {
    throw new Error("An evidence run export requires at least one case");
  }
  const configs = new Set(
    input.cases.map((item) => item.response.retrievalConfigHash),
  );
  if (configs.size !== 1) {
    throw new Error(
      "An evidence run export requires one retrieval configuration",
    );
  }
  if (
    input.cases.some((item) =>
      item.response.retrievedPassageIds.length > input.retrievalTopK
    )
  ) {
    throw new Error("Retrieved more passages than retrievalTopK");
  }
  return clinicalEvidenceRunSchema.parse({
    schemaVersion: "1.0.0",
    runId: input.runId,
    createdAt: input.createdAt,
    gitCommit: input.gitCommit,
    modelProvider: input.modelProvider,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    promptVersion: first.promptVersion,
    retrieverVersion: first.retrieverVersion,
    retrievalConfigHash: first.retrievalConfigHash,
    sourceSnapshotHash: first.sourceSnapshotHash,
    reviewerProtocolVersion: input.reviewerProtocolVersion,
    retrievalTopK: input.retrievalTopK,
    cases: input.cases.map((item) => ({
      caseId: item.caseId,
      disposition: item.response.disposition,
      answer: item.response.answer,
      retrievedEvidenceIds: item.response.retrievedPassageIds,
      citations: item.response.claims.flatMap((claim) =>
        claim.passageIds.map((evidenceId) => ({
          claimId: claim.id,
          evidenceId,
          judgment: "not_assessed" as const,
          reviewerAliases: [],
          reviewerRoles: [],
        }))
      ),
    })),
  });
}
