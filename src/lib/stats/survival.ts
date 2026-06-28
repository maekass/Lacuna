/**
 * Kaplan-Meier survival estimator with Greenwood confidence bands and
 * log-rank test for group comparisons.
 *
 * References:
 *   Kaplan & Meier (1958). JASA 53(282):457–481.
 *   Greenwood (1926). J R Stat Soc 89(1):74–80. (variance formula)
 *   Mantel (1966). Cancer Chemother Rep 50(3):163–170. (log-rank test)
 *   Harrington & Fleming (1982). Biometrika 69(3):553–566. (weighted variants)
 *
 * Censoring convention: event=1 means the event occurred (acquired);
 * event=0 means right-censored (still active / unknown outcome).
 */

export interface SurvivalObs {
  /** Time from origin to event or censoring (years, months, etc.) */
  time: number;
  /** 1 = event occurred, 0 = right-censored */
  event: 0 | 1;
  /** Optional stratum label for multi-group analysis */
  group?: string;
}

export interface KMStep {
  time: number;
  /** Number at risk just before this time point */
  nRisk: number;
  /** Number of events at this time */
  nEvents: number;
  /** Number censored at this time */
  nCensored: number;
  /** Kaplan-Meier survival probability S(t) */
  survival: number;
  /** Greenwood SE of S(t) */
  se: number;
  /** 95% plain log CI lower bound */
  lower95: number;
  /** 95% plain log CI upper bound */
  upper95: number;
}

export interface KMResult {
  group: string;
  steps: KMStep[];
  /** Median survival time (time where S(t) first crosses 0.5), null if not reached */
  medianSurvival: number | null;
  /** 95% CI for median (Brookmeyer-Crowley) */
  medianCI: [number, number] | null;
  n: number;
  nEvents: number;
}

/**
 * Compute the Kaplan-Meier estimator for a single group.
 * Times are processed in ascending order; tied event times follow
 * the "death before censoring" convention.
 */
export function kaplanMeier(obs: SurvivalObs[], group = "Overall"): KMResult {
  const n = obs.length;
  if (n === 0) {
    return {
      group,
      steps: [],
      medianSurvival: null,
      medianCI: null,
      n: 0,
      nEvents: 0,
    };
  }

  // Sort: ascending time; events before censoring at same time
  const sorted = [...obs].sort((a, b) => a.time - b.time || b.event - a.event);

  const steps: KMStep[] = [];
  let S = 1.0;
  let greenwoodSum = 0; // Σ d_i / (n_i × (n_i − d_i))
  let atRisk = n;
  let i = 0;

  while (i < sorted.length) {
    const t = sorted[i].time;
    // Count events and censored at this time point
    let events = 0, censored = 0;
    let j = i;
    while (j < sorted.length && sorted[j].time === t) {
      if (sorted[j].event === 1) events++;
      else censored++;
      j++;
    }

    if (events > 0) {
      const hazard = events / atRisk;
      S = S * (1 - hazard);

      // Greenwood variance: Var(log S) = Σ d/(n(n-d))
      const denom = atRisk * (atRisk - events);
      if (denom > 0) greenwoodSum += events / denom;

      // Plain log CI: S(t)^exp(±1.96×SE/log(S))
      const logS = Math.log(S) || -1e-10;
      const seLogS = Math.sqrt(greenwoodSum);
      const lower95 = S > 0
        ? Math.exp(logS * Math.exp(-1.96 * seLogS / Math.abs(logS)))
        : 0;
      const upper95 = S > 0
        ? Math.exp(logS * Math.exp(1.96 * seLogS / Math.abs(logS)))
        : 0;

      steps.push({
        time: t,
        nRisk: atRisk,
        nEvents: events,
        nCensored: censored,
        survival: Math.max(0, S),
        se: Math.sqrt(S * S * greenwoodSum),
        lower95: Math.max(0, Math.min(1, lower95)),
        upper95: Math.max(0, Math.min(1, upper95)),
      });
    } else {
      // Pure censoring row — still update risk but no step in S
      // We optionally record censoring times for tick-marks
      steps.push({
        time: t,
        nRisk: atRisk,
        nEvents: 0,
        nCensored: censored,
        survival: Math.max(0, S),
        se: Math.sqrt(S * S * greenwoodSum),
        lower95: steps.length > 0 ? steps[steps.length - 1].lower95 : 1,
        upper95: steps.length > 0 ? steps[steps.length - 1].upper95 : 1,
      });
    }

    atRisk -= events + censored;
    i = j;
  }

  // Median survival and Brookmeyer-Crowley interval
  const medianSurvival = (() => {
    const crossingStep = steps.find((s) => s.survival <= 0.5 && s.nEvents > 0);
    return crossingStep?.time ?? null;
  })();

  const medianCI: [number, number] | null = (() => {
    const lower = steps.find((s) => s.upper95 <= 0.5);
    const upper = steps.find((s) => s.lower95 <= 0.5);
    if (!lower && !upper) return null;
    return [lower?.time ?? 0, upper?.time ?? Infinity] as [number, number];
  })();

  const nEvents = sorted.filter((o) => o.event === 1).length;

  return { group, steps, medianSurvival, medianCI, n, nEvents };
}

