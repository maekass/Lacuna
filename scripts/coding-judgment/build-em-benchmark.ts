#!/usr/bin/env tsx
/**
 * Build the committed peer benchmark for one peer-screen config (default
 * OB/GYN, 99215 among 99211–99215) from the gitignored CMS pull (run
 * fetch-cms-em.ts first).
 *
 *   npm run coding-judgment:build-benchmark [-- --config <path>]
 *
 * Committed output: data/coding-judgment/benchmarks/<config>.<year>.json — aggregates,
 * the pull manifest, and a few coarsened pseudonymous profiles that pass a
 * k ≥ 5 cell check. Never committed: NPIs, names, exact per-provider counts,
 * the pseudonym salt, or the local review list (staging/coding-judgment/).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  benchmarkIdFor,
  benchmarkPathFor,
  describeCodes,
  profileIdFor,
  stagingPathsFor,
} from "../../src/lib/payerOps/codingJudgment/config";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";
import {
  aggregateProviderCounts,
  analyzeTargetShareOutliers,
  type EmServiceRow,
  posteriorBucket,
  type ProviderEmCounts,
  pseudonymize,
  regularizedIncompleteBeta,
  shareBandLow,
  summarizeQuantiles,
  volumeBand,
} from "../../src/lib/payerOps/codingJudgment/emOutlier";
import {
  type EmBenchmark,
  emBenchmarkSchema,
  type ProviderProfile,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const configArg = process.argv.indexOf("--config");
const loaded = loadPeerScreenConfig(
  configArg >= 0 ? process.argv[configArg + 1] : undefined,
);
const { config } = loaded;
const PATHS = stagingPathsFor(config);
const ROWS_PATH = PATHS.rows;
const PULL_PATH = PATHS.pull;
const SALT_PATH = PATHS.salt;
const REVIEW_LIST_PATH = PATHS.reviewList;
const OUT_PATH = benchmarkPathFor(config);

const FAMILY = config.codeFamily;
const MINIMUM_VOLUME = config.screen.minimumVolume;
const REQUIRED_CODES = FAMILY.requiredVisibleCodes;
const SENSITIVITY_CODES = FAMILY.sensitivityRequiredCodes;
const REVIEW_PERCENTILE = config.screen.reviewPercentile;
const POSTERIOR_THRESHOLD = config.screen.posteriorThreshold;
const FDR_LEVEL = config.screen.fdrLevel;
const K_ANONYMITY = config.screen.kAnonymity;
const CB = config.caseBuilder;
const pctLabel = (x: number) => `${Math.round(x * 100)}th`;

interface PullManifest {
  datasetId: string;
  retrievedAt: string;
  queryUrls: string[];
  rowCountsByCode: Record<string, number>;
  apiFoundRowsByCode: Record<string, number>;
  totalRows: number;
  canonicalRowsSha256: string;
}

function loadSalt(): string {
  if (!existsSync(SALT_PATH)) {
    writeFileSync(SALT_PATH, randomBytes(32).toString("hex") + "\n", {
      mode: 0o600,
    });
  }
  return readFileSync(SALT_PATH, "utf8").trim();
}

function loadRows(): EmServiceRow[] {
  return readFileSync(ROWS_PATH, "utf8").split("\n").filter(Boolean).map(
    (line) => {
      const raw = JSON.parse(line) as Record<string, string>;
      return {
        npi: raw.Rndrng_NPI,
        hcpcs: raw.HCPCS_Cd,
        placeOfService: raw.Place_Of_Srvc,
        services: Number(raw.Tot_Srvcs),
      };
    },
  );
}

function round(value: number, digits = 6): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function cellKey(share: number, volume: number): string {
  return `${shareBandLow(share).toFixed(1)}|${volumeBand(volume)}`;
}

function main(): void {
  const pull = JSON.parse(readFileSync(PULL_PATH, "utf8")) as PullManifest;
  const salt = loadSalt();
  const providers = aggregateProviderCounts(loadRows(), FAMILY);
  const options = {
    minimumVolume: MINIMUM_VOLUME,
    requiredCodes: REQUIRED_CODES,
    reviewPercentile: REVIEW_PERCENTILE,
    posteriorThreshold: POSTERIOR_THRESHOLD,
    fdrLevel: FDR_LEVEL,
  };
  const analysis = analyzeTargetShareOutliers(providers, options);
  const { fit, eligible, belowThreshold } = analysis;
  const flagged = eligible.filter((p) => p.outlierForReview);
  const sensitivity = analyzeTargetShareOutliers(providers, {
    ...options,
    requiredCodes: SENSITIVITY_CODES,
  });
  const primaryFlagged = new Set(flagged.map((p) => p.npi));
  const sensitivityFlagged = sensitivity.eligible.filter((p) =>
    p.outlierForReview
  );

  const cellCounts = new Map<string, number>();
  for (const p of eligible) {
    const key = cellKey(p.rawShare, p.familyServices);
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  const lowCellCounts = new Map<string, number>();
  for (const p of belowThreshold) {
    const key = cellKey(p.targetServices / p.familyServices, p.familyServices);
    lowCellCounts.set(key, (lowCellCounts.get(key) ?? 0) + 1);
  }

  const histogram: Record<string, number> = {};
  for (const p of flagged) {
    const band = shareBandLow(p.rawShare).toFixed(1);
    histogram[band] = (histogram[band] ?? 0) + 1;
  }

  const withId = <T extends ProviderEmCounts>(p: T) => ({
    ...p,
    pseudo: pseudonymize(p.npi, salt),
  });
  const byPseudo = <T extends { pseudo: string }>(a: T, b: T) =>
    a.pseudo.localeCompare(b.pseudo);

  const profile = (
    p: ReturnType<typeof withId<(typeof eligible)[number]>>,
  ): ProviderProfile => ({
    id: profileIdFor(config, p.pseudo),
    targetShareBandLow: shareBandLow(p.rawShare),
    volumeBand: volumeBand(p.familyServices),
    shrunkShareBandLow: shareBandLow(p.shrunkShare),
    posteriorBucket: posteriorBucket(p.posteriorAboveReviewRate),
    meetsVolumeThreshold: true,
    outlierForReview: p.outlierForReview,
    cellPeerCount: cellCounts.get(cellKey(p.rawShare, p.familyServices)) ?? 0,
  });

  // Deterministic profile selection; every profile must sit in a k ≥ 5 cell.
  const safeFlagged = flagged.map(withId).filter((p) =>
    (cellCounts.get(cellKey(p.rawShare, p.familyServices)) ?? 0) >= K_ANONYMITY
  ).sort(byPseudo);
  const flaggedPicks = [
    safeFlagged.find((p) => p.familyServices >= CB.highVolumeCut),
    safeFlagged.find((p) => p.familyServices < CB.highVolumeCut),
  ].filter((p): p is (typeof safeFlagged)[number] => p !== undefined);
  const typical =
    eligible.map(withId).filter((p) =>
      !p.outlierForReview && shareBandLow(p.rawShare) === 0 &&
      volumeBand(p.familyServices) === CB.typicalVolumeBand &&
      (cellCounts.get(cellKey(p.rawShare, p.familyServices)) ?? 0) >=
        K_ANONYMITY
    ).sort(byPseudo)[0];
  const lowVolume = belowThreshold.map(withId).filter((p) => {
    const share = p.targetServices / p.familyServices;
    return share >= CB.belowThresholdMinShare &&
      (lowCellCounts.get(cellKey(share, p.familyServices)) ?? 0) >= K_ANONYMITY;
  }).sort(byPseudo)[0];
  if (flaggedPicks.length < 2 || !typical || !lowVolume) {
    throw new Error("Could not select k-anonymous eval profiles");
  }
  const lowShare = lowVolume.targetServices / lowVolume.familyServices;
  const lowA = lowVolume.targetServices + fit.alpha;
  const lowB = lowVolume.familyServices - lowVolume.targetServices + fit.beta;
  const profiles: ProviderProfile[] = [
    ...flaggedPicks.map(profile),
    profile(typical),
    {
      id: profileIdFor(config, lowVolume.pseudo),
      targetShareBandLow: shareBandLow(lowShare),
      volumeBand: volumeBand(lowVolume.familyServices),
      shrunkShareBandLow: shareBandLow(lowA / (lowA + lowB)),
      posteriorBucket: posteriorBucket(
        1 - regularizedIncompleteBeta(analysis.reviewRate, lowA, lowB),
      ),
      meetsVolumeThreshold: false,
      outlierForReview: false,
      cellPeerCount: lowCellCounts.get(
        cellKey(lowShare, lowVolume.familyServices),
      ) ?? 0,
    },
  ];

  const benchmark: EmBenchmark = {
    schemaVersion: "1.0.0",
    id: benchmarkIdFor(config),
    configId: config.id,
    configSha256: loaded.sha256,
    dataset: {
      title: config.cms.title,
      dataYear: config.dataYear,
      datasetId: pull.datasetId,
      alternateDatasetIds: config.cms.alternateDatasetIds,
      currentnessEvidence: config.cms.currentnessEvidence,
      catalogUrl: config.cms.catalogUrl,
      catalogModified: config.cms.catalogModified,
      csvDownloadUrl: config.cms.csvDownloadUrl,
    },
    pull: {
      retrievedAt: pull.retrievedAt,
      queryUrls: pull.queryUrls,
      rowCountsByCode: pull.rowCountsByCode,
      apiFoundRowsByCode: pull.apiFoundRowsByCode,
      totalRows: pull.totalRows,
      canonicalRowsSha256: pull.canonicalRowsSha256,
    },
    method: {
      specialty: config.specialty.cmsProviderType,
      specialtyLabel: config.specialty.label,
      codeFamilyLabel: FAMILY.label,
      targetLabel: FAMILY.targetLabel,
      codes: [...FAMILY.codes],
      targetCode: FAMILY.targetCode,
      unit: "services (Tot_Srvcs), summed across places of service",
      minimumVolume: MINIMUM_VOLUME,
      requiredVisibleCodes: REQUIRED_CODES,
      peerModel: "beta-binomial, method of moments",
      reviewRule:
        `Route for review when P(true ${FAMILY.targetLabel} rate > peer ${
          pctLabel(REVIEW_PERCENTILE)
        }-percentile rate | data) >= ${POSTERIOR_THRESHOLD} under the fitted Beta prior (empirical Bayes).`,
      reviewPercentile: REVIEW_PERCENTILE,
      posteriorThreshold: POSTERIOR_THRESHOLD,
      significanceTest:
        "one-sided beta-binomial upper-tail p-value, Benjamini-Hochberg",
      fdrLevel: FDR_LEVEL,
      suppressionNote:
        `CMS omits provider × code rows with fewer than 11 beneficiaries. Providers without visible ${
          REQUIRED_CODES.join(" and ")
        } rows are excluded (a missing high-volume row inflates share). A missing ${FAMILY.targetCode} row is counted as 0 ${FAMILY.targetLabel} services, a lower bound.`,
    },
    results: {
      providersPulled: providers.length,
      providersEligible: eligible.length,
      excludedBelowVolume: belowThreshold.length,
      excludedIncompleteDenominator: analysis.incompleteDenominator.length,
      pooledTargetShare: round(fit.pooledShare),
      betaAlpha: round(fit.alpha),
      betaBeta: round(fit.beta),
      intraclassRho: round(fit.rho),
      peerRateAtReviewPercentile: round(analysis.reviewRate),
      rawShareQuantiles: roundQuantiles(
        summarizeQuantiles(eligible.map((p) => p.rawShare)),
      ),
      volumeQuantiles: roundQuantiles(
        summarizeQuantiles(eligible.map((p) => p.familyServices)),
      ),
      eligibleWithTargetSuppressed:
        eligible.filter((p) => !p.codesPresent.includes(FAMILY.targetCode))
          .length,
      flaggedForReview: flagged.length,
      estimatedFalseReviewFraction:
        analysis.estimatedFalseReviewFraction === null
          ? null
          : round(analysis.estimatedFalseReviewFraction, 4),
      betaBinomialSignificantAtFdr:
        eligible.filter((p) => p.betaBinomialQ < FDR_LEVEL).length,
      naiveBinomialSignificantAtFdr:
        eligible.filter((p) => p.binomialQ < FDR_LEVEL).length,
      flaggedShareBandHistogram: Object.fromEntries(
        Object.entries(histogram).sort(([a], [b]) => a.localeCompare(b)),
      ),
      minFlaggedRawShareBandLow: flagged.length
        ? Math.min(...flagged.map((p) => shareBandLow(p.rawShare)))
        : null,
      sensitivity: {
        cohort: `Same rule, restricted to providers with visible ${
          SENSITIVITY_CODES.join(", ")
        } rows (selection toward higher ${FAMILY.targetLabel} use, so peers look higher and flags are fewer).`,
        providersEligible: sensitivity.eligible.length,
        pooledTargetShare: round(sensitivity.fit.pooledShare),
        rawShareMedian: round(
          summarizeQuantiles(sensitivity.eligible.map((p) => p.rawShare)).p50,
        ),
        peerRateAtReviewPercentile: round(sensitivity.reviewRate),
        flaggedForReview: sensitivityFlagged.length,
        flaggedAlsoInPrimary:
          sensitivityFlagged.filter((p) => primaryFlagged.has(p.npi)).length,
      },
    },
    profiles,
    privacy:
      `No NPI, name, address, or exact per-provider count is committed. Profile ids are HMAC-SHA256 pseudonyms keyed by a local salt that is not committed. Each profile's share band × volume band cell holds at least ${K_ANONYMITY} providers.`,
    interpretation:
      `A flag means a provider's ${config.dataYear} Medicare Part B ${FAMILY.targetLabel} share (${FAMILY.targetCode} among ${
        describeCodes(FAMILY.codes)
      }) is unusual relative to ${config.specialty.label} peers after allowing for normal between-provider variation. It is a reason for human review only. It is not evidence of incorrect coding, fraud, or wrongdoing: ${config.specialty.legitimateHighShareReasons}, and this data has no diagnoses or documentation.`,
  };

  const parsed = emBenchmarkSchema.parse(benchmark);
  writeFileSync(OUT_PATH, JSON.stringify(parsed, null, 2) + "\n");
  writeFileSync(
    REVIEW_LIST_PATH,
    JSON.stringify(
      flagged.map(withId).map((p) => ({
        pseudo: p.pseudo,
        npi: p.npi,
        familyServices: p.familyServices,
        targetServices: p.targetServices,
        rawShare: p.rawShare,
        shrunkShare: p.shrunkShare,
        posterior: p.posteriorAboveReviewRate,
        codesPresent: p.codesPresent,
      })),
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(JSON.stringify(parsed.results, null, 2));
}

function roundQuantiles<T extends Record<string, number>>(q: T): T {
  return Object.fromEntries(
    Object.entries(q).map(([key, value]) => [key, round(value)]),
  ) as T;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
