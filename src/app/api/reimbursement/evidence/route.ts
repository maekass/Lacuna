import { NextResponse } from "next/server";
import { reimbursementEvidenceSa051 } from "@/data/reimbursement-evidence-sa051";
import {
  isLedgerPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";
import {
  ledgerAssertsUnsupportedEconomics,
  validateSa051LineageShape,
} from "@/lib/reimbursement/lineage";

/**
 * Read-only Phase 1 evidence ledger. Does not accept writes; AI cannot
 * approve or publish through this route.
 */
export function GET() {
  const validation = validateEvidenceLedger(reimbursementEvidenceSa051);
  const ledger = validation.ledger ?? reimbursementEvidenceSa051;
  return NextResponse.json(
    {
      schemaVersion: ledger.schemaVersion,
      publishable: validation.ok && isLedgerPublishable(ledger),
      assertsUnsupportedEconomics: ledgerAssertsUnsupportedEconomics(ledger),
      lineageIssues: validateSa051LineageShape(ledger, "issue:sa051-lineage"),
      validation: {
        ok: validation.ok,
        issues: validation.issues,
      },
      disclaimer:
        "Investigation target only. Not decision-grade reimbursement evidence. Missing data is not zero.",
      ledger,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
