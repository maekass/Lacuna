import { describe, expect, it } from "vitest";
import {
  type EvidenceLedger,
  evidenceLedgerSchema,
  REIMBURSEMENT_SCHEMA_VERSION,
  type ReimbursementClaim,
  reimbursementClaimSchema,
  type ReimbursementSource,
} from "@/lib/reimbursement/schema";
import {
  canTransitionEvidenceStatus,
  transitionClaim,
  validateReviewChain,
} from "@/lib/reimbursement/workflow";
import {
  isClaimPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";

const now = "2026-09-17T05:30:00.000Z";

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
    expect(result.reasons.join(" ")).toMatch(/Machine actors|not permitted/i);
  });

  it("allows a source reviewer to verify machine-proposed evidence", () => {
    const result = canTransitionEvidenceStatus(
      "machine_proposed",
      "source_verified",
      "source_reviewer",
    );

    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("does not allow source-verified evidence to jump directly to approved", () => {
    const result = canTransitionEvidenceStatus(
      "source_verified",
      "approved",
      "policy_reviewer",
    );

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(
      "Transition source_verified -> approved is not allowed.",
    );
  });

  it("records human review metadata during a valid transition", () => {
    const sourceVerified: ReimbursementClaim = {
      ...baseClaim,
      status: "source_verified",
    };

    const result = transitionClaim({
      claim: sourceVerified,
      to: "specialist_reviewed",
      actor: "coding_reimbursement_specialist",
      reviewId: "review:1",
      reviewedAt: now,
      note: "Code and payment-unit interpretation reviewed.",
    });

    expect(result.claim.status).toBe("specialist_reviewed");
    expect(result.review).toMatchObject({
      claimId: sourceVerified.id,
      reviewerRole: "coding_reimbursement_specialist",
      fromStatus: "source_verified",
      toStatus: "specialist_reviewed",
      decision: "approve",
    });
  });
});

describe("reimbursement evidence schema", () => {
  it("requires explicit assumptions for modeled exposure", () => {
    const parsed = reimbursementClaimSchema.safeParse({
      ...baseClaim,
      kind: "modeled_estimate",
      economicUnit: "modeled_exposure",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a versioned, source-linked ledger", () => {
    expect(evidenceLedgerSchema.safeParse(approvedLedger()).success).toBe(true);
  });
});

describe("ledger validation and publication gates", () => {
  it("accepts an approved claim with source, specialist review, and policy approval", () => {
    const ledger = approvedLedger();
    const result = validateEvidenceLedger(ledger);

    expect(result.ok).toBe(true);
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(true);
  });

  it("rejects claims that reference a missing source", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = {
      ...ledger.claims[0],
      sourceIds: ["source:missing"],
    };

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unknown_source")).toBe(
      true,
    );
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
  });

  it("does not allow discovery-only evidence to satisfy the approval gate", () => {
    const ledger = approvedLedger();
    ledger.sources[0] = {
      ...ledger.sources[0],
      sourceType: "discovery_only",
    };

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "approval_gate" &&
          issue.message.includes("non-discovery source"),
      ),
    ).toBe(true);
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
  });

  it("rejects duplicate ids inside a ledger collection", () => {
    const ledger = approvedLedger();
    ledger.claims = [ledger.claims[0], { ...ledger.claims[0] }];

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_id")).toBe(
      true,
    );
  });

  it("requires a specialist review before approved evidence can validate", () => {
    const ledger = approvedLedger();
    ledger.reviews = ledger.reviews.filter(
      (review) => review.reviewerRole !== "coding_reimbursement_specialist",
    );

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "missing_specialist_review"),
    ).toBe(true);
  });

  it("rejects disconnected reviews that do not form a legal workflow", () => {
    const ledger = approvedLedger();
    ledger.reviews = [
      {
        id: "review:illegal-specialist",
        claimId: baseClaim.id,
        reviewerRole: "coding_reimbursement_specialist",
        fromStatus: "rejected",
        toStatus: "specialist_reviewed",
        decision: "approve",
        reviewedAt: now,
      },
      {
        id: "review:illegal-policy",
        claimId: baseClaim.id,
        reviewerRole: "policy_reviewer",
        fromStatus: "machine_proposed",
        toStatus: "approved",
        decision: "approve",
        reviewedAt: "2026-09-17T05:31:00.000Z",
      },
    ];

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "illegal_review_transition"),
    ).toBe(true);
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
  });

  it("requires an explicit approved-to-published hop before publication", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = {
      ...ledger.claims[0],
      status: "published",
    };

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) =>
        issue.code === "review_chain_status_mismatch" ||
        issue.code === "missing_publish_transition"
      ),
    ).toBe(true);
    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
  });

  it("rejects source-verified claims that have no attached sources", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = {
      ...ledger.claims[0],
      status: "source_verified",
      sourceIds: [],
    };
    ledger.reviews = [];

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "missing_source")).toBe(
      true,
    );
  });

  it("does not let a source reviewer verify a claim with empty sourceIds", () => {
    expect(() =>
      transitionClaim({
        claim: { ...baseClaim, sourceIds: [] },
        to: "source_verified",
        actor: "source_reviewer",
        reviewId: "review:empty-source",
        reviewedAt: now,
      })
    ).toThrow(/at least one attached source/);
  });

  it("rejects source verification against unknown source ids when a map is supplied", () => {
    expect(() =>
      transitionClaim({
        claim: { ...baseClaim, sourceIds: ["source:missing"] },
        to: "source_verified",
        actor: "source_reviewer",
        reviewId: "review:unknown-source",
        reviewedAt: now,
        sourcesById: new Map([[primarySource.id, primarySource]]),
      })
    ).toThrow(/unknown source IDs/);
  });

  it("accepts the contiguous source-verified to approved review chain", () => {
    const ledger = approvedLedger();
    expect(validateReviewChain(ledger.claims[0], ledger.reviews)).toEqual([]);
  });

  it("does not publish a fee-schedule claim that has no reproducible rate", () => {
    const ledger = approvedLedger();
    ledger.claims[0] = {
      ...ledger.claims[0],
      kind: "calculation",
      economicUnit: "fee_schedule_payment",
      payer: "Medicare PFS",
      dataYear: 2026,
      placeOfService: "non_facility",
      codeSystem: "HCPCS",
      codes: ["SA051"],
    };

    expect(isClaimPublishable(ledger.claims[0], ledger)).toBe(false);
    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "no_applicable_rate"))
      .toBe(true);
  });

  it("rejects a closed lineage hop that does not point at a claim", () => {
    const ledger = approvedLedger();
    ledger.lineageHops = [
      {
        id: "hop:orphan",
        issueId: "issue:test",
        sequence: 1,
        kind: "source",
        question: "Which source controls this claim?",
        status: "closed",
      },
    ];

    const result = validateEvidenceLedger(ledger);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "closed_hop_missing_claim"),
    ).toBe(true);
  });
});
