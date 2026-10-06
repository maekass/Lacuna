import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReviewActor } from "@/lib/infra/reviewSession";
import { analyzeClaimIntegrity } from "@/lib/oncology/claimIntegrity/analysis";
import { resetClaimMemoryStore } from "@/lib/oncology/claimIntegrity/memoryStore";
import {
  approveClaim,
  attachClaimEvidence,
  createOncologyClaim,
  submitClaim,
} from "@/lib/oncology/claimIntegrity/service";
import { ClaimReviewError } from "@/lib/oncology/claimIntegrity/reviewPolicy";
import type { ClaimEvidence } from "@/lib/oncology/claimIntegrity/types";

const author: ReviewActor = {
  id: "analyst:one",
  method: "github",
  label: "Analyst",
};
const reviewer: ReviewActor = {
  id: "reviewer:two",
  method: "github",
  label: "Reviewer",
};

const baseClaim = {
  exactClaim: "The study reported a response in the enrolled population.",
  claimSourceUrl: "https://example.com/source",
  claimSourceType: "press_release",
  claimDate: "2024-01-15",
  evidenceCutoffDate: "2024-06-01",
  companyId: "test-only-co",
  assetId: "test-only-asset",
  indication: "test-only",
  biomarker: "test-only",
};

function evidence(
  partial: Partial<ClaimEvidence> & Pick<ClaimEvidence, "id" | "relationship">,
): ClaimEvidence {
  return {
    claimId: "c1",
    sourceType: "peer_reviewed_publication",
    title: "Source",
    url: "https://example.com/paper",
    accessedAt: "2024-06-01T00:00:00.000Z",
    analystSummary: "Summary",
    primarySource: true,
    availableByClaimDate: true,
    publicationDate: "2023-12-01",
    createdBy: "analyst:one",
    createdAt: "2024-06-01T00:00:00.000Z",
    ...partial,
  };
}

describe("claim integrity analysis", () => {
  it("labels evidence after the cutoff as subsequent and finds public evidence insufficient", () => {
    const analysis = analyzeClaimIntegrity(
      { id: "c1", exactClaim: baseClaim.exactClaim },
      [
        evidence({
          id: "e-late",
          relationship: "subsequent_evidence",
          publicationDate: "2025-01-01",
          availableByClaimDate: false,
        }),
      ],
    );
    expect(analysis.suggestedClassification).toBe(
      "insufficient_public_evidence",
    );
    expect(analysis.subsequentEvidenceIds).toEqual(["e-late"]);
    expect(analysis.requiresHumanReview).toBe(true);
  });

  it("flags comparative wording without head-to-head evidence", () => {
    const analysis = analyzeClaimIntegrity(
      { id: "c1", exactClaim: "The asset is best in class." },
      [evidence({
        id: "e1",
        relationship: "supports",
        analystSummary: "A single-arm study.",
      })],
    );
    expect(analysis.suggestedClassification).toBe(
      "cross_trial_comparison_limitation",
    );
  });

  it("flags a primary-endpoint contradiction", () => {
    const analysis = analyzeClaimIntegrity(
      { id: "c1", exactClaim: "The trial met its primary endpoint." },
      [
        evidence({
          id: "e1",
          relationship: "contradicts",
          analystSummary: "The primary endpoint was not met.",
        }),
      ],
    );
    expect(analysis.suggestedClassification).toBe(
      "inconsistent_with_source_evidence",
    );
  });

  it("flags post hoc wording presented as a primary result", () => {
    const analysis = analyzeClaimIntegrity(
      {
        id: "c1",
        exactClaim: "The exploratory subgroup met the primary endpoint.",
      },
      [evidence({ id: "e1", relationship: "supports" })],
    );
    expect(analysis.suggestedClassification).toBe(
      "post_hoc_or_subgroup_dependence",
    );
  });

  it("flags regulatory wording without a regulatory source", () => {
    const analysis = analyzeClaimIntegrity(
      { id: "c1", exactClaim: "The asset is FDA-approved for this use." },
      [evidence({
        id: "e1",
        relationship: "supports",
        sourceType: "press_release",
      })],
    );
    expect(analysis.suggestedClassification).toBe(
      "regulatory_characterization_unclear",
    );
  });

  it("flags partial support for a compound claim", () => {
    const analysis = analyzeClaimIntegrity(
      {
        id: "c1",
        exactClaim: "The asset improved survival and reduced hospitalizations.",
      },
      [
        evidence({
          id: "e1",
          relationship: "supports",
          analystSummary: "The paper reports improved survival.",
        }),
      ],
    );
    expect(analysis.suggestedClassification).toBe("partially_substantiated");
  });

  it("does not treat missing primary support as substantiated", () => {
    const analysis = analyzeClaimIntegrity(
      { id: "c1", exactClaim: baseClaim.exactClaim },
      [evidence({ id: "e1", relationship: "supports", primarySource: false })],
    );
    expect(analysis.suggestedClassification).toBe(
      "insufficient_public_evidence",
    );
    expect(analysis.missingEvidence.join(" ")).toMatch(/primary source/i);
  });
});

