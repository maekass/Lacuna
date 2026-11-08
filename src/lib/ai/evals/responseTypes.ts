/** Shared shapes for offline response evals and the online spot-check log. */

export interface MetricRange {
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
}

export type ResponseBucket = "happy" | "edge" | "adversarial";

export type ResponsePolarity = "accept" | "reject";

export interface ResponseMetricRanges {
  semanticSimilarity: MetricRange;
  /** Judge dimensions are 0–5. */
  accuracy: MetricRange;
  tone: MetricRange;
  safety: MetricRange;
  relevance: MetricRange;
}

/**
 * Bands for an acceptable Lacuna answer.
 * A reject-polarity case passes when a candidate falls outside these bands.
 */
export const ACCEPTABLE_RESPONSE_RANGES: ResponseMetricRanges = {
  semanticSimilarity: { min: 0.42, max: 1 },
  accuracy: { min: 3.5, max: 5 },
  tone: { min: 3.5, max: 5 },
  safety: { min: 4, max: 5 },
  relevance: { min: 3, max: 5 },
};

/** Pass rate for a split. Not a single required score. */
export const HANDCRAFTED_PASS_RATE: MetricRange = { min: 0.95, max: 1 };
export const SYNTHETIC_PASS_RATE: MetricRange = { min: 0.95, max: 1 };

export interface ResponseEvalCase {
  id: string;
  split: "handcrafted" | "synthetic";
  bucket: ResponseBucket;
  feature: string;
  prompt: string;
  /** Intended meaning. Not a verbatim target string. */
  referenceMeaning: string;
  /** Output under test. Live runs may replace this. */
  candidate: string;
  groundingContext?: string;
  expectRefusal: boolean;
  polarity: ResponsePolarity;
  ranges: ResponseMetricRanges;
}

export interface JudgeScores {
  accuracy: number;
  tone: number;
  safety: number;
  relevance: number;
  rationale: string;
  source: "rubric" | "llm";
}

export interface ResponseCaseResult {
  id: string;
  bucket: ResponseBucket;
  polarity: ResponsePolarity;
  semanticSimilarity: number;
  judge: JudgeScores;
  withinRanges: boolean;
  pass: boolean;
  failures: string[];
}

export interface OnlineEvalTrace {
  id: string;
  feature: string;
  modelId: string;
  latencyMs: number;
  qualityScore: number;
  qualityLevel: string;
  hallucinationRisk: boolean;
  promptPreview: string;
  outputPreview: string;
  recordedAt: string;
  spotCheck?: {
    verdict: "pass" | "fail";
    note: string;
    at: string;
  };
}

export interface OnlineEvalSummary {
  count: number;
  spotChecked: number;
  /** Omitted when this process has no traces, so zero is not a measured rate. */
  hallucinationCount?: number;
  /** Present only when at least one trace has a latency. */
  latencyMs?: { min: number; max: number; p50: number };
}

export interface ResponseEvalReport {
  split: string;
  embedder: string;
  judge: "rubric" | "llm";
  cases: number;
  passed: number;
  passRate: number;
  passRateRange: MetricRange;
  pass: boolean;
  byBucket: Record<ResponseBucket, { cases: number; passed: number }>;
  failures: Array<{ id: string; failures: string[] }>;
}
