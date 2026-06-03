import { describe, expect, it } from 'vitest';
import {
  bayesianEstimate,
  crossFittingAnalysis,
  exampleFemTechAnalysis,
  smallSampleCausalAnalysis,
} from '@/lib/causal/bayesianCausal';

describe('bayesianEstimate', () => {
  it('shrinks MLE toward prior mean (success)', () => {
    const result = bayesianEstimate(0.5, 0.04, {
      nObservations: 22,
      nTreatments: 1,
      priorMean: 0,
      priorVariance: 0.5,
      noiseVariance: 0.04,
    });
    expect(result.posteriorMean).toBeGreaterThan(0);
    expect(result.posteriorMean).toBeLessThan(0.5);
    expect(result.credibleInterval[0]).toBeLessThan(result.credibleInterval[1]);
    expect(result.priorInfluence).toBeGreaterThan(0);
  });

  it('yields wide credible interval with high MLE variance (edge)', () => {
    const result = bayesianEstimate(0.1, 4, {
      nObservations: 5,
      nTreatments: 1,
      priorMean: 0,
      priorVariance: 1,
      noiseVariance: 4,
    });
    const width = result.credibleInterval[1] - result.credibleInterval[0];
    expect(width).toBeGreaterThan(1);
  });
});

describe('crossFittingAnalysis', () => {
  it('splits data when n >= 20 (success)', () => {
    const result = crossFittingAnalysis(24, Array.from({ length: 24 }, (_, i) => i));
    expect(result.selectionSet.length).toBe(12);
    expect(result.inferenceSet.length).toBe(12);
    expect(result.isReliable).toBe(true);
  });

  it('warns when sample too small for cross-fitting (edge)', () => {
    const result = crossFittingAnalysis(10, Array.from({ length: 10 }, (_, i) => i));
    expect(result.isReliable).toBe(false);
    expect(result.warning).toContain('insufficient');
  });
});

describe('smallSampleCausalAnalysis', () => {
  it('returns main effects and pre-registered results (success)', () => {
    const analysis = smallSampleCausalAnalysis(0.2, 0.1, 22);
    expect(analysis.mainEffects.posteriorMean).toBeDefined();
    expect(analysis.preRegisteredResults.length).toBeGreaterThan(0);
    expect(analysis.limitations.some((l) => l.includes('n=22'))).toBe(true);
    expect(analysis.transparencyStatement).toContain('SMALL SAMPLE');
  });

  it('marks hypotheses insufficient when n < 10 (edge)', () => {
    const analysis = smallSampleCausalAnalysis(0.1, 0.2, 8);
    expect(
      analysis.preRegisteredResults.some((r) => r.status === 'insufficient_data'),
    ).toBe(true);
  });
});

describe('exampleFemTechAnalysis', () => {
  it('uses verified-scale sample size n=22 (success)', () => {
    const analysis = exampleFemTechAnalysis();
    expect(analysis.limitations[0]).toContain('n=22');
    expect(analysis.recommendations.length).toBeGreaterThan(3);
  });
});
