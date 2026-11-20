/**
 * Coding Judgment Check — shared contracts.
 *
 * Every artifact the eval reads or writes is parsed through one of these
 * schemas, so a truncated or hand-edited file fails loudly instead of being
 * scored. See docs/CODING_JUDGMENT_CHECK.md.
 */
import { z } from "zod";

/** Agent decision about a billing/coding case. */
export const decisionSchema = z.enum(["flag", "no_flag", "abstain"]);
export type CodingDecision = z.infer<typeof decisionSchema>;

/** Who acts on the decision. */
export const routeSchema = z.enum(["auto", "human_review"]);
export type CodingRoute = z.infer<typeof routeSchema>;

/**
 * Structured agent reply. `.strict()` rejects extra keys so a reply that
 * drifts from the contract counts as malformed (fail closed).
 */
export const agentReplySchema = z.object({
  decision: decisionSchema,
  route: routeSchema,
  confidence: z.number().min(0).max(1),
  citations: z.array(z.string().min(1)).max(10),
  rationale: z.string().min(1).max(1200),
}).strict();
export type AgentReply = z.infer<typeof agentReplySchema>;

/** One NCCI practitioner procedure-to-procedure (PTP) edit row. */
export const ptpEditSchema = z.object({
  id: z.string().min(1),
  column1: z.string().min(1),
  column2: z.string().min(1),
  /** True when the source marks the edit "*" = in existence prior to 1996. */
  priorTo1996: z.boolean(),
  /** YYYYMMDD. */
  effectiveDate: z.string().regex(/^\d{8}$/),
  /** YYYYMMDD, or null when the source shows "*" (no deletion). */
  deletionDate: z.string().regex(/^\d{8}$/).nullable(),
  modifierIndicator: z.enum(["0", "1", "9"]),
  rationale: z.string(),
});
export type PtpEdit = z.infer<typeof ptpEditSchema>;

/** One NCCI practitioner medically unlikely edit (MUE) row. */
export const mueEditSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  mueValue: z.number().int().nonnegative(),
  /** 1 = claim line edit, 2 = date of service (policy), 3 = date of service (clinical). */
  adjudicationIndicator: z.enum(["1", "2", "3"]),
  adjudicationLabel: z.string().min(1),
  rationale: z.string(),
});
export type MueEdit = z.infer<typeof mueEditSchema>;

/** Code presence in the full pinned files (computed before subsetting). */
export const codeCoverageSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  inPtpFile: z.boolean(),
  inMueFile: z.boolean(),
});
export type CodeCoverage = z.infer<typeof codeCoverageSchema>;

/** Statement that the full pinned PTP file has no row for a pair, either order. */
export const ptpPairAbsenceSchema = z.object({
  id: z.string().min(1),
  codeA: z.string().min(1),
  codeB: z.string().min(1),
});
export type PtpPairAbsence = z.infer<typeof ptpPairAbsenceSchema>;

const sourceFileSchema = z.object({
  role: z.enum(["ptp", "mue"]),
  url: z.url(),
  zipSha256: z.string().regex(/^[a-f0-9]{64}$/),
  zipBytes: z.number().int().positive(),
  memberName: z.string().min(1),
  memberSha256: z.string().regex(/^[a-f0-9]{64}$/),
  dataRowCount: z.number().int().nonnegative(),
});

/** Pinned NCCI subset committed for the eval, plus provenance of the full files. */
export const ncciSubsetSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  program: z.literal("Medicare NCCI — practitioner"),
  ptpVersion: z.string().min(1),
  quarter: z.string().regex(/^\d{4}Q[1-4]$/),
  effectiveFrom: z.iso.date(),
  effectiveThrough: z.iso.date(),
  retrievedAt: z.iso.datetime(),
  sourcePages: z.array(z.url()).min(1),
  sourceFiles: z.array(sourceFileSchema).min(1),
  licenseNote: z.string().min(1),
  ptpEdits: z.array(ptpEditSchema),
  mueEdits: z.array(mueEditSchema),
  coverage: z.array(codeCoverageSchema),
  ptpPairAbsences: z.array(ptpPairAbsenceSchema),
});
export type NcciSubset = z.infer<typeof ncciSubsetSchema>;

const quantilesSchema = z.object({
  p10: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
  p95: z.number(),
  p99: z.number(),
});
export type Quantiles = z.infer<typeof quantilesSchema>;

