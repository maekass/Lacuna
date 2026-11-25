#!/usr/bin/env tsx
/**
 * Build the held-out benchmark: the committed peer benchmark plus extra
 * pseudonymous profiles for boundary cases (below the volume minimum, near the
 * review rule, flagged at modest volume). Aggregates are unchanged; only the
 * profile list grows. Reads the gitignored CMS pull and salt.
 *
 *   npm run coding-judgment:build-heldout-profiles [-- --config <path>]
 *
 * Output: data/coding-judgment/benchmarks/<config>.<year>.heldout.json.
 * Every added profile sits in a share band × volume band cell of at least
 * k providers, and none repeats a profile already in the v1 benchmark.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  benchmarkPathFor,
  profileIdFor,
  stagingPathsFor,
} from "../../src/lib/payerOps/codingJudgment/config";
import {
  aggregateProviderCounts,
  analyzeTargetShareOutliers,
  type EmServiceRow,
  posteriorBucket,
  pseudonymize,
  regularizedIncompleteBeta,
  shareBandLow,
  volumeBand,
} from "../../src/lib/payerOps/codingJudgment/emOutlier";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";
import {
  emBenchmarkSchema,
  type ProviderProfile,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const configArg = process.argv.indexOf("--config");
const { config } = loadPeerScreenConfig(
  configArg >= 0 ? process.argv[configArg + 1] : undefined,
);
const PATHS = stagingPathsFor(config);
const BASE_PATH = benchmarkPathFor(config);
const HELDOUT_BENCHMARK_PATH = BASE_PATH.replace(
  /\.json$/,
  ".heldout.json",
);
const K = config.screen.kAnonymity;

function cellKey(share: number, volume: number): string {
  return `${shareBandLow(share).toFixed(1)}|${volumeBand(volume)}`;
}

function main(): void {
  const base = emBenchmarkSchema.parse(
    JSON.parse(readFileSync(BASE_PATH, "utf8")),
  );
  const salt = readFileSync(PATHS.salt, "utf8").trim();
  const rows: EmServiceRow[] = readFileSync(PATHS.rows, "utf8").split("\n")
    .filter(Boolean).map((line) => {
      const raw = JSON.parse(line) as Record<string, string>;
      return {
        npi: raw.Rndrng_NPI,
        hcpcs: raw.HCPCS_Cd,
        placeOfService: raw.Place_Of_Srvc,
        services: Number(raw.Tot_Srvcs),
      };
    });
  const providers = aggregateProviderCounts(rows, config.codeFamily);
  const analysis = analyzeTargetShareOutliers(providers, {
    minimumVolume: config.screen.minimumVolume,
    requiredCodes: config.codeFamily.requiredVisibleCodes,
    reviewPercentile: config.screen.reviewPercentile,
    posteriorThreshold: config.screen.posteriorThreshold,
    fdrLevel: config.screen.fdrLevel,
  });
  if (analysis.eligible.length !== base.results.providersEligible) {
    throw new Error("Staging pull does not reproduce the committed benchmark");
  }
  const { fit } = analysis;
  const used = new Set(base.profiles.map((p) => p.id));
  const cells = new Map<string, number>();
  for (const p of analysis.eligible) {
    const key = cellKey(p.rawShare, p.familyServices);
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  const lowCells = new Map<string, number>();
  for (const p of analysis.belowThreshold) {
    const key = cellKey(p.targetServices / p.familyServices, p.familyServices);
    lowCells.set(key, (lowCells.get(key) ?? 0) + 1);
  }

  const eligible = analysis.eligible.map((p) => ({
    ...p,
    id: profileIdFor(config, pseudonymize(p.npi, salt)),
  })).filter((p) =>
    !used.has(p.id) &&
    (cells.get(cellKey(p.rawShare, p.familyServices)) ?? 0) >= K
  ).sort((a, b) => a.id.localeCompare(b.id));
  const below = analysis.belowThreshold.map((p) => ({
    ...p,
    share: p.targetServices / p.familyServices,
    id: profileIdFor(config, pseudonymize(p.npi, salt)),
  })).filter((p) =>
    !used.has(p.id) &&
    (lowCells.get(cellKey(p.share, p.familyServices)) ?? 0) >= K
  ).sort((a, b) => a.id.localeCompare(b.id));

  const picks = {
    nearReviewRule: eligible.find((p) =>
      !p.outlierForReview &&
      posteriorBucket(p.posteriorAboveReviewRate) === "0.5-0.9"
    ),
    justAboveMinimum: eligible.find((p) =>
      !p.outlierForReview &&
      p.familyServices < config.screen.minimumVolume + 25 &&
      shareBandLow(p.rawShare) >= 0.1
    ),
    flaggedModestVolume: eligible.find((p) =>
      p.outlierForReview && volumeBand(p.familyServices) === "100-249"
    ),
    belowMinimumLowShare: below.find((p) => shareBandLow(p.share) === 0),
    belowMinimumMidShare: below.find((p) =>
      shareBandLow(p.share) >= 0.2 && shareBandLow(p.share) <= 0.4
    ),
  };
  for (const [name, pick] of Object.entries(picks)) {
    if (!pick) throw new Error(`No k-anonymous profile for ${name}`);
  }
  const eligibleProfile = (
    p: NonNullable<typeof picks.nearReviewRule>,
  ): ProviderProfile => ({
    id: p.id,
    targetShareBandLow: shareBandLow(p.rawShare),
    volumeBand: volumeBand(p.familyServices),
    shrunkShareBandLow: shareBandLow(p.shrunkShare),
    posteriorBucket: posteriorBucket(p.posteriorAboveReviewRate),
    meetsVolumeThreshold: true,
    outlierForReview: p.outlierForReview,
    cellPeerCount: cells.get(cellKey(p.rawShare, p.familyServices)) ?? 0,
  });
  const belowProfile = (
    p: NonNullable<typeof picks.belowMinimumLowShare>,
  ): ProviderProfile => {
    const a = p.targetServices + fit.alpha;
    const b = p.familyServices - p.targetServices + fit.beta;
    return {
      id: p.id,
      targetShareBandLow: shareBandLow(p.share),
      volumeBand: volumeBand(p.familyServices),
      shrunkShareBandLow: shareBandLow(a / (a + b)),
      posteriorBucket: posteriorBucket(
        1 - regularizedIncompleteBeta(analysis.reviewRate, a, b),
      ),
      meetsVolumeThreshold: false,
      outlierForReview: false,
      cellPeerCount: lowCells.get(cellKey(p.share, p.familyServices)) ?? 0,
    };
  };
  const added = [
    eligibleProfile(
      picks.nearReviewRule as NonNullable<typeof picks.nearReviewRule>,
    ),
    eligibleProfile(
      picks.justAboveMinimum as NonNullable<typeof picks.nearReviewRule>,
    ),
    eligibleProfile(
      picks.flaggedModestVolume as NonNullable<typeof picks.nearReviewRule>,
    ),
    belowProfile(
      picks.belowMinimumLowShare as NonNullable<
        typeof picks.belowMinimumLowShare
      >,
    ),
    belowProfile(
      picks.belowMinimumMidShare as NonNullable<
        typeof picks.belowMinimumLowShare
      >,
    ),
  ];
  const out = emBenchmarkSchema.parse({
    ...base,
    profiles: [...base.profiles, ...added],
  });
  writeFileSync(HELDOUT_BENCHMARK_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    Object.keys(picks).map((name, i) => `${name}: ${JSON.stringify(added[i])}`)
      .join("\n"),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
