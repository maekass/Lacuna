import {
  type EvidenceLedger,
  type LineageHopKind,
  SA051_LINEAGE_ORDER,
} from "./schema";

export interface LineageShapeIssue {
  code: string;
  message: string;
}

/**
 * Confirm an issue uses the SA051 investigation chain:
 * source → PE input → affected services → PE RVU → payment mechanics →
 * utilization question. Does not assert economics.
 */
export function validateSa051LineageShape(
  ledger: EvidenceLedger,
  issueId: string,
): LineageShapeIssue[] {
  const hops = ledger.lineageHops
    .filter((hop) => hop.issueId === issueId)
    .sort((a, b) => a.sequence - b.sequence);
  const issues: LineageShapeIssue[] = [];

  if (hops.length !== SA051_LINEAGE_ORDER.length) {
    issues.push({
      code: "lineage_length",
      message:
        `SA051 lineage requires ${SA051_LINEAGE_ORDER.length} hops, found ${hops.length}.`,
    });
    return issues;
  }

  for (const [index, expected] of SA051_LINEAGE_ORDER.entries()) {
    const hop = hops[index];
    if (hop.kind !== expected) {
      issues.push({
        code: "lineage_kind",
        message: `Hop ${index + 1} must be ${expected}, found ${hop
          .kind as LineageHopKind}.`,
      });
    }
    if (hop.sequence !== index + 1) {
      issues.push({
        code: "lineage_sequence",
        message: `Hop ${expected} must have sequence ${index + 1}.`,
      });
    }
  }

  return issues;
}

/**
 * True when a ledger asserts no payment, RVU, or modeled-exposure numbers.
 * Phase 1 seeds must stay investigation-only until sources are attached.
 */
export function ledgerAssertsUnsupportedEconomics(
  ledger: EvidenceLedger,
): boolean {
  if (ledger.codeRates.length > 0) return true;
  return ledger.claims.some((claim) =>
    claim.economicUnit !== undefined ||
    claim.kind === "calculation" ||
    claim.kind === "modeled_estimate"
  );
}
