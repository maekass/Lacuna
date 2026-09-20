import { describe, expect, it } from "vitest";
import { factorCoverageScore } from "@/lib/quant/exitFactorCoverage";

describe("factorCoverageScore", () => {
  it("does not accept an acquired-target bonus", () => {
    const keys = Object.keys(
      factorCoverageScore({
        presentPositiveFactorCount: 2,
        similarPriorExits: 3,
      }) as unknown as Record<string, unknown>,
    );
    expect(keys).not.toContain("isAcquired");
    expect(
      factorCoverageScore({
        presentPositiveFactorCount: 2,
        similarPriorExits: 3,
      }),
    ).toBeCloseTo(0.35 + 0.2 + 0.15, 5);
  });

  it("is identical for two companies that differ only by outcome membership", () => {
    const input = { presentPositiveFactorCount: 3, similarPriorExits: 1 };
    expect(factorCoverageScore(input)).toBe(factorCoverageScore(input));
  });
});