export interface LogRankResult {
  /** Chi-squared statistic */
  chiSquared: number;
  /** Degrees of freedom (number of groups − 1) */
  df: number;
  /** Approximate p-value from chi-squared distribution */
  pValue: number;
  /** Expected events by group (for reporting) */
  expected: Record<string, number>;
  /** Observed events by group */
  observed: Record<string, number>;
}

/**
 * Log-rank test (Mantel 1966) for equality of survival functions across groups.
 * Returns chi-squared statistic and approximate p-value.
 */
export function logRankTest(
  obsByGroup: Record<string, SurvivalObs[]>,
): LogRankResult {
  const groups = Object.keys(obsByGroup);
  const G = groups.length;

  // Gather all unique event times across all groups
  const allEventTimes = new Set<number>();
  for (const obs of Object.values(obsByGroup)) {
    for (const o of obs) {
      if (o.event === 1) allEventTimes.add(o.time);
    }
  }
  const times = Array.from(allEventTimes).sort((a, b) => a - b);

  const O: Record<string, number> = Object.fromEntries(
    groups.map((g) => [g, 0]),
  );
  const E: Record<string, number> = Object.fromEntries(
    groups.map((g) => [g, 0]),
  );
  const U: Record<string, number> = Object.fromEntries(
    groups.map((g) => [g, 0]),
  ); // O - E

  for (const t of times) {
    const atRiskByGroup: Record<string, number> = {};
    const eventsByGroup: Record<string, number> = {};
    let totalAtRisk = 0;
    let totalEvents = 0;

    for (const g of groups) {
      const nRisk = obsByGroup[g].filter((o) => o.time >= t).length;
      const nEvents = obsByGroup[g].filter((o) =>
        o.time === t && o.event === 1
      ).length;
      atRiskByGroup[g] = nRisk;
      eventsByGroup[g] = nEvents;
      totalAtRisk += nRisk;
      totalEvents += nEvents;
    }

    if (totalAtRisk === 0) continue;

    for (const g of groups) {
      const expected = (atRiskByGroup[g] / totalAtRisk) * totalEvents;
      E[g] += expected;
      O[g] += eventsByGroup[g];
      U[g] += eventsByGroup[g] - expected;
    }
  }

  // Chi-squared statistic (log-rank)
  let chi2 = 0;
  for (const g of groups) {
    const diff = O[g] - E[g];
    chi2 += diff * diff / (E[g] || 1);
  }

  return {
    chiSquared: Math.round(chi2 * 1000) / 1000,
    df: G - 1,
    pValue: chi2Pvalue(chi2, G - 1),
    expected: E,
    observed: O,
  };
}

/** Chi-squared p-value via regularised incomplete gamma function (Abramowitz & Stegun). */
function chi2Pvalue(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  return 1 - regularisedGammaP(df / 2, x / 2);
}

function regularisedGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (x < a + 1) return gammaSeries(a, x);
  return 1 - gammaContinuedFraction(a, x);
}

function gammaSeries(a: number, x: number): number {
  let ap = a, del = 1 / a, sum = del;
  for (let n = 1; n <= 200; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function logGamma(z: number): number {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = z, x = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) {
    y++;
    ser += ci / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Run KM analysis on the full dataset stratified by the `group` field.
 * Returns per-group KM results plus a multi-group log-rank test.
 */
export function stratifiedKM(obs: SurvivalObs[]): {
  groups: KMResult[];
  logRank: LogRankResult | null;
} {
  const byGroup: Record<string, SurvivalObs[]> = {};
  for (const o of obs) {
    const g = o.group ?? "Overall";
    (byGroup[g] ??= []).push(o);
  }

  const groups = Object.entries(byGroup).map(([g, data]) =>
    kaplanMeier(data, g)
  );
  const logRank = Object.keys(byGroup).length > 1 ? logRankTest(byGroup) : null;

  return { groups, logRank };
}
