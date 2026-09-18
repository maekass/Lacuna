import {
  type EvidenceLedger,
  REIMBURSEMENT_SCHEMA_VERSION,
} from "@/lib/reimbursement/schema";

/**
 * Product-development fixture only.
 *
 * This is intentionally an investigation target, not a validated reimbursement
 * conclusion. It contains no 51& data, no client-specific taxonomy, and no
 * publishable claim. Replace or enrich it only through the evidence workflow.
 */
export const reimbursementEvidencePrototype: EvidenceLedger = {
  schemaVersion: REIMBURSEMENT_SCHEMA_VERSION,
  issues: [
    {
      id: "issue:sa051-lineage",
      title: "SA051 pelvic-exam supply-pack lineage",
      question:
        "How does a change in a practice-expense supply input propagate through affected services, relative value units, and fee-schedule payment?",
      status: "machine_proposed",
      priority: "high",
      claimIds: ["claim:sa051-lineage-question"],
      nextAction:
        "Attach the controlling CMS source and verify the input, affected services, valuation mechanics, and rule-cycle context.",
      createdAt: "2026-09-17T05:30:00.000Z",
      updatedAt: "2026-09-17T05:30:00.000Z",
    },
  ],
  claims: [
    {
      id: "claim:sa051-lineage-question",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: trace the source-to-input-to-service-to-payment lineage before making an external economic claim.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      assumptions: [],
      createdAt: "2026-09-17T05:30:00.000Z",
      updatedAt: "2026-09-17T05:30:00.000Z",
    },
  ],
  sources: [],
  codeRates: [],
  reviews: [],
};
