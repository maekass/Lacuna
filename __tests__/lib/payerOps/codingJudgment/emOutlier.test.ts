import { describe, expect, it } from "vitest";
import {
  aggregateProviderCounts,
  analyzeTargetShareOutliers,
  benjaminiHochberg,
  betaBinomialUpperTail,
  betaQuantile,
  binomialUpperTail,
  fitBetaBinomial,
  logGamma,
  pseudonymize,
  quantile,
  regularizedIncompleteBeta,
  shareBandLow,
  volumeBand,
} from "@/lib/payerOps/codingJudgment/emOutlier";

describe("special functions", () => {
  it("logGamma matches known values", () => {
    expect(logGamma(1)).toBeCloseTo(0, 10);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
  });

  it("regularized incomplete beta matches closed forms", () => {
    // I_x(1, b) = 1 - (1 - x)^b ; I_x(a, 1) = x^a
    expect(regularizedIncompleteBeta(0.3, 1, 4)).toBeCloseTo(1 - 0.7 ** 4, 10);
    expect(regularizedIncompleteBeta(0.3, 3, 1)).toBeCloseTo(0.3 ** 3, 10);
    expect(regularizedIncompleteBeta(0.5, 2.5, 2.5)).toBeCloseTo(0.5, 10);
  });

  it("betaQuantile inverts the incomplete beta", () => {
    const q = betaQuantile(0.95, 0.117, 2.115);
    expect(regularizedIncompleteBeta(q, 0.117, 2.115)).toBeCloseTo(0.95, 6);
  });

  it("binomial and beta-binomial upper tails", () => {
    // P(X >= 8 | n = 10, p = 0.5) = 56 / 1024
    expect(binomialUpperTail(8, 10, 0.5)).toBeCloseTo(56 / 1024, 10);
    expect(binomialUpperTail(0, 10, 0.2)).toBeCloseTo(1, 10);
    // Beta(1,1) prior makes every k in 0..n equally likely.
    expect(betaBinomialUpperTail(8, 10, 1, 1)).toBeCloseTo(3 / 11, 10);
  });
});

describe("benjaminiHochberg", () => {
  it("returns monotone adjusted q-values in the original order", () => {
    const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.5]);
    expect(q[0]).toBeCloseTo(0.04, 10);
    expect(q[1]).toBeCloseTo(0.04 * 4 / 3, 10);
    expect(q[2]).toBeCloseTo(0.04 * 4 / 3, 10);
    expect(q[3]).toBeCloseTo(0.5, 10);
  });
});

describe("aggregation and fitting", () => {
  const rows = [
    { npi: "A", hcpcs: "99213", placeOfService: "O", services: 60 },
    { npi: "A", hcpcs: "99213", placeOfService: "F", services: 40 },
    { npi: "A", hcpcs: "99215", placeOfService: "O", services: 20 },
    { npi: "A", hcpcs: "36415", placeOfService: "O", services: 999 },
  ];

  it("sums across places of service and ignores codes outside the family", () => {
    const [a] = aggregateProviderCounts(rows);
    expect(a).toEqual({
      npi: "A",
      familyServices: 120,
      targetServices: 20,
      codesPresent: ["99213", "99215"],
    });
  });

  it("accepts a different code family", () => {
    const [a] = aggregateProviderCounts(rows, {
      codes: ["99213", "36415"],
      targetCode: "36415",
    });
    expect(a.familyServices).toBe(1099);
    expect(a.targetServices).toBe(999);
  });

  it("method-of-moments fit recovers the pooled share", () => {
    const providers = [10, 20, 30, 40].map((k, i) => ({
      npi: String(i),
      familyServices: 200,
      targetServices: k,
      codesPresent: [],
    }));
    const fit = fitBetaBinomial(providers);
    expect(fit.pooledShare).toBeCloseTo(100 / 800, 10);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(fit.pooledShare, 6);
    expect(fit.rho).toBeGreaterThan(0);
  });
});

describe("analyzeTargetShareOutliers", () => {
  const providers = [
    ...Array.from({ length: 40 }, (_, i) => ({
      npi: `p${i}`,
      familyServices: 300,
      targetServices: 10 + (i % 7),
      codesPresent: ["99213", "99214", "99215"],
    })),
    {
      npi: "high",
      familyServices: 400,
      targetServices: 240,
      codesPresent: ["99213", "99214", "99215"],
    },
    {
      npi: "tiny",
      familyServices: 40,
      targetServices: 30,
      codesPresent: ["99213", "99214", "99215"],
    },
    {
      npi: "gap",
      familyServices: 300,
      targetServices: 30,
      codesPresent: ["99213", "99215"],
    },
  ];
  const result = analyzeTargetShareOutliers(providers, {
    minimumVolume: 100,
    requiredCodes: ["99213", "99214"],
    reviewPercentile: 0.95,
    posteriorThreshold: 0.9,
    fdrLevel: 0.05,
  });

  it("applies the volume and visibility rules before peer fitting", () => {
    expect(result.belowThreshold.map((p) => p.npi)).toEqual(["tiny"]);
    expect(result.incompleteDenominator.map((p) => p.npi)).toEqual(["gap"]);
    expect(result.eligible).toHaveLength(41);
  });

  it("flags the clear high-share provider and not typical peers", () => {
    const flagged = result.eligible.filter((p) => p.outlierForReview);
    expect(flagged.map((p) => p.npi)).toEqual(["high"]);
    expect(result.estimatedFalseReviewFraction).not.toBeNull();
  });
});

describe("privacy helpers", () => {
  it("pseudonymize is salted and refuses short salts", () => {
    const salt = "x".repeat(64);
    const a = pseudonymize("1234567890", salt);
    expect(a).toMatch(/^[a-f0-9]{12}$/);
    expect(pseudonymize("1234567890", "y".repeat(64))).not.toBe(a);
    expect(() => pseudonymize("1234567890", "short")).toThrow();
  });

  it("coarsens share and volume", () => {
    expect(shareBandLow(0.537)).toBeCloseTo(0.5, 10);
    expect(shareBandLow(1)).toBeCloseTo(0.9, 10);
    expect(volumeBand(99)).toBe("<100");
    expect(volumeBand(300)).toBe("250-499");
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
  });
});
