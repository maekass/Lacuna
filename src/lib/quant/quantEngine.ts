/**
 * Quantitative analysis engine — barrel re-export.
 *
 * Implementation is split across:
 * - {@link ./types.ts} — shared shapes and QuantValue gating
 * - {@link ./estimators.ts} — BCa bootstrap, gated aggregates
 * - {@link ./priors.ts} — heuristic multiples and assumptions
 * - {@link ./presentation.ts} — recommendations and caveats
 * - {@link ./valuationEngine.ts} — multi-method valuation
 * - {@link ./predictionEngines.ts} — acquisition, impact, portfolio
 */

export type {
  AcquisitionPredictionResult,
  ClinicalStage,
  GeographicRegion,
  HealthImpactProjection,
  InsufficientData,
  InsufficientDataCode,
  MaternalCondition,
  PortfolioRecommendation,
  QuantCompany,
  QuantValue,
  ScoredQuantCompany,
  Sufficient,
  ValuationResult,
  ValuationSummary,
} from "./types";

export {
  bcaBootstrapCi,
  BOOTSTRAP_RESAMPLES,
  createSeededRng,
  DEFAULT_BOOTSTRAP_SEED,
  disclosedFraction,
  gatedMedian,
  gatedProportionCi,
  heckmanSelectionCaveat,
  isSufficient,
  MIN_BCA_SAMPLE,
  MIN_FUNDING_MULTIPLE_SAMPLE,
  MIN_SECTOR_SAMPLE,
  missingInput,
  numericOrNull,
  pointEstimate,
  scaleQuantValue,
  sufficient,
  weightedConsensus,
} from "./estimators";

export { ValuationEngine } from "./valuationEngine";
export {
  AcquisitionPredictor,
  HealthImpactModeler,
  PortfolioOptimizer,
} from "./predictionEngines";
