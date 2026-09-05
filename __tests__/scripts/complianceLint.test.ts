import { describe, expect, it } from "vitest";
import {
  applyComplianceExemptions,
  collectComplianceViolations,
  loadComplianceExemptions,
  validateComplianceExemptions,
} from "../../scripts/compliance-lint";

describe("compliance lint exemptions", () => {
  it("loads written exemptions for the known false positives", () => {
    const exemptions = loadComplianceExemptions();
    expect(exemptions.length).toBeGreaterThanOrEqual(2);
    expect(exemptions.every((entry) => entry.reason.trim().length > 0)).toBe(
      true,
    );
  });

  it("clears the known MNPI and PII false positives", () => {
    const raw = collectComplianceViolations();
    const exemptions = loadComplianceExemptions();
    expect(validateComplianceExemptions(exemptions, raw)).toEqual([]);
    const remaining = applyComplianceExemptions(raw, exemptions);
    expect(
      remaining.some((row) =>
        row.file.includes("rhCapitalPortfolio.ts") && row.rule === "R3: No MNPI"
      ),
    ).toBe(false);
    expect(
      remaining.some((row) =>
        row.file.includes("specialFunctions.ts") && row.rule === "R5: No PII"
      ),
    ).toBe(false);
  });

  it("rejects a stale exemption line", () => {
    const raw = collectComplianceViolations();
    const errors = validateComplianceExemptions([
      {
        file: "src/lib/stats/specialFunctions.ts",
        line: 999,
        rule: "R5: No PII",
        reason: "stale",
        addedAt: "2026-09-05",
      },
    ], raw);
    expect(errors.join(" ")).toMatch(/Stale/);
  });
});
