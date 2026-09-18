import type { EvidenceLedger, LineageHopKind } from "./schema";

/**
 * First investigation target (SA051 / pelvic-exam supply-pack):
 * source → PE input → affected services → PE RVU → payment mechanics →
 * utilization question.
 *
 * This order is an issue-specific investigation shape, not a required core
 * enum for every ledger.
 */
export const SA051_LINEAGE_ORDER = [
  "source",
  "pe_input",
  "affected_services",
  "pe_rvu",
  "payment_mechanics",
  "utilization",
] as const satisfies readonly LineageHopKind[];

export interface LineageShapeIssue {
  code: string;
  message: string;
}

/**
 * Confirm an issue uses the SA051 investigation chain. Does not assert
 * economics or treat missing hops as zeroed inputs.
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
        message: `Hop ${index + 1} must be ${expected}, found ${hop.kind}.`,
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
 * True when the ledger asserts payment, RVU, or modeled-exposure numbers.
 * Phase 1 seeds must stay investigation-only until sources are attached.
 */
export function ledgerHasEconomicAssertions(
  ledger: EvidenceLedger,
): boolean {
  if (ledger.codeRates.length > 0) return true;
  return ledger.claims.some((claim) =>
    claim.economicUnit !== undefined ||
    claim.kind === "calculation" ||
    claim.kind === "modeled_estimate"
  );
}
