import { useState, useCallback } from 'react';
import { Company, ExitPrediction } from '@/lib/types';

// Synchronous calculation function
function calculateExitPredictions(companies: readonly Company[]): ExitPrediction[] {
  const preds: ExitPrediction[] = companies.map(company => {
    const age = 2024 - company.founded;
    const hasHighValuation = (company.valuation || 0) > 500;
    const isLateStage = ['Series C', 'Series D', 'Late Stage', 'Pre-IPO'].includes(company.stage);
    const isHotSector = ['Fertility', 'Mental Health', 'Wearables'].includes(company.sector);
    
    const features = {
      stageScore: isLateStage ? 0.25 : 0,
      valuationScore: hasHighValuation ? 0.2 : 0,
      sectorScore: isHotSector ? 0.15 : 0,
      ageScore: age > 8 ? 0.1 : 0
    };

    const probability = Math.min(0.95, 0.3 + Object.values(features).reduce((a, b) => a + b, 0));
    
    const sectorAcquirers: Record<string, string> = {
      'Fertility': 'Teladoc',
      'Mental Health': 'Amazon',
      'Wearables': 'Apple',
      'General Wellness': 'UnitedHealth',
      'Pelvic Health': 'Abbott'
    };

    return {
      companyId: company.id,
      companyName: company.name,
      exitProbability: probability,
      predictedAcquirer: sectorAcquirers[company.sector] || 'Strategic Buyer',
      confidence: Math.min(0.95, 0.55 + probability * 0.35),
      factors: [
        isLateStage ? 'Late stage maturity' : 'Early stage growth',
        hasHighValuation ? 'High valuation attracts buyers' : 'Acquisition-friendly valuation',
        isHotSector ? 'Hot sector activity' : 'Steady sector interest'
      ].filter(Boolean),
      calculatedAt: new Date()
    };
  });

  return preds.sort((a, b) => b.exitProbability - a.exitProbability).slice(0, 5);
}

type State = {
  predictions: ExitPrediction[];
  isLoading: boolean;
  isReady: boolean;
};

export function usePredictions(companies: readonly Company[]) {
  const [state, setState] = useState<State>({
    predictions: [],
    isLoading: false,
    isReady: false
  });

  const load = useCallback(() => {
    if (companies.length === 0) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Defer calculation to next tick
    Promise.resolve().then(() => {
      const predictions = calculateExitPredictions(companies);
      setState({
        predictions,
        isLoading: false,
        isReady: true
      });
    });
  }, [companies]);

  const refresh = useCallback(() => {
    const predictions = calculateExitPredictions(companies);
    setState({
      predictions,
      isLoading: false,
      isReady: true
    });
  }, [companies]);

  return {
    predictions: state.predictions,
    isLoading: state.isLoading,
    isReady: state.isReady,
    load,
    refresh
  };
}
