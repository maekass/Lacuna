import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reimbursementEvidencePrototype } from "@/data/reimbursement-evidence-prototype";
import { isDecisionGradeReimbursementPremium } from "@/data/valuation-premium-calculator";
import {
  REIMBURSEMENT_SCHEMA_VERSION,
  validateEvidenceLedger,
} from "@/lib/reimbursement/evidence";
import {
  calculatePhysicianFeeSchedulePayment,
  comparePaymentScenarios,
} from "@/lib/reimbursement/payment";

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
    expect(reimbursementEvidencePrototype.claims[0]?.status).toBe(
      "machine_proposed",
    );
    expect(reimbursementEvidencePrototype.claims[0]?.sourceIds).toEqual([]);
    expect(reimbursementEvidencePrototype.codeRates).toEqual([]);
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
});
