/**
 * QUARANTINED — not imported by the app. See ./_quarantine/README.md.
 * Untrained TensorFlow.js stub + logistic heuristics for Vitest only.
 */

import * as tf from "@tensorflow/tfjs";

// Feature definitions matching Python implementation
const MECHANISM_MAP: Record<string, number> = {
  "Gene Editing": 0,
  "Gene Therapy": 1,
  "CAR-T": 2,
  "Anti-CD20": 3,
  "BTK Inhibitor": 4,
  "JAK Inhibitor": 5,
  "IL-17 Inhibitor": 6,
  "IL-23 Inhibitor": 7,
  "TNF Inhibitor": 8,
  "SGLT2 Inhibitor": 9,
  "GLP-1 Agonist": 10,
  "FXR Agonist": 11,
  "PPAR Agonist": 12,
  "S1P Modulator": 13,
  "Monoclonal Antibody": 14,
  "Small Molecule": 15,
  "Novel Mechanism": 16,
};

const SPONSOR_MAP: Record<string, number> = {
  "pharma": 0,
  "biotech": 1,
  "academic": 2,
};

export interface TrialFeatures {
  diseaseArea: string;
  phase: number; // 1, 2, 3
  enrollment: number;
  sponsorType: "pharma" | "biotech" | "academic";
  mechanism: string;
  duration: number; // months
  historicalTransitionRate: number;
  priorApprovals: number;
}

export interface PredictionResult {
  successProbability: number;
  confidenceInterval: [number, number];
  featureImportance: Record<string, number>;
  modelContributions: {
    neuralNetwork: number;
    logisticRegression: number;
  };
}

/** @deprecated Misleading name — untrained TF stub + heuristics for tests only. */
export class EnsemblePredictor {
  private neuralNetwork: tf.LayersModel | null = null;
  private isInitialized = false;

  initialize(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();

    // Create simple neural network (simulating RandomForest + XGBoost ensemble)
    this.neuralNetwork = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 64, activation: "relu" }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: "relu" }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: "relu" }),
        tf.layers.dense({ units: 1, activation: "sigmoid" }),
      ],
    });

    this.neuralNetwork.compile({
      optimizer: "adam",
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    this.isInitialized = true;
    return Promise.resolve();
  }

  predict(features: TrialFeatures): PredictionResult {
    // Encode features
    const mechanismCode = MECHANISM_MAP[features.mechanism] ?? 16;
    const sponsorCode = SPONSOR_MAP[features.sponsorType] ?? 1;

    // Calculate base probability using logistic regression approximation
    const lrProbability = this.logisticRegressionPredict(features);

    // Neural network prediction (if initialized)
    let nnProbability = lrProbability;
    if (this.neuralNetwork && this.isInitialized) {
      const input = tf.tensor2d([[
        features.phase / 3,
        features.enrollment / 1000,
        sponsorCode / 2,
        mechanismCode / 16,
        features.duration / 60,
        features.historicalTransitionRate,
        features.priorApprovals / 10,
        this.hashDisease(features.diseaseArea),
      ]]);

      const prediction = this.neuralNetwork.predict(input) as tf.Tensor;
      nnProbability = prediction.dataSync()[0];
      input.dispose();
      prediction.dispose();
    }

    // Ensemble: weighted average
    const ensembleProbability = 0.6 * nnProbability + 0.4 * lrProbability;

    // Calculate confidence interval (95%)
    const std = 0.12; // Empirical from validation
    const confidenceInterval: [number, number] = [
      Math.max(0, ensembleProbability - 1.96 * std),
      Math.min(1, ensembleProbability + 1.96 * std),
    ];

    return {
      successProbability: ensembleProbability,
      confidenceInterval,
      featureImportance: this.calculateFeatureImportance(),
      modelContributions: {
        neuralNetwork: nnProbability,
        logisticRegression: lrProbability,
      },
    };
  }

  private logisticRegressionPredict(features: TrialFeatures): number {
    // Simplified logistic regression weights based on clinical trial literature
    const weights = {
      phase: 0.35,
      enrollment: 0.15,
      sponsor: 0.20,
      mechanism: 0.10,
      duration: -0.05,
      historical: 0.25,
    };

    const sponsorScore = SPONSOR_MAP[features.sponsorType] ?? 1;
    const mechanismScore = MECHANISM_MAP[features.mechanism] ?? 16;

    const z = weights.phase * (features.phase / 3) +
      weights.enrollment * Math.log10(features.enrollment + 1) / 4 +
      weights.sponsor * (1 - sponsorScore / 2) +
      weights.mechanism * (1 - mechanismScore / 16) +
      weights.duration * (features.duration / 60) +
      weights.historical * features.historicalTransitionRate -
      0.5; // bias

    return 1 / (1 + Math.exp(-z));
  }

  private calculateFeatureImportance(): Record<string, number> {
    // Approximate feature importance based on clinical trial literature
    return {
      phase: 0.28,
      sponsorType: 0.22,
      historicalTransitionRate: 0.18,
      enrollment: 0.15,
      mechanism: 0.10,
      duration: 0.07,
    };
  }

  private hashDisease(disease: string): number {
    // Simple hash for disease encoding
    let hash = 0;
    for (let i = 0; i < disease.length; i++) {
      hash = ((hash << 5) - hash) + disease.charCodeAt(i);
      hash = hash & hash;
    }
    return (Math.abs(hash) % 100) / 100;
  }
}

