import { describe, expect, it } from "vitest";
import {
  buildObservedFeatures,
  observedCentroid,
  pairwiseCosine,
} from "@/lib/similarity/observedFeatureSimilarity";

const sectors = ["Fertility", "Diagnostics"];

function company(
  overrides: Partial<Parameters<typeof buildObservedFeatures>[0]> = {},
) {
  return {
    sector: "Fertility",
    stage: "Private (Series B)",
    foundedPrecision: "year" as const,
    founded: 2016,
    lastKnownValuation: 100,
    totalFunding: 40,
    ...overrides,
  };
}

describe("observed feature similarity", () => {
  it("does not treat a missing valuation as a shared zero", () => {
    const disclosed = buildObservedFeatures(
      company(),
      sectors,
      2026,
    );
    const missing = buildObservedFeatures(
      company({ lastKnownValuation: undefined }),
      sectors,
      2026,
    );
    const alsoMissing = buildObservedFeatures(
      company({
        sector: "Diagnostics",
        lastKnownValuation: undefined,
      }),
      sectors,
      2026,
    );
    const valuationIndex = sectors.length;
    expect(missing[valuationIndex]?.observed).toBe(false);
    expect(pairwiseCosine(disclosed, missing)).not.toBe(
      pairwiseCosine(
        disclosed,
        missing.map((feature, index) =>
          index === valuationIndex ? { value: 0, observed: true } : feature
        ),
      ),
    );
    expect(pairwiseCosine(missing, alsoMissing)).not.toBeNull();
  });

  it("returns null when no observed dimensions overlap in magnitude", () => {
    const empty = [{ value: 0, observed: false }];
    expect(pairwiseCosine(empty, empty)).toBeNull();
  });

  it("keeps an unobserved centroid dimension unobserved", () => {
    const left = buildObservedFeatures(
      company({ totalFunding: undefined }),
      sectors,
      2026,
    );
    const right = buildObservedFeatures(
      company({ totalFunding: undefined, sector: "Diagnostics" }),
      sectors,
      2026,
    );
    const centroid = observedCentroid([left, right]);
    expect(centroid[sectors.length + 1]?.observed).toBe(false);
  });

  it("ignores estimated founding years instead of treating them as a known age", () => {
    const features = buildObservedFeatures(
      company({ foundedPrecision: "estimated", founded: 2010 }),
      sectors,
      2026,
    );
    expect(features[sectors.length + 2]?.observed).toBe(false);
  });
});