/** Coarsened, pseudonymous provider profile safe to commit to a public repo. */
export const providerProfileSchema = z.object({
  id: z.string().regex(/^profile:\d{4}:[a-z0-9-]+:[a-f0-9]{12}$/),
  /** Lower bound (inclusive) of a 10-point level-5 share band, e.g. 0.5 → 50–60%. */
  targetShareBandLow: z.number().min(0).max(0.9),
  /** Established-patient E/M service volume band label, e.g. "250-499". */
  volumeBand: z.string().min(1),
  /** Lower bound of the 10-point band holding the shrunken (posterior-mean) share. */
  shrunkShareBandLow: z.number().min(0).max(0.9),
  /** Bucket of P(true rate > peer review-percentile rate | data). */
  posteriorBucket: z.enum([">=0.9", "0.5-0.9", "<0.5"]),
  meetsVolumeThreshold: z.boolean(),
  outlierForReview: z.boolean(),
  /** Count of eligible peers in the same share band × volume band cell. */
  cellPeerCount: z.number().int().nonnegative(),
});
export type ProviderProfile = z.infer<typeof providerProfileSchema>;

/** Aggregate specialty × code-family peer benchmark committed for the eval. */
export const emBenchmarkSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().regex(/^bench:\d{4}:[a-z0-9-]+:[a-z0-9-]+$/),
  /** Peer-screen config this benchmark was built from, and its hash. */
  configId: z.string().min(1),
  configSha256: z.string().regex(/^[a-f0-9]{64}$/),
  dataset: z.object({
    title: z.string().min(1),
    dataYear: z.number().int(),
    datasetId: z.string().uuid(),
    alternateDatasetIds: z.array(z.string().uuid()),
    currentnessEvidence: z.string().min(1),
    catalogUrl: z.url(),
    catalogModified: z.string().min(1),
    csvDownloadUrl: z.url(),
  }),
  pull: z.object({
    retrievedAt: z.iso.datetime(),
    queryUrls: z.array(z.url()).min(1),
    rowCountsByCode: z.record(z.string(), z.number().int().nonnegative()),
    apiFoundRowsByCode: z.record(z.string(), z.number().int().nonnegative()),
    totalRows: z.number().int().nonnegative(),
    canonicalRowsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  method: z.object({
    specialty: z.string().min(1),
    specialtyLabel: z.string().min(1),
    codeFamilyLabel: z.string().min(1),
    targetLabel: z.string().min(1),
    codes: z.array(z.string()),
    targetCode: z.string().min(1),
    unit: z.literal("services (Tot_Srvcs), summed across places of service"),
    minimumVolume: z.number().int().positive(),
    requiredVisibleCodes: z.array(z.string()),
    peerModel: z.literal("beta-binomial, method of moments"),
    reviewRule: z.string().min(1),
    reviewPercentile: z.number().positive().max(1),
    posteriorThreshold: z.number().positive().max(1),
    significanceTest: z.literal(
      "one-sided beta-binomial upper-tail p-value, Benjamini-Hochberg",
    ),
    fdrLevel: z.number().positive().max(1),
    suppressionNote: z.string().min(1),
  }),
  results: z.object({
    providersPulled: z.number().int().nonnegative(),
    providersEligible: z.number().int().nonnegative(),
    excludedBelowVolume: z.number().int().nonnegative(),
    excludedIncompleteDenominator: z.number().int().nonnegative(),
    pooledTargetShare: z.number().min(0).max(1),
    betaAlpha: z.number().positive(),
    betaBeta: z.number().positive(),
    intraclassRho: z.number().min(0).max(1),
    peerRateAtReviewPercentile: z.number().min(0).max(1),
    rawShareQuantiles: quantilesSchema,
    volumeQuantiles: quantilesSchema,
    eligibleWithTargetSuppressed: z.number().int().nonnegative(),
    flaggedForReview: z.number().int().nonnegative(),
    estimatedFalseReviewFraction: z.number().min(0).max(1).nullable(),
    betaBinomialSignificantAtFdr: z.number().int().nonnegative(),
    naiveBinomialSignificantAtFdr: z.number().int().nonnegative(),
    flaggedShareBandHistogram: z.record(z.string(), z.number().int()),
    minFlaggedRawShareBandLow: z.number().nullable(),
    sensitivity: z.object({
      cohort: z.string().min(1),
      providersEligible: z.number().int().nonnegative(),
      pooledTargetShare: z.number().min(0).max(1),
      rawShareMedian: z.number().min(0).max(1),
      peerRateAtReviewPercentile: z.number().min(0).max(1),
      flaggedForReview: z.number().int().nonnegative(),
      flaggedAlsoInPrimary: z.number().int().nonnegative(),
    }),
  }),
  profiles: z.array(providerProfileSchema),
  privacy: z.string().min(1),
  interpretation: z.string().min(1),
});
export type EmBenchmark = z.infer<typeof emBenchmarkSchema>;