// Singleton instance
let predictorInstance: EnsemblePredictor | null = null;

export async function getEnsemblePredictor(): Promise<EnsemblePredictor> {
  if (!predictorInstance) {
    predictorInstance = new EnsemblePredictor();
    await predictorInstance.initialize();
  }
  return predictorInstance;
}

// Health equity focused predictions for diseases affecting Black women
export interface HealthEquityPrediction extends PredictionResult {
  diseaseBurden: number; // 1-10 scale
  investmentGap: number; // billions USD
  livesImprovedPerMillion: number;
  healthEquityScore: number; // 0-100
}

export const BLACK_WOMEN_PRIORITY_DISEASES = [
  {
    name: "Maternal Health",
    burden: 9.5,
    mortalityRate: 3.5,
    investmentGap: 12,
  },
  {
    name: "Uterine Fibroids",
    burden: 8.5,
    prevalence: 0.80,
    investmentGap: 34,
  },
  { name: "Lupus", burden: 8.0, prevalenceMultiplier: 3, investmentGap: 8 },
  {
    name: "Sickle Cell Disease",
    burden: 9.0,
    prevalenceInBlack: 0.03,
    investmentGap: 5,
  },
  {
    name: "Cardiovascular Disease",
    burden: 8.5,
    mortalityMultiplier: 1.4,
    investmentGap: 15,
  },
];

export function calculateHealthEquityScore(
  prediction: PredictionResult,
  disease: string,
): HealthEquityPrediction {
  const priorityDisease = BLACK_WOMEN_PRIORITY_DISEASES.find(
    (d) => disease.toLowerCase().includes(d.name.toLowerCase()),
  );

  if (!priorityDisease) {
    return {
      ...prediction,
      diseaseBurden: 5,
      investmentGap: 0,
      livesImprovedPerMillion: 0,
      healthEquityScore: 50,
    };
  }

  // Dual-metric scoring: ROI potential + health equity impact
  const roiScore = prediction.successProbability * 100;
  const equityWeight = priorityDisease.burden / 10;
  const healthEquityScore = (roiScore * 0.6) + (equityWeight * 40);

  return {
    ...prediction,
    diseaseBurden: priorityDisease.burden,
    investmentGap: priorityDisease.investmentGap,
    livesImprovedPerMillion: Math.round(
      priorityDisease.burden * prediction.successProbability * 1000,
    ),
    healthEquityScore: Math.round(healthEquityScore),
  };
}
