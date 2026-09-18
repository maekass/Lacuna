import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/reimbursement/evidence/route";
import { reimbursementEvidencePrototype } from "@/data/reimbursement-evidence-prototype";
import { isDecisionGradeReimbursementPremium } from "@/data/valuation-premium-calculator";
import {
  REIMBURSEMENT_SCHEMA_VERSION,
  validateEvidenceLedger,
} from "@/lib/reimbursement/evidence";
import { validateIngestedObservationBatch } from "@/lib/reimbursement/ingestion";
import {
  ledgerHasEconomicAssertions,
  SA051_LINEAGE_ORDER,
  validateSa051LineageShape,
} from "@/lib/reimbursement/lineage";
import {
  calculatePhysicianFeeSchedulePayment,
  comparePaymentScenarios,
} from "@/lib/reimbursement/payment";
import { isLedgerPublishable } from "@/lib/reimbursement/validation";

const baseline = {
  code: "99213",
  dataYear: 2024,
  locality: "00",
  placeOfService: "nonfacility" as const,
  workRvu: 1.3,
  practiceExpenseRvu: 1.2,
  malpracticeRvu: 0.1,
  workGpci: 1,
  practiceExpenseGpci: 1,
  malpracticeGpci: 1,
  conversionFactor: 32.74,
};

describe("SA051 prototype ledger", () => {
  it("validates as an investigation target without asserting economics", () => {
    const result = validateEvidenceLedger(reimbursementEvidencePrototype);

    expect(result.ok).toBe(true);
    expect(reimbursementEvidencePrototype.schemaVersion).toBe(
      REIMBURSEMENT_SCHEMA_VERSION,
    );
    expect(reimbursementEvidencePrototype.issues[0]?.id).toBe(
      "issue:sa051-lineage",
    );
    expect(
      reimbursementEvidencePrototype.claims.every((claim) =>
        claim.status === "machine_proposed" && claim.sourceIds.length === 0
      ),
    ).toBe(true);
    expect(reimbursementEvidencePrototype.codeRates).toEqual([]);
    expect(isLedgerPublishable(reimbursementEvidencePrototype)).toBe(false);
    expect(ledgerHasEconomicAssertions(reimbursementEvidencePrototype)).toBe(
      false,
    );
    expect(
      validateSa051LineageShape(
        reimbursementEvidencePrototype,
        "issue:sa051-lineage",
      ),
    ).toEqual([]);
    expect(
      [...reimbursementEvidencePrototype.lineageHops]
        .sort((a, b) => a.sequence - b.sequence)
        .map((hop) => hop.kind),
    ).toEqual([...SA051_LINEAGE_ORDER]);
  });
});

describe("physician fee schedule payment primitive", () => {
  it("applies the geographically adjusted RVU formula without inventing inputs", () => {
    const result = calculatePhysicianFeeSchedulePayment(baseline);

    expect(result.geographicallyAdjustedRvu).toBeCloseTo(2.6, 10);
    expect(result.paymentUnrounded).toBeCloseTo(85.124, 10);
    expect(result.paymentRounded).toBe(85.12);
  });

  it("does not invent a percent change when the baseline payment is zero", () => {
    const delta = comparePaymentScenarios(
      { ...baseline, workRvu: 0, practiceExpenseRvu: 0, malpracticeRvu: 0 },
      baseline,
    );

    expect(delta.percentDelta).toBeNull();
    expect(delta.absoluteDelta).toBeCloseTo(85.124, 10);
  });
});

describe("evidence engine isolation", () => {
  it("does not import illustrative valuation-premium or CPT matcher modules", () => {
    const dir = path.join(process.cwd(), "src/lib/reimbursement");
    const files = readdirSync(dir).filter((file) => file.endsWith(".ts"));
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(path.join(dir, file), "utf8");
      if (
        content.includes("valuation-premium-calculator") ||
        content.includes("cpt-code-matcher")
      ) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
    expect(isDecisionGradeReimbursementPremium(1.8)).toBe(false);
  });

  it("keeps Intelligence on the investigation panel, not the heuristic dashboard", () => {
    const page = readFileSync(
      path.join(process.cwd(), "src/app/sections/IntelligencePage.tsx"),
      "utf8",
    );
    expect(page).toMatch(/ReimbursementEvidencePanel/);
    expect(page).not.toMatch(/ReimbursementIntelligenceDashboard/);
    expect(page).not.toMatch(/valuation-premium-calculator/);
  });
});

describe("read-only evidence API", () => {
  it("returns the unpublished SA051 seed", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json() as {
      publishable: boolean;
      hasEconomicAssertions: boolean;
      validation: { ok: boolean };
      ledger: { issues: Array<{ id: string }> };
    };
    expect(body.validation.ok).toBe(true);
    expect(body.publishable).toBe(false);
    expect(body.hasEconomicAssertions).toBe(false);
    expect(body.ledger.issues[0]?.id).toBe("issue:sa051-lineage");
  });
});

describe("Python ingestion sidecar", () => {
  it("emits a catalog-only batch the TypeScript contract accepts", () => {
    const raw = execFileSync(
      "python3",
      [
        path.resolve(
          process.cwd(),
          "scripts/reimbursement/ingestion_contract.py",
        ),
        "--emit-example",
      ],
      { encoding: "utf8" },
    );
    const batch = JSON.parse(raw) as unknown;
    const result = validateIngestedObservationBatch(batch);
    expect(result.ok).toBe(true);
    expect(result.observations).toEqual([]);
  });
});
