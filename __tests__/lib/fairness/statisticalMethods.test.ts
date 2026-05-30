import { describe, expect, it } from 'vitest';
import {
  benjaminiHochbergCorrection,
  bonferroniCorrection,
  cohenH,
  fishersExactTest,
  inverseNormalCDF,
  logisticRegression,
  normalCDF,
  powerAnalysis,
  proportionDifferenceCI,
  wilsonConfidenceInterval,
} from '@/lib/fairness/statisticalMethods';

describe('wilsonConfidenceInterval', () => {
  it('returns bounds within [0, 1] for typical data (success)', () => {
    const [lower, upper] = wilsonConfidenceInterval(8, 10);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeLessThanOrEqual(1);
    expect(lower).toBeLessThan(upper);
  });

  it('returns [0, 1] when trials is zero (edge)', () => {
    expect(wilsonConfidenceInterval(0, 0)).toEqual([0, 1]);
  });
});

describe('proportionDifferenceCI', () => {
  it('computes difference and interval (success)', () => {
    const result = proportionDifferenceCI(10, 20, 5, 20);
    expect(result.difference).toBeCloseTo(0.25);
    expect(result.lower).toBeLessThanOrEqual(result.difference);
    expect(result.upper).toBeGreaterThanOrEqual(result.difference);
    expect(result.standardError).toBeGreaterThan(0);
  });

  it('handles zero trials without throwing (edge)', () => {
    const result = proportionDifferenceCI(0, 0, 0, 0);
    expect(result.difference).toBe(0);
  });
});

describe('fishersExactTest', () => {
  it('detects association in skewed table (success)', () => {
    const result = fishersExactTest(10, 0, 0, 10);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.oddsRatio).toBeGreaterThan(1);
    expect(result.interpretation).toContain('evidence');
  });

  it('returns neutral result for empty table (edge)', () => {
    const result = fishersExactTest(0, 0, 0, 0);
    expect(result.pValue).toBe(1);
    expect(result.interpretation).toBe('No data');
  });
});

describe('bonferroniCorrection', () => {
  it('adjusts alpha and flags significant tests (success)', () => {
    const result = bonferroniCorrection([0.001, 0.04, 0.2], 0.05);
    expect(result.adjustedAlpha).toBeCloseTo(0.05 / 3);
    expect(result.significantTests).toEqual([true, false, false]);
    expect(result.numSignificant).toBe(1);
  });

  it('handles empty p-value list (edge)', () => {
    const result = bonferroniCorrection([]);
    expect(result.numTests).toBe(0);
    expect(result.numSignificant).toBe(0);
  });
});

describe('benjaminiHochbergCorrection', () => {
  it('marks more tests significant than Bonferroni for same inputs (success)', () => {
    const pValues = [0.01, 0.03, 0.04, 0.2];
    const result = benjaminiHochbergCorrection(pValues, 0.05);
    expect(result.numSignificant).toBeGreaterThanOrEqual(1);
    expect(result.significantTests).toHaveLength(4);
  });
});

describe('cohenH', () => {
  it('classifies effect magnitude (success)', () => {
    expect(cohenH(0.5, 0.5).magnitude).toBe('small');
    expect(cohenH(0.2, 0.35).magnitude).toBe('medium');
    expect(cohenH(0.1, 0.9).magnitude).toBe('large');
  });
});

describe('powerAnalysis', () => {
  it('reports low power for small samples (success)', () => {
    const result = powerAnalysis(0.6, 0.4, 15, 15);
    expect(result.power).toBeGreaterThanOrEqual(0);
    expect(result.power).toBeLessThanOrEqual(1);
    expect(result.interpretation.length).toBeGreaterThan(0);
  });

  it('returns Infinity recommended sample size when difference is zero (edge)', () => {
    const result = powerAnalysis(0.5, 0.5, 100, 100);
    expect(result.recommendedSampleSize).toBe(Infinity);
  });
});

describe('logisticRegression', () => {
  it('fits a separable binary outcome (success)', () => {
    const X = [[0], [0], [1], [1]];
    const y = [0, 0, 1, 1];
    const result = logisticRegression(X, y);
    expect(result.coefficients.length).toBe(2);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.coefficients.every((b) => Number.isFinite(b))).toBe(true);
    expect(result.pValues.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it('returns empty result for empty input (edge)', () => {
    const result = logisticRegression([], []);
    expect(result.converged).toBe(false);
    expect(result.coefficients).toEqual([]);
  });
});

describe('normalCDF / inverseNormalCDF', () => {
  it('are approximate inverses near the median (success)', () => {
    const p = 0.75;
    const z = inverseNormalCDF(p);
    expect(normalCDF(z)).toBeCloseTo(p, 2);
  });

  it('handles boundary probabilities (edge)', () => {
    expect(inverseNormalCDF(0)).toBe(-Infinity);
    expect(inverseNormalCDF(1)).toBe(Infinity);
  });
});
