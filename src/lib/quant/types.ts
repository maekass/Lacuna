/**
 * Shared quant-engine types. Statistical outputs use {@link QuantValue} so
 * insufficient sample sizes cannot be silently rendered as numbers.
 */

export type ClinicalStage =
  | "preclinical"
  | "phase2"
  | "phase3"
  | "fda_approved";

export type GeographicRegion = "US" | "Africa" | "Asia" | "LatAm";

export type MaternalCondition =
  | "preeclampsia"
  | "gestational_diabetes"
  | "pcos"
  | "sickle_cell"
  | "maternal_mortality";

export interface QuantCompany {
  id: string;
  name: string;
  sector: string;
  fundingStage: string;
  clinicalStage: ClinicalStage;
  annualRevenue?: number;
  ebitda?: number;
  raisedToDate: number;
  customerCount: number;
  targetMarketSize?: number;
  geographicFocus: GeographicRegion[];
  condition: MaternalCondition;
  clinicalEfficacy?: {
    effectSize: number;
    sampleSize: number;
    populationDiversity: number;
    africanRepresentation: number;
  };
  teamMetrics?: {
    founderSerialEntrepreneur: boolean;
    advisorStrength: number;
    retentionRisk: number;
  };
  africaDiscountMultiplier?: number;
}

export type InsufficientDataCode =
  | "small_sample"
  | "no_disclosed_values"
  | "no_uncertainty"
  | "missing_input";

export interface InsufficientData {
  readonly kind: "insufficient";
  readonly code: InsufficientDataCode;
  readonly message: string;
  readonly sampleSize: number;
  readonly minRequired: number;
  readonly disclosedFraction?: number;
  readonly selectionCaveat?: string;
}

export interface Sufficient<T extends number> {
  readonly kind: "sufficient";
  readonly value: T;
  readonly sampleSize: number;
  readonly disclosedFraction?: number;
  readonly confidenceInterval: [number, number];
  readonly selectionCaveat?: string;
}

export type QuantValue<T extends number = number> =
  | Sufficient<T>
  | InsufficientData;

export interface DisclosureSelection {
  disclosedCount: number;
  totalCount: number;
  disclosedFraction: number;
  selectionCaveat: string;
}

export interface ValuationResult {
  methodName: string;
  estimate: QuantValue<number>;
  confidence: number;
  reasoning: string;
}

export interface ValuationSummary {
  valuations: ValuationResult[];
  consensus: QuantValue<number>;
  recommendation: string;
  caveats: string[];
}

export interface AcquisitionPredictionResult {
  probability: QuantValue<number>;
  timelineMonths: number;
  driverScores: {
    clinicalValidation: number;
    marketTiming: number;
    teamQuality: number;
    strategicFit: number;
    geographicArbitrage: number;
  };
  riskFactors: string[];
  modelCaveats: string[];
}

export interface HealthImpactProjection {
  annualLivesSaved: number[];
  cumulativeLivesSaved: number;
  costPerLifeSaved: number;
  revenueProjection: number[];
  adoptionCurve: number[];
  assumptions: string[];
}

export interface ScoredQuantCompany extends QuantCompany {
  acquisitionPrice: number;
  projectedExitValue: number;
  acquisitionProbability: number;
  projectedLivesSaved: number;
  projectedRevenue: number;
  roi: number;
  riskAdjustedRoi: number;
}

export interface PortfolioRecommendation {
  companies: ScoredQuantCompany[];
  totalInvestment: number;
  projectedExitValue: number;
  expectedROI: QuantValue<number>;
  projectedLivesSaved: number;
  synergiesValue: number;
  diversificationScore: number;
  caveats: string[];
}