/** Case kinds in the frozen eval. */
export const caseKindSchema = z.enum([
  "ptp",
  "mue",
  "profile",
  "trap",
]);
export type CaseKind = z.infer<typeof caseKindSchema>;

/** Structured facts the deterministic retriever uses for a case. */
export const caseFactsSchema = z.object({
  codes: z.array(z.string().min(1)).default([]),
  /** Modifiers appended to the column-2 code when billed, e.g. ["59"]. */
  modifiers: z.array(z.string().min(1)).default([]),
  units: z.number().int().positive().optional(),
  dateOfService: z.iso.date().optional(),
  profileId: z.string().optional(),
});
export type CaseFacts = z.infer<typeof caseFactsSchema>;

/** One frozen eval case. Expected answers cite the row that justifies them. */
export const evalCaseSchema = z.object({
  id: z.string().regex(/^cjc-\d{3}$/),
  kind: caseKindSchema,
  question: z.string().min(1),
  facts: caseFactsSchema,
  expected: z.object({
    decision: decisionSchema,
    /** Routes accepted as appropriate. */
    acceptableRoutes: z.array(routeSchema).min(1),
    /** Ids that must be cited for a citation to count as justifying. */
    justifyingIds: z.array(z.string().min(1)),
    /** Plain-language reason an analyst can check against the row. */
    basis: z.string().min(1),
  }),
  /** True when the right answer is abstain/human_review by design. */
  trap: z.boolean(),
  tags: z.array(z.string().min(1)),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;

export const evalSetSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  evalSetId: z.literal("coding-judgment-check"),
  version: z.string().min(1),
  status: z.literal("assistant_built_not_adjudicated"),
  autonomyPolicy: z.string().min(1),
  cases: z.array(evalCaseSchema).min(1),
});
export type EvalSet = z.infer<typeof evalSetSchema>;

export const conditionSchema = z.enum(["grounded", "closed_book"]);
export type EvalCondition = z.infer<typeof conditionSchema>;

/** One recorded model reply (raw text kept verbatim for audit). */
export const replyRecordSchema = z.object({
  caseId: z.string().min(1),
  condition: conditionSchema,
  /** Model id requested for this call. */
  modelId: z.string().min(1),
  /** Model id the provider reported serving, when available. */
  returnedModelId: z.string().nullable(),
  finishReason: z.string().nullable(),
  rateLimitRetries: z.number().int().nonnegative(),
  promptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  rawText: z.string().nullable(),
  /** Non-null means the reply fails closed (provider error, truncation, model mismatch). */
  error: z.string().nullable(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  recordedAt: z.iso.datetime(),
});
export type ReplyRecord = z.infer<typeof replyRecordSchema>;

export const runManifestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().min(1),
  createdAt: z.iso.datetime(),
  gitCommit: z.string().min(1),
  /** Requested model ids, one per model in the run. */
  modelIds: z.array(z.string().min(1)).min(1),
  provider: z.enum(["ai_gateway", "openrouter_free"]),
  providerNote: z.string().min(1),
  inferencePath: z.string().min(1),
  temperature: z.number(),
  maxOutputTokens: z.number().int().positive(),
  promptVersion: z.string().min(1),
  systemPromptSha256: z.object({
    grounded: z.string().regex(/^[a-f0-9]{64}$/),
    closed_book: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  evalSetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  ncciSubsetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  emBenchmarkSha256: z.string().regex(/^[a-f0-9]{64}$/),
  conditions: z.array(conditionSchema).min(1),
  caseCount: z.number().int().positive(),
  passes: z.literal(1),
});
export type RunManifest = z.infer<typeof runManifestSchema>;