describe("claim review workflow", () => {
  beforeEach(() => {
    resetClaimMemoryStore();
  });

  it("records an audit event and blocks approval by the creator and without evidence", () => {
    const created = createOncologyClaim(author, baseClaim);
    expect(created.audit[0]?.action).toBe("created");
    const submitted = submitClaim(author, created.claim.id);
    expect(submitted.claim.reviewStatus).toBe("pending_review");
    expect(() =>
      approveClaim(reviewer, created.claim.id, {
        classification: "insufficient_public_evidence",
        rationale: "Checked the public record.",
      })
    ).toThrow(ClaimReviewError);
    expect(() =>
      approveClaim(author, created.claim.id, {
        classification: "substantiated",
        rationale: "Self approval.",
      })
    ).toThrow(/cannot approve/);
  });

  it("lets a different reviewer approve after primary evidence is attached", () => {
    const created = createOncologyClaim(author, baseClaim);
    attachClaimEvidence(author, created.claim.id, {
      relationship: "supports",
      sourceType: "peer_reviewed_publication",
      title: "Test-only paper",
      url: "https://example.com/paper",
      publicationDate: "2023-12-01",
      analystSummary: "The enrolled population had a reported response.",
      primarySource: true,
    });
    submitClaim(author, created.claim.id);
    const approved = approveClaim(reviewer, created.claim.id, {
      classification: "substantiated",
      rationale: "Primary source matches the recorded wording.",
      confidence: "moderate",
    });
    expect(approved.claim.reviewStatus).toBe("approved");
    expect(approved.claim.classification).toBe("substantiated");
    expect(approved.audit.some((event) => event.action === "approved")).toBe(
      true,
    );
  });
});

describe("claim integrity isolation", () => {
  it("does not use prohibited motive language outside the required disclosure", () => {
    const root = path.resolve(__dirname, "../../../src/lib/oncology");
    const files = walk(root);
    const banned = [
      /\bscam\b/i,
      /\blie\b/i,
      /deception score/i,
      /bad actor/i,
      /investor manipulation/i,
      /fraud probability/i,
    ];
    const violations: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const pattern of banned) {
        if (pattern.test(text)) violations.push(`${file} ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not import deal-scoring surfaces", () => {
    const roots = [
      path.resolve(__dirname, "../../../src/lib/oncology"),
      path.resolve(__dirname, "../../../src/components/oncology"),
      path.resolve(__dirname, "../../../src/app/api/research/oncology"),
    ];
    const banned = [
      "ExitPredictor",
      "QuantValuationPanel",
      "predictionEngines",
    ];
    const violations: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const text = readFileSync(file, "utf8");
        for (const token of banned) {
          if (text.includes(token)) violations.push(`${file} ${token}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps scoring modules free of claim-integrity imports", () => {
    const files = [
      "src/components/ExitPredictor.tsx",
      "src/components/QuantValuationPanel.tsx",
      "src/lib/quant/predictionEngines.ts",
    ];
    const root = path.resolve(__dirname, "../../..");
    for (const file of files) {
      const text = readFileSync(path.join(root, file), "utf8");
      expect(text.includes("claimIntegrity")).toBe(false);
      expect(text.includes("oncology_claims")).toBe(false);
    }
  });
});

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}
