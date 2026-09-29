/**
 * Base rate for the acquisition index.
 *
 * `overallExitRateEstimate` and `sectorExitRateEstimate` stay the in-sample
 * catalog shares (every catalog company, including the one being scored).
 * The index uses a leave-one-out share: that company is removed from the
 * numerator, when it was acquired, and from the denominator.
 *
 * A company that is not in the catalog cannot be removed. The index then
 * keeps the in-sample share and the caller must label it as in-sample.
 * Hand-built priors without catalog membership do the same.
 *
 * When leaving the company out drops a sector below the minimum sample,
 * the sector share is not used. The overall leave-one-out share is used
 * instead. The in-sample sector share is not substituted.
 */

import {
  type EmpiricalPriors,
  getSectorPrior,
  normalizeSectorBucket,
} from "./empiricalPriors";
import {
  gatedProportionCi,
  isSufficient,
  MIN_SECTOR_SAMPLE,
  missingInput,
} from "./estimators";
import type { QuantValue } from "./types";

export type ExitRateBasis = "leave_one_out" | "in_sample";

export type InSampleReason = "outside_catalog" | "membership_unavailable";

export interface IndexExitRate {
  readonly rate: QuantValue<number>;
  readonly basis: ExitRateBasis;
  readonly inSampleReason?: InSampleReason;
}

const proportionCache = new WeakMap<
  EmpiricalPriors,
  Map<string, QuantValue<number>>
>();

function proportion(
  priors: EmpiricalPriors,
  successes: number,
  total: number,
): QuantValue<number> {
  let cache = proportionCache.get(priors);
  if (!cache) {
    cache = new Map();
    proportionCache.set(priors, cache);
  }
  const key = `${successes}/${total}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const value = gatedProportionCi(successes, total, {
    minSampleSize: MIN_SECTOR_SAMPLE,
  });
  cache.set(key, value);
  return value;
}

function countsAfterExclusion(
  successes: number,
  total: number,
  focalAcquired: boolean,
): { successes: number; total: number } | null {
  const nextTotal = total - 1;
  const nextSuccesses = successes - (focalAcquired ? 1 : 0);
  if (nextTotal < 0 || nextSuccesses < 0 || nextSuccesses > nextTotal) {
    return null;
  }
  return { successes: nextSuccesses, total: nextTotal };
}

function inSampleRate(
  priors: EmpiricalPriors,
  company: { sector: string },
  inSampleReason: InSampleReason,
): IndexExitRate {
  const sectorPrior = getSectorPrior(priors, company.sector);
  const sectorRate = sectorPrior?.sectorExitRateEstimate;
  if (sectorRate && isSufficient(sectorRate)) {
    return { basis: "in_sample", inSampleReason, rate: sectorRate };
  }
  return {
    basis: "in_sample",
    inSampleReason,
    rate: priors.overallExitRateEstimate,
  };
}

/**
 * Exit share used as the acquisition-index base rate for one company.
 */
export function indexExitRate(
  priors: EmpiricalPriors,
  company: { id: string; sector: string },
): IndexExitRate {
  const catalog = priors.catalogCompanyIds;
  const acquiredIds = priors.acquiredCompanyIds;
  if (!catalog || !acquiredIds || priors.acquiredCompanyCount === undefined) {
    return inSampleRate(priors, company, "membership_unavailable");
  }
  if (!catalog.has(company.id)) {
    return inSampleRate(priors, company, "outside_catalog");
  }

  const focalAcquired = acquiredIds.has(company.id);
  const sectorPrior = getSectorPrior(priors, company.sector);
  const sectorBucket = normalizeSectorBucket(company.sector);
  const inSector = sectorPrior !== undefined &&
    sectorPrior.sector === sectorBucket;

  if (
    sectorPrior &&
    inSector &&
    isSufficient(sectorPrior.sectorExitRateEstimate)
  ) {
    const excluded = countsAfterExclusion(
      sectorPrior.acquiredInSector,
      sectorPrior.companyCount,
      focalAcquired,
    );
    if (excluded && excluded.total >= MIN_SECTOR_SAMPLE) {
      return {
        basis: "leave_one_out",
        rate: proportion(priors, excluded.successes, excluded.total),
      };
    }
  }

  const excludedOverall = countsAfterExclusion(
    priors.acquiredCompanyCount,
    priors.companyCount,
    focalAcquired,
  );
  if (!excludedOverall) {
    return {
      basis: "leave_one_out",
      rate: missingInput(
        "Leave-one-out exit share is unavailable after excluding the company being scored",
      ),
    };
  }
  return {
    basis: "leave_one_out",
    rate: proportion(
      priors,
      excludedOverall.successes,
      excludedOverall.total,
    ),
  };
}
