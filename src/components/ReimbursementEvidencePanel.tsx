"use client";

import Metric from "@/components/Metric";
import Card from "@/components/ui/Card";
import { reimbursementEvidenceSa051 } from "@/data/reimbursement-evidence-sa051";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";
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

const LEDGER_COUNT_MODEL: ModelProvenance = {
  module: "src/data/reimbursement-evidence-sa051.ts",
  exportName: "reimbursementEvidenceSa051",
  definition:
    "Count of attached sources or rate rows on the SA051 investigation ledger. Zero means none attached yet — not a measured payment or RVU.",
};

/**
 * Investigation-only SA051 lineage. No rates, premiums, or modeled exposure.
 */
export default function ReimbursementEvidencePanel() {
  const validation = validateEvidenceLedger(reimbursementEvidenceSa051);
  const ledger = validation.ledger ?? reimbursementEvidenceSa051;
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
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">Sources</dt>
          <dd className="font-medium text-lacuna-plum">
            <Metric
              label="Attached sources"
              className="font-medium text-lacuna-plum"
              provenance={{
                kind: "assumption",
                value: ledger.sources.length,
                model: LEDGER_COUNT_MODEL,
                caveat:
                  "Investigation catalog count. Zero attached sources is not a $0 payment.",
              }}
            />
          </dd>
        </div>
        <div className="rounded-lg border border-lacuna-lavender/40 p-3">
          <dt className="text-xs uppercase text-lacuna-blue/70">Rate rows</dt>
          <dd className="font-medium text-lacuna-plum">
            <Metric
              label="Attached rate rows"
              className="font-medium text-lacuna-plum"
              provenance={{
                kind: "assumption",
                value: ledger.codeRates.length,
                model: LEDGER_COUNT_MODEL,
                caveat:
                  "Investigation catalog count. Zero rate rows means none attached, not a zero RVU.",
              }}
            />
          </dd>
        </div>
      </dl>

      <ol className="mt-6 list-decimal space-y-3 pl-5">
        {hops.map((hop) => (
          <li
            key={hop.id}
            className="rounded-lg border border-lacuna-lavender/40 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-plum/80">
              {HOP_LABELS[hop.kind]} · {hop.status}
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
