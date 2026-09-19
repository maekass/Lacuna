import { NextResponse } from "next/server";
import { reimbursementEvidencePrototype } from "@/data/reimbursement-evidence-prototype";
import {
  ledgerHasEconomicAssertions,
  validateSa051LineageShape,
} from "@/lib/reimbursement/lineage";
import {
  isLedgerPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";

/**
 * Read-only Phase 1 evidence ledger. Does not accept writes; AI cannot
 * approve or publish through this route.
 */
export function GET() {
  try {
    const validation = validateEvidenceLedger(reimbursementEvidencePrototype);
    const ledger = validation.ledger ?? reimbursementEvidencePrototype;
    return NextResponse.json(
      {
        schemaVersion: ledger.schemaVersion,
        publishable: validation.ok && isLedgerPublishable(ledger),
        hasEconomicAssertions: ledgerHasEconomicAssertions(ledger),
        lineageIssues: validateSa051LineageShape(
          ledger,
          "issue:sa051-lineage",
        ),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
