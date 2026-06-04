import { describe, expect, it } from 'vitest';
import {
  BLACK_WOMEN_PRIORITY_DISEASES,
  calculateHealthEquityScore,
  getEnsemblePredictor,
  type TrialFeatures,
} from '@/lib/ml/_quarantine/ensemblePredictor';

const baseFeatures: TrialFeatures = {
  diseaseArea: 'Endometriosis',
  phase: 2,
  enrollment: 300,
  sponsorType: 'biotech',
  mechanism: 'Monoclonal Antibody',
  duration: 24,
  historicalTransitionRate: 0.45,
  priorApprovals: 1,
};

describe('getEnsemblePredictor', () => {
  it('initializes singleton and predicts probability (success)', async () => {
    const predictor = await getEnsemblePredictor();
    const result = predictor.predict(baseFeatures);

    expect(result.successProbability).toBeGreaterThan(0);
    expect(result.successProbability).toBeLessThan(1);
    expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.successProbability);
    expect(result.confidenceInterval[1]).toBeGreaterThanOrEqual(result.successProbability);
    expect(result.modelContributions.neuralNetwork).toBeDefined();
  });

  it('handles unknown mechanism via fallback code (edge)', async () => {
    const predictor = await getEnsemblePredictor();
    const result = predictor.predict({ ...baseFeatures, mechanism: 'Unknown Mechanism XYZ' });
    expect(result.successProbability).toBeGreaterThan(0);
    expect(result.featureImportance.phase).toBeGreaterThan(0);
  });
});

describe('calculateHealthEquityScore', () => {
  it('boosts score for priority maternal health disease (success)', async () => {
    const predictor = await getEnsemblePredictor();
    const base = predictor.predict({ ...baseFeatures, diseaseArea: 'General Oncology' });
    const equity = calculateHealthEquityScore(
      predictor.predict({ ...baseFeatures, diseaseArea: 'Maternal Health outcomes' }),
      'Maternal Health',
    );

    expect(equity.diseaseBurden).toBeGreaterThan(5);
    expect(equity.healthEquityScore).toBeGreaterThan(base.successProbability * 60);
    expect(equity.investmentGap).toBeGreaterThan(0);
  });

  it('returns neutral defaults for non-priority disease (edge)', async () => {
    const predictor = await getEnsemblePredictor();
    const result = calculateHealthEquityScore(
      predictor.predict(baseFeatures),
      'Unrelated Condition',
    );
    expect(result.diseaseBurden).toBe(5);
    expect(result.healthEquityScore).toBe(50);
    expect(result.investmentGap).toBe(0);
  });
});

describe('BLACK_WOMEN_PRIORITY_DISEASES', () => {
  it('exports non-empty priority list (success)', () => {
    expect(BLACK_WOMEN_PRIORITY_DISEASES.length).toBeGreaterThan(0);
    expect(BLACK_WOMEN_PRIORITY_DISEASES[0].name).toBeTruthy();
  });
});
