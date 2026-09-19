import {
  type EvidenceLedger,
  REIMBURSEMENT_SCHEMA_VERSION,
} from "@/lib/reimbursement/schema";

const NOW = "2026-09-17T05:30:00.000Z";

/**
 * Product-development fixture only.
 *
 * SA051 / pelvic-exam supply-pack lineage is an investigation target, not a
 * validated reimbursement conclusion. It contains no rates, utilization, or
 * dollar claims. Enrich only through the evidence workflow after a vintage-
 * specific public CMS file is source-verified.
 */
export const reimbursementEvidencePrototype: EvidenceLedger = {
  schemaVersion: REIMBURSEMENT_SCHEMA_VERSION,
  issues: [
    {
      id: "issue:sa051-lineage",
      title: "SA051 pelvic-exam supply-pack lineage",
      question:
        "How would a change in a practice-expense supply input propagate through affected services, PE RVU, fee-schedule payment, and utilization — if those inputs are later source-verified?",
      status: "machine_proposed",
      priority: "high",
      claimIds: [
        "claim:sa051-source",
        "claim:sa051-pe-input",
        "claim:sa051-affected-services",
        "claim:sa051-pe-rvu",
        "claim:sa051-payment-mechanics",
        "claim:sa051-utilization",
      ],
      nextAction:
        "Attach a vintage-specific public CMS PE / HCPCS file and walk each lineage hop before any economic claim.",
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  claims: [
    {
      id: "claim:sa051-source",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: identify the controlling public CMS source (HCPCS Level II file and/or PE input file) for code number SA051 in an explicit data year.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "claim:sa051-pe-input",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: confirm whether SA051 functions as a practice-expense supply input rather than a separately billed professional service, using only a source-verified public file.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "claim:sa051-affected-services",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: list physician services that include SA051 in PE inputs for a stated vintage. No service list is asserted until that vintage file is attached.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "claim:sa051-pe-rvu",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: describe how a change in the SA051 supply input would flow into practice-expense RVU for affected services. No RVU magnitude is asserted.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "claim:sa051-payment-mechanics",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: keep PE RVU distinct from geographically adjusted RVU and fee-schedule payment. Payment requires explicit GPCI, conversion factor, locality, and setting — missing inputs are not zero.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "claim:sa051-utilization",
      issueId: "issue:sa051-lineage",
      statement:
        "Investigation target: practice-level exposure requires explicit utilization and payment assumptions. This seed does not estimate visits, allowed amounts, or losses.",
      kind: "interpretation",
      status: "machine_proposed",
      sourceIds: [],
      codeSystem: "HCPCS",
      codes: ["SA051"],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  sources: [],
  codeRates: [],
  reviews: [],
  lineageHops: [
    {
      id: "hop:sa051-source",
      issueId: "issue:sa051-lineage",
      sequence: 1,
      kind: "source",
      question: "Which public CMS file and vintage control SA051 metadata?",
      status: "open",
      claimId: "claim:sa051-source",
    },
    {
      id: "hop:sa051-pe-input",
      issueId: "issue:sa051-lineage",
      sequence: 2,
      kind: "pe_input",
      question: "Is SA051 a practice-expense supply input for that vintage?",
      status: "open",
      claimId: "claim:sa051-pe-input",
    },
    {
      id: "hop:sa051-affected-services",
      issueId: "issue:sa051-lineage",
      sequence: 3,
      kind: "affected_services",
      question:
        "Which services include SA051 in PE inputs, if any, for that vintage?",
      status: "open",
      claimId: "claim:sa051-affected-services",
    },
    {
      id: "hop:sa051-pe-rvu",
      issueId: "issue:sa051-lineage",
      sequence: 4,
      kind: "pe_rvu",
      question: "How would a verified SA051 input change flow into PE RVU?",
      status: "open",
      claimId: "claim:sa051-pe-rvu",
    },
    {
      id: "hop:sa051-payment-mechanics",
      issueId: "issue:sa051-lineage",
      sequence: 5,
      kind: "payment_mechanics",
      question:
        "Which explicit PFS inputs convert PE RVU into a fee-schedule payment?",
      status: "open",
      claimId: "claim:sa051-payment-mechanics",
    },
    {
      id: "hop:sa051-utilization",
      issueId: "issue:sa051-lineage",
      sequence: 6,
      kind: "utilization",
      question:
        "What utilization and payment assumptions would be required before modeling practice-level exposure?",
      status: "open",
      claimId: "claim:sa051-utilization",
    },
  ],
};
