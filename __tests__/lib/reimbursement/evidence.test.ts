import { describe, expect, it } from "vitest";
import {
  type EvidenceLedger,
  REIMBURSEMENT_SCHEMA_VERSION,
  type ReimbursementClaim,
  type ReimbursementSource,
} from "@/lib/reimbursement/schema";
import {
  canTransitionEvidenceStatus,
  transitionClaim,
} from "@/lib/reimbursement/workflow";
import {
  isClaimPublishable,
  isLedgerPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";

const now = "2026-09-18T00:00:00.000Z";

const primarySource: ReimbursementSource = {
  id: "source:cms:test",
  title: "CMS source document",
  publisher: "Centers for Medicare & Medicaid Services",
  url: "https://www.cms.gov/example",
  accessedAt: now,
  sourceType: "primary",
  storagePolicy: "link_only",
  redistribution: "public",
};

const baseClaim: ReimbursementClaim = {
  id: "claim:test",
  issueId: "issue:test",
  statement: "A source-verifiable reimbursement claim.",
  kind: "fact",
  status: "machine_proposed",
  sourceIds: [primarySource.id],
  createdAt: now,
  updatedAt: now,
};

function approvedLedger(): EvidenceLedger {
  return {
    schemaVersion: REIMBURSEMENT_SCHEMA_VERSION,
    issues: [
      {
        id: "issue:test",
        title: "Test issue",
        question: "What does the primary source establish?",
        status: "approved",
        priority: "high",
        claimIds: [baseClaim.id],
        createdAt: now,
        updatedAt: now,
      },
    ],
    claims: [
      {
        ...baseClaim,
        status: "approved",
      },
    ],
    sources: [primarySource],
    codeRates: [],
    reviews: [
      {
        id: "review:specialist",
        claimId: baseClaim.id,
        reviewerRole: "coding_reimbursement_specialist",
        fromStatus: "source_verified",
        toStatus: "specialist_reviewed",
        decision: "approve",
        reviewedAt: now,
      },
      {
        id: "review:policy",
        claimId: baseClaim.id,
        reviewerRole: "policy_reviewer",
        fromStatus: "specialist_reviewed",
        toStatus: "approved",
        decision: "approve",
        reviewedAt: now,
      },
    ],
    lineageHops: [],
  };
}

describe("reimbursement evidence workflow", () => {
  it("prevents a machine actor from source-verifying its own proposal", () => {
    const result = canTransitionEvidenceStatus(
      "machine_proposed",
      "source_verified",
      "machine",
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/Machine actors/i);
  });

  it("requires source_verified before specialist_reviewed", () => {
    const skip = canTransitionEvidenceStatus(
      "machine_proposed",
      "specialist_reviewed",
      "coding_reimbursement_specialist",
    );
    expect(skip.ok).toBe(false);

    const source = canTransitionEvidenceStatus(
      "machine_proposed",
      "source_verified",
      "source_reviewer",
    );
    expect(source.ok).toBe(true);

    const specialist = canTransitionEvidenceStatus(
      "source_verified",
      "specialist_reviewed",
      "coding_reimbursement_specialist",
    );
    expect(specialist.ok).toBe(true);

    const approved = canTransitionEvidenceStatus(
      "specialist_reviewed",
      "approved",
      "policy_reviewer",
    );
    expect(approved.ok).toBe(true);
  });

  it("records a specialist review when transitioning", () => {
    const verified: ReimbursementClaim = {
      ...baseClaim,
      status: "source_verified",
    };
    const result = transitionClaim({
      claim: verified,
      to: "specialist_reviewed",
      actor: "coding_reimbursement_specialist",
      reviewId: "review:specialist",
      reviewedAt: now,
      note: "Source locator checked.",
    });
    expect(result.claim.status).toBe("specialist_reviewed");
    expect(result.review?.reviewerRole).toBe(
      "coding_reimbursement_specialist",
    );
    expect(result.review?.decision).toBe("approve");
  });

  it("does not treat a machine_proposed claim as publishable", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = { ...baseClaim };
    ledger.issues[0] = { ...ledger.issues[0], status: "machine_proposed" };
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
    expect(isLedgerPublishable(ledger)).toBe(false);
  });

  it("requires specialist and policy reviews before publish", () => {
    const ledger = approvedLedger();
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(true);
    expect(isLedgerPublishable(ledger)).toBe(true);

    const noPolicy = {
      ...ledger,
      reviews: ledger.reviews.filter((review) =>
        review.reviewerRole !== "policy_reviewer"
      ),
    };
    expect(isClaimPublishable(noPolicy.claims[0], noPolicy)).toBe(false);
  });

  it("rejects an approved claim that has no authoritative source", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = { ...ledger.claims[0], sourceIds: [] };
    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "approval_gate"))
      .toBe(true);
  });

  it("flags duplicate ids across mixed ledger collections", () => {
    const ledger = approvedLedger();
    ledger.claims.push({ ...baseClaim, id: ledger.issues[0].id });
    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_id"))
      .toBe(false);
    const sameCollection = approvedLedger();
    sameCollection.claims.push({ ...baseClaim });
    const dup = validateEvidenceLedger(sameCollection);
    expect(dup.issues.some((issue) => issue.code === "duplicate_id")).toBe(
      true,
    );
  });
});
