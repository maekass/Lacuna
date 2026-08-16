import { describe, expect, it } from "vitest";
import {
  computeGapMetrics,
  computeWHOCEA,
  type FundingStage,
  valuateInvestment,
  type ValuationInputs,
} from "@/lib/valuation/burdenCapitalGap";

const inputs = (
  overrides: Partial<ValuationInputs> = {},
): ValuationInputs => ({
  areaKey: "endometriosis",
  stage: "Series A",
  totalFundingRaisedM: 15,
  clinicalEvidence: "pilot",
  hasReimbursement: false,
  hasEquityAngle: false,
  isPlatform: false,
  ...overrides,
});

describe("valuateInvestment", () => {
  const metrics = computeGapMetrics();

  it("does not substitute editorial Rock Health / PitchBook stage medians", () => {
    expect(valuateInvestment(inputs(), metrics)).toBeNull();
  });

  it("uses the verified-dataset stage median as the only dollar figure", () => {
    const result = valuateInvestment(inputs(), metrics, { "Series A": 72 });
    expect(result).not.toBeNull();
    expect(result!.stageComparableM).toBe(72);
    expect(result!.lowM).toBe(72);
    expect(result!.midM).toBe(72);
    expect(result!.highM).toBe(72);
    expect(result!.gapMultiplier).toBe(1);
    expect(result!.whocea.category).toBe("Insufficient data");
  });

  it("does not invent WHO-CHOICE dollars from stage-penetration priors", () => {
    const who = computeWHOCEA(15, "Series A" as FundingStage, false, {
      ...metrics[0].area,
    });
    expect(who.illustrativeCostPerDALY).toBeNull();
    expect(who.category).toBe("Insufficient data");
  });
});
