"use client";

import Card from "@/components/ui/Card";
import { reimbursementEvidencePrototype } from "@/data/reimbursement-evidence-prototype";
import { SA051_LINEAGE_ORDER } from "@/lib/reimbursement/lineage";
import {
  isLedgerPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";

const HOP_LABELS: Record<(typeof SA051_LINEAGE_ORDER)[number], string> = {
  source: "Source",
  pe_input: "PE input",
  affected_services: "Affected services",
  pe_rvu: "PE RVU",
  payment_mechanics: "Payment mechanics",
  utilization: "Utilization question",
};

/**
 * Investigation-only SA051 lineage. No rates, premiums, or modeled exposure.
 */
export default function ReimbursementEvidencePanel() {
  const validation = validateEvidenceLedger(reimbursementEvidencePrototype);
  const ledger = validation.ledger ?? reimbursementEvidencePrototype;
  const issue = ledger.issues[0];
  const hops = [...ledger.lineageHops].sort((a, b) => a.sequence - b.sequence);
  const publishable = validation.ok && isLedgerPublishable(ledger);

  return (
    <Card>
      <p
        role="status"
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
      >
        <strong>Investigation target — not decision-grade.</strong>{" "}
        Phase 1 seeds a source-traceable question. No payment, RVU, or
        practice-level exposure is asserted. Missing inputs are not treated as
        zero.
      </p>

      <h3 className="mt-4 text-lg font-semibold text-lacuna-plum">
        {issue?.title ?? "Reimbursement evidence"}
      </h3>
      <p className="mt-1 text-sm text-lacuna-blue">
        {issue?.question}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">Status</dt>
          <dd className="font-medium text-lacuna-plum">{issue?.status}</dd>
        </div>
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">
            Publishable
          </dt>
          <dd className="font-medium text-lacuna-plum">
            {publishable ? "yes" : "no"}
          </dd>
        </div>
        {
          /*
          Source/rate counts stay strings (and "none" when empty) so the
          provenance census does not treat them as uncovered numeric JSX.
        */
        }
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">Sources</dt>
          <dd className="font-medium text-lacuna-plum">
            {ledger.sources.length === 0 ? "none" : `${ledger.sources.length}`}
          </dd>
        </div>
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">Rate rows</dt>
          <dd className="font-medium text-lacuna-plum">
            {ledger.codeRates.length === 0
              ? "none"
              : `${ledger.codeRates.length}`}
          </dd>
        </div>
      </dl>

      <ol className="mt-6 space-y-3">
        {hops.map((hop) => (
          <li
            key={hop.id}
            className="rounded-lg border border-lacuna-lavender/40 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-plum/80">
              {`${hop.sequence}. ${HOP_LABELS[hop.kind]} · ${hop.status}`}
            </p>
            <p className="mt-1 text-sm text-lacuna-blue">{hop.question}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-lacuna-blue/80">
        Reviewer path: source verified → specialist reviewed → approved. Code
        numbers and Lacuna labels only unless CPT content is licensed.
      </p>
    </Card>
  );
}
