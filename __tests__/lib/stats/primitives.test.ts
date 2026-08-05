import { describe, expect, it } from "vitest";
import {
  erf,
  logGamma,
  normalCdf,
  normalQuantile,
} from "@/lib/stats/primitives";

describe("shared statistical primitives", () => {
  it("matches scipy reference values", () => {
    // scipy.special.ndtr(1.96) and scipy.special.ndtri(0.975).
    expect(normalCdf(1.96)).toBeCloseTo(0.9750021049, 6);
    expect(normalQuantile(0.975)).toBeCloseTo(1.9599639845, 6);
    // scipy.special.erf(1).
    expect(erf(1)).toBeCloseTo(0.8427007929, 6);
    // scipy.special.gammaln(6) = log(5!).
    expect(logGamma(6)).toBeCloseTo(4.7874917428, 6);
  });

  it("keeps CDF and probit monotone", () => {
    expect(normalCdf(-2)).toBeLessThan(normalCdf(0));
    expect(normalCdf(0)).toBeLessThan(normalCdf(2));
    expect(normalQuantile(0.25)).toBeLessThan(normalQuantile(0.75));
  });
});
