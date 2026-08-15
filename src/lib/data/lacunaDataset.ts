/**
 * lacunaDataset — provenance-aware analytics over Lacuna's verified deal set.
 *
 * Public entrypoint for:
 * 1. Estimand-named value aggregation (disclosed-only vs selection-model bounds)
 * 2. Precision-tagged announcement dates + interval time series
 * 3. Deal-status lifecycle with branded CompletedDeal
 * 4. Sampling-frame coverage as a documented ratio (not capture-recapture)
 * 5. Transaction targets vs clinical comparables
 * 6. Incommensurable clinical measurements
 *
 * Prefer importing from `@/lib/data/lacunaDataset` (this module).
 */

export type {
  AggregateCoverage,
  AnnouncedDate,
  CompletedDeal,
  CoverageRatio,
  DatePrecision,
  DealScope,
  DealStatus,
  LacunaDeal,
  StatusTransition,
  ValueTier,
} from "./lacunaDataset/types";
export { VALUE_TIER_RANK, VALUE_TIERS } from "./lacunaDataset/types";

export {
  ART_FERTILITY_UNCONFIRMED,
  asCompletedDeal,
  completedDealsOf,
  completedExitDisclosedTotalMillions,
  COOK_COOPERSURGICAL_TERMINATED,
  currentStatus,
  isTerminalStatus,
  validateStatusHistory,
} from "./lacunaDataset/dealLifecycle";

export type {
  AggregationParams,
  DisclosedOnlyResult,
  EstimatedFrameTotalResult,
  SelectionModel,
  TierSubtotal,
  ValueEstimand,
} from "./lacunaDataset/valueAggregation";
export {
  adjacencyExclusionMillions,
  completedWomensHealthDisclosed,
  disclosedOnlyTotal,
  estimatedFrameTotal,
} from "./lacunaDataset/valueAggregation";

export type {
  DateInterval,
  IntervalOrder,
  TimeSeriesBucket,
  TimeSeriesResult,
} from "./lacunaDataset/datePrecision";
export {
  announcedFromIsoDay,
  compareIntervals,
  dayPrecisionToDate,
  meetsPrecisionFloor,
  timeSeries,
  toInterval,
} from "./lacunaDataset/datePrecision";

export type {
  ExternalReferenceList,
  KnownExclusion,
  SamplingFrame,
} from "./lacunaDataset/samplingFrame";
export {
  aoaDxCoverage,
  coverageAgainstReference,
  LACUNA_VERIFIED_FRAME,
  withCoverage,
} from "./lacunaDataset/samplingFrame";

export type {
  BenchmarkDelta,
  ClinicalAsset,
  ClinicalComparable,
  EvidenceRung,
  TransactionTarget,
} from "./lacunaDataset/clinicalAssets";
export {
  asClinicalComparable,
  asTransactionTarget,
  benchmarkAgainst,
  DEFAULT_CLINICAL_COMPARABLES,
  EVIDENCE_RUNG_RANK,
} from "./lacunaDataset/clinicalAssets";

export type {
  ClassifierMeasurement,
  Comparability,
  ConfidenceInterval,
  EvidenceGapMeasurement,
  IncomparableReason,
  Measurement,
  MeasurementPopulation,
  StudyDesign,
} from "./lacunaDataset/measurements";
export {
  isComparable,
  prevalenceAdjustNpv,
  prevalenceAdjustPpv,
  rankMeasurements,
} from "./lacunaDataset/measurements";

export type {
  VerifiedAcquisitionLike,
  VerifiedDealSource,
} from "./lacunaDataset/fromVerified";
export {
  dealsFromVerifiedDataset,
  getDealAnnotation,
  toLacunaDeal,
} from "./lacunaDataset/fromVerified";

export {
  formatDisclosedBillions,
  type LiveDisclosedStats,
  liveDisclosedStats,
} from "./lacunaDataset/liveStats";
