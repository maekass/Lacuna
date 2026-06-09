/**
 * Descriptive Competitive Analysis Framework
 *
 * Pure DESCRIPTIVE analysis of acquirer behavior:
 * - What they've actually done (observable)
 * - NOT what they intended (unobservable)
 *
 * Principles:
 * - Report facts, not interpretations
 * - Acknowledge confounders
 * - No claims about synergy or strategic intent
 *
 * References:
 * - Cartwright, S., Schoenberg, R. (2006). "Thirty Years of Mergers and Acquisitions Research"
 * - Haleblian, J., et al. (2009). "Taking Stock of What We Know About Mergers and Acquisitions"
 */

export interface Acquirer {
  id: string;
  name: string;
  type:
    | "strategic_healthcare"
    | "strategic_tech"
    | "private_equity"
    | "venture_capital"
    | "corporate_health";
  marketCap?: number; // millions
  sizeTier: "fortune_500" | "mid_market" | "small_cap";
  founded?: number;
  headquarters?: string;
}

export interface AcquiredCompany {
  id: string;
  name: string;
  sector: string;
  stage:
    | "pre_seed"
    | "seed"
    | "series_a"
    | "series_b"
    | "series_c"
    | "series_d_plus"
    | "public";
  yearFounded: number;
  yearAcquired: number;
  acquisitionValue?: number; // millions
  geography: "us" | "eu" | "asia" | "global";
}

export interface AcquisitionRecord {
  acquirerId: string;
  companyId: string;
  year: number;
  value?: number;
}

// ============================================================================
// 1. ACQUIRER PORTFOLIO ANALYSIS (Purely Descriptive)
// ============================================================================

export interface PortfolioComposition {
  acquirerId: string;
  acquirerName: string;
  totalAcquisitions: number;

  // Sector mix (% of portfolio)
  sectorComposition: { sector: string; count: number; percentage: number }[];

  // Stage mix
  stageComposition: { stage: string; count: number; percentage: number }[];

  // Geography
  geographyComposition: {
    geography: string;
    count: number;
    percentage: number;
  }[];

  // Value distribution
  valueStats: {
    total: number;
    mean: number;
    median: number;
    range: [number, number];
    disclosed: number; // number with disclosed values
  };

  // Company age at acquisition
  ageAtAcquisitionStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
  };

  // Pure descriptive summary (no interpretation)
  descriptivePattern: string;
}

export function analyzePortfolio(
  acquirer: Acquirer,
  acquisitions: AcquisitionRecord[],
  companies: AcquiredCompany[],
): PortfolioComposition {
  const acqRecords = acquisitions.filter((a) => a.acquirerId === acquirer.id);
  const acquiredCompanies = acqRecords
    .map((a) => companies.find((c) => c.id === a.companyId))
    .filter((c): c is AcquiredCompany => c !== undefined);

  if (acquiredCompanies.length === 0) {
    return {
      acquirerId: acquirer.id,
      acquirerName: acquirer.name,
      totalAcquisitions: 0,
      sectorComposition: [],
      stageComposition: [],
      geographyComposition: [],
      valueStats: { total: 0, mean: 0, median: 0, range: [0, 0], disclosed: 0 },
      ageAtAcquisitionStats: { mean: 0, median: 0, min: 0, max: 0 },
      descriptivePattern: "No acquisitions in dataset",
    };
  }

  // Sector composition
  const sectorCounts = new Map<string, number>();
  acquiredCompanies.forEach((c) =>
    sectorCounts.set(c.sector, (sectorCounts.get(c.sector) || 0) + 1)
  );
  const sectorComposition = Array.from(sectorCounts.entries())
    .map(([sector, count]) => ({
      sector,
      count,
      percentage: (count / acquiredCompanies.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Stage composition
  const stageCounts = new Map<string, number>();
  acquiredCompanies.forEach((c) =>
    stageCounts.set(c.stage, (stageCounts.get(c.stage) || 0) + 1)
  );
  const stageComposition = Array.from(stageCounts.entries())
    .map(([stage, count]) => ({
      stage,
      count,
      percentage: (count / acquiredCompanies.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Geography
  const geoCounts = new Map<string, number>();
  acquiredCompanies.forEach((c) =>
    geoCounts.set(c.geography, (geoCounts.get(c.geography) || 0) + 1)
  );
  const geographyComposition = Array.from(geoCounts.entries())
    .map(([geography, count]) => ({
      geography,
      count,
      percentage: (count / acquiredCompanies.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Value stats
  const values = acquiredCompanies
    .map((c) => c.acquisitionValue)
    .filter((v): v is number => v !== undefined && v > 0);

  const valueStats = {
    total: values.reduce((s, v) => s + v, 0),
    mean: values.length > 0
      ? values.reduce((s, v) => s + v, 0) / values.length
      : 0,
    median: values.length > 0
      ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
      : 0,
    range: values.length > 0
      ? [Math.min(...values), Math.max(...values)] as [number, number]
      : [0, 0] as [number, number],
    disclosed: values.length,
  };

  // Age at acquisition stats
  const ages = acquiredCompanies.map((c) => c.yearAcquired - c.yearFounded)
    .filter((a) => a >= 0);
  const ageAtAcquisitionStats = {
    mean: ages.length > 0 ? ages.reduce((s, v) => s + v, 0) / ages.length : 0,
    median: ages.length > 0
      ? [...ages].sort((a, b) => a - b)[Math.floor(ages.length / 2)]
      : 0,
    min: ages.length > 0 ? Math.min(...ages) : 0,
    max: ages.length > 0 ? Math.max(...ages) : 0,
  };

  // Pure descriptive summary (factual only)
  const topSector = sectorComposition[0];
  const topStage = stageComposition[0];
  const descriptivePattern =
    `Acquired ${acquiredCompanies.length} companies. ` +
    `Most common sector: ${topSector.sector} (${topSector.count} deals, ${
      topSector.percentage.toFixed(0)
    }%). ` +
    `Most common stage: ${
      topStage.stage.replace(/_/g, " ")
    } (${topStage.count} deals). ` +
    `Median age at acquisition: ${ageAtAcquisitionStats.median} years. ` +
    `${values.length} of ${acquiredCompanies.length} acquisitions have disclosed values (median: $${valueStats.median}M).`;

  return {
    acquirerId: acquirer.id,
    acquirerName: acquirer.name,
    totalAcquisitions: acquiredCompanies.length,
    sectorComposition,
    stageComposition,
    geographyComposition,
    valueStats,
    ageAtAcquisitionStats,
    descriptivePattern,
  };
}

// ============================================================================
// 2. DEAL VELOCITY ANALYSIS (Time Series)
// ============================================================================

export interface ExternalEvent {
  year: number;
  type:
    | "ipo"
    | "earnings"
    | "ceo_change"
    | "strategy_announcement"
    | "regulatory";
  description: string;
}

export interface VelocityAnalysis {
  acquirerId: string;
  acquirerName: string;
  yearlyData: {
    year: number;
    count: number;
    cumulative: number;
    value: number;
  }[];

  // Period comparisons
  periods: {
    period: string;
    yearRange: [number, number];
    totalDeals: number;
    avgPerYear: number;
  }[];

  // External events
  events: ExternalEvent[];

  // Trend analysis (with caveats)
  trend: {
    direction: "accelerating" | "decelerating" | "flat" | "noisy";
    slope: number; // deals per year squared
    rSquared: number;
    caveat: string;
  };

  // Pure descriptive
  descriptivePattern: string;
}

export function analyzeVelocity(
  acquirer: Acquirer,
  acquisitions: AcquisitionRecord[],
  externalEvents: ExternalEvent[] = [],
): VelocityAnalysis {
  const acqRecords = acquisitions.filter((a) => a.acquirerId === acquirer.id);

  if (acqRecords.length === 0) {
    return {
      acquirerId: acquirer.id,
      acquirerName: acquirer.name,
      yearlyData: [],
      periods: [],
      events: externalEvents,
      trend: { direction: "noisy", slope: 0, rSquared: 0, caveat: "No data" },
      descriptivePattern: "No acquisitions in dataset",
    };
  }

  // Build yearly data
  const yearCounts = new Map<number, { count: number; value: number }>();
  acqRecords.forEach((a) => {
    const existing = yearCounts.get(a.year) || { count: 0, value: 0 };
    yearCounts.set(a.year, {
      count: existing.count + 1,
      value: existing.value + (a.value || 0),
    });
  });

  const minYear = Math.min(...acqRecords.map((a) => a.year));
  const maxYear = Math.max(...acqRecords.map((a) => a.year));

  const yearlyData: VelocityAnalysis["yearlyData"] = [];
  let cumulative = 0;
  for (let y = minYear; y <= maxYear; y++) {
    const data = yearCounts.get(y) || { count: 0, value: 0 };
    cumulative += data.count;
    yearlyData.push({
      year: y,
      count: data.count,
      cumulative,
      value: data.value,
    });
  }

  // Period analysis (split into halves)
  const midpoint = Math.floor((minYear + maxYear) / 2);
  const earlyPeriod = yearlyData.filter((d) => d.year <= midpoint);
  const latePeriod = yearlyData.filter((d) => d.year > midpoint);

  const periods: VelocityAnalysis["periods"] = [];
  if (earlyPeriod.length > 0) {
    const total = earlyPeriod.reduce((s, d) => s + d.count, 0);
    periods.push({
      period: "Early Period",
      yearRange: [minYear, midpoint],
      totalDeals: total,
      avgPerYear: total / earlyPeriod.length,
    });
  }
  if (latePeriod.length > 0) {
    const total = latePeriod.reduce((s, d) => s + d.count, 0);
    periods.push({
      period: "Late Period",
      yearRange: [midpoint + 1, maxYear],
      totalDeals: total,
      avgPerYear: total / latePeriod.length,
    });
  }

  // Trend regression
  const xs = yearlyData.map((_, i) => i);
  const ys = yearlyData.map((d) => d.count);
  const xMean = xs.reduce((s, v) => s + v, 0) / xs.length;
  const yMean = ys.reduce((s, v) => s + v, 0) / ys.length;
  const numerator = xs.reduce(
    (s, x, i) => s + (x - xMean) * (ys[i] - yMean),
    0,
  );
  const denominator = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const slope = denominator > 0 ? numerator / denominator : 0;

  const ssTotal = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  const ssResidual = ys.reduce(
    (s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2,
    0,
  );
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  let direction: "accelerating" | "decelerating" | "flat" | "noisy";
  if (rSquared < 0.3) direction = "noisy";
  else if (Math.abs(slope) < 0.1) direction = "flat";
  else direction = slope > 0 ? "accelerating" : "decelerating";

  // Caveats based on data quality
  const caveat = acqRecords.length < 5
    ? "Sample too small for reliable trend (n<5)"
    : rSquared < 0.3
    ? "High noise; trend not reliable"
    : "Confounded by market conditions";

  // Descriptive pattern
  let descriptivePattern =
    `Made ${acqRecords.length} acquisitions between ${minYear} and ${maxYear}. `;
  if (periods.length === 2) {
    const change = periods[1].avgPerYear - periods[0].avgPerYear;
    descriptivePattern += `Velocity changed from ${
      periods[0].avgPerYear.toFixed(1)
    }/year in early period to ${
      periods[1].avgPerYear.toFixed(1)
    }/year in late period (${change > 0 ? "+" : ""}${
      change.toFixed(1)
    } difference). `;
  }
  descriptivePattern +=
    `Causality unclear: trends may reflect market conditions, not strategic shift.`;

  return {
    acquirerId: acquirer.id,
    acquirerName: acquirer.name,
    yearlyData,
    periods,
    events: externalEvents,
    trend: { direction, slope, rSquared, caveat },
    descriptivePattern,
  };
}

// ============================================================================
// 3. COMPETITIVE MARKET STRUCTURE (Without Claiming Competition)
// ============================================================================

export interface ContestableTarget {
  companyId: string;
  companyName: string;
  sector: string;
  stage: string;
  yearFounded: number;
  potentialBuyers: {
    acquirerId: string;
    acquirerName: string;
    reason: string;
  }[];
  contestability: "high" | "medium" | "low";
}

export interface MarketStructureResult {
  contestableTargets: ContestableTarget[];
  sectorContestability: {
    sector: string;
    contestable: number;
    total: number;
    rate: number;
  }[];
  caveat: string;
  descriptivePattern: string;
}

export function analyzeMarketStructure(
  acquirers: Acquirer[],
  acquisitions: AcquisitionRecord[],
  companies: AcquiredCompany[],
): MarketStructureResult {
  // Build a map of which sectors each acquirer has bought in
  const acquirerSectorMap = new Map<string, Set<string>>();
  acquisitions.forEach((a) => {
    const company = companies.find((c) => c.id === a.companyId);
    if (!company) return;
    if (!acquirerSectorMap.has(a.acquirerId)) {
      acquirerSectorMap.set(a.acquirerId, new Set());
    }
    acquirerSectorMap.get(a.acquirerId)!.add(company.sector);
  });

  // For each company, find which acquirers could have plausibly bought it
  const contestableTargets: ContestableTarget[] = companies.map((company) => {
    const potentialBuyers: ContestableTarget["potentialBuyers"] = [];

    acquirers.forEach((acquirer) => {
      const acquirerSectors = acquirerSectorMap.get(acquirer.id);
      if (!acquirerSectors) return;

      // Criterion: Same sector AND age compatible
      if (acquirerSectors.has(company.sector)) {
        const age = company.yearAcquired - company.yearFounded;
        if (age <= 8) { // Reasonable age for acquisition
          potentialBuyers.push({
            acquirerId: acquirer.id,
            acquirerName: acquirer.name,
            reason:
              `Previously acquired in ${company.sector}, company age ${age}y compatible`,
          });
        }
      }
    });

    let contestability: "high" | "medium" | "low";
    if (potentialBuyers.length >= 3) contestability = "high";
    else if (potentialBuyers.length === 2) contestability = "medium";
    else contestability = "low";

    return {
      companyId: company.id,
      companyName: company.name,
      sector: company.sector,
      stage: company.stage,
      yearFounded: company.yearFounded,
      potentialBuyers,
      contestability,
    };
  });

  // Sector-level contestability
  const sectorMap = new Map<string, { contestable: number; total: number }>();
  contestableTargets.forEach((t) => {
    if (!sectorMap.has(t.sector)) {
      sectorMap.set(t.sector, { contestable: 0, total: 0 });
    }
    const data = sectorMap.get(t.sector)!;
    data.total++;
    if (t.contestability !== "low") data.contestable++;
  });

  const sectorContestability = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      contestable: data.contestable,
      total: data.total,
      rate: data.total > 0 ? data.contestable / data.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const highContestableCount =
    contestableTargets.filter((t) => t.contestability === "high").length;
  const totalCompanies = companies.length;

  const descriptivePattern =
    `Of ${totalCompanies} companies, ${highContestableCount} have 3+ plausible buyers (high contestability). ` +
    `Most contestable sector: ${sectorContestability[0]?.sector || "N/A"} (${
      (sectorContestability[0]?.rate * 100 || 0).toFixed(0)
    }% rate). ` +
    `Least contestable: ${
      sectorContestability[sectorContestability.length - 1]?.sector || "N/A"
    }.`;

  return {
    contestableTargets,
    sectorContestability,
    caveat:
      "Assumes all buyers have equal interest in all companies. Reality: buyers have internal preferences (unobserved).",
    descriptivePattern,
  };
}

// ============================================================================
// 4. ACQUIRER TYPE VARIATION (Most Reliable)
// ============================================================================

export interface TypeComparisonResult {
  byType: {
    type: string;
    count: number;
    totalAcquisitions: number;
    stageDistribution: { stage: string; count: number; percentage: number }[];
    sectorDistribution: { sector: string; count: number; percentage: number }[];
    valueStats: {
      medianTargetValue: number;
      avgTargetAge: number;
      medianTargetAge: number;
    };
  }[];
  comparativeFindings: string[];
  caveat: string;
}

export function compareAcquirerTypes(
  acquirers: Acquirer[],
  acquisitions: AcquisitionRecord[],
  companies: AcquiredCompany[],
): TypeComparisonResult {
  // Group acquirers by type
  const typeGroups = new Map<string, Acquirer[]>();
  acquirers.forEach((a) => {
    if (!typeGroups.has(a.type)) typeGroups.set(a.type, []);
    typeGroups.get(a.type)!.push(a);
  });

  const byType: TypeComparisonResult["byType"] = [];

  typeGroups.forEach((typeAcquirers, type) => {
    const typeAcquirerIds = new Set(typeAcquirers.map((a) => a.id));
    const typeAcqs = acquisitions.filter((a) =>
      typeAcquirerIds.has(a.acquirerId)
    );
    const typeCompanies = typeAcqs
      .map((a) => companies.find((c) => c.id === a.companyId))
      .filter((c): c is AcquiredCompany => c !== undefined);

    if (typeCompanies.length === 0) return;

    // Stage distribution
    const stageCounts = new Map<string, number>();
    typeCompanies.forEach((c) =>
      stageCounts.set(c.stage, (stageCounts.get(c.stage) || 0) + 1)
    );
    const stageDistribution = Array.from(stageCounts.entries())
      .map(([stage, count]) => ({
        stage,
        count,
        percentage: (count / typeCompanies.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Sector distribution
    const sectorCounts = new Map<string, number>();
    typeCompanies.forEach((c) =>
      sectorCounts.set(c.sector, (sectorCounts.get(c.sector) || 0) + 1)
    );
    const sectorDistribution = Array.from(sectorCounts.entries())
      .map(([sector, count]) => ({
        sector,
        count,
        percentage: (count / typeCompanies.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Value stats
    const values = typeCompanies.map((c) => c.acquisitionValue).filter((
      v,
    ): v is number => v !== undefined && v > 0);
    const ages = typeCompanies.map((c) => c.yearAcquired - c.yearFounded)
      .filter((a) => a >= 0);

    byType.push({
      type,
      count: typeAcquirers.length,
      totalAcquisitions: typeCompanies.length,
      stageDistribution,
      sectorDistribution,
      valueStats: {
        medianTargetValue: values.length > 0
          ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
          : 0,
        avgTargetAge: ages.length > 0
          ? ages.reduce((s, v) => s + v, 0) / ages.length
          : 0,
        medianTargetAge: ages.length > 0
          ? [...ages].sort((a, b) => a - b)[Math.floor(ages.length / 2)]
          : 0,
      },
    });
  });

  // Generate comparative findings (descriptive only)
  const findings: string[] = [];

  // Compare strategic healthcare vs PE on stage
  const strategic = byType.find((t) => t.type === "strategic_healthcare");
  const pe = byType.find((t) => t.type === "private_equity");

  if (strategic && pe) {
    const stratLateStage = strategic.stageDistribution
      .filter((s) =>
        ["series_b", "series_c", "series_d_plus", "public"].includes(s.stage)
      )
      .reduce((sum, s) => sum + s.percentage, 0);
    const peLateStage = pe.stageDistribution
      .filter((s) =>
        ["series_b", "series_c", "series_d_plus", "public"].includes(s.stage)
      )
      .reduce((sum, s) => sum + s.percentage, 0);

    if (stratLateStage > peLateStage + 15) {
      findings.push(
        `Strategic healthcare acquirers focus more on late-stage (${
          stratLateStage.toFixed(0)
        }%) than PE (${peLateStage.toFixed(0)}%)`,
      );
    } else if (peLateStage > stratLateStage + 15) {
      findings.push(
        `PE acquirers focus more on late-stage (${
          peLateStage.toFixed(0)
        }%) than strategic (${stratLateStage.toFixed(0)}%)`,
      );
    }
  }

  // Compare tech vs healthcare on sectors
  const tech = byType.find((t) => t.type === "strategic_tech");
  const health = byType.find((t) => t.type === "strategic_healthcare");

  if (tech && health) {
    const techSectorDiversity = tech.sectorDistribution.length;
    const healthSectorDiversity = health.sectorDistribution.length;

    if (Math.abs(techSectorDiversity - healthSectorDiversity) >= 2) {
      const moreSpread = techSectorDiversity > healthSectorDiversity
        ? "tech"
        : "healthcare";
      findings.push(
        `${moreSpread} acquirers span more sectors (${
          moreSpread === "tech" ? techSectorDiversity : healthSectorDiversity
        } vs ${
          moreSpread === "tech" ? healthSectorDiversity : techSectorDiversity
        })`,
      );
    }
  }

  // Median values
  byType.forEach((t) => {
    if (t.valueStats.medianTargetValue > 0) {
      findings.push(
        `${
          t.type.replace(/_/g, " ")
        } median target value: $${t.valueStats.medianTargetValue}M (n=${t.totalAcquisitions})`,
      );
    }
  });

  return {
    byType,
    comparativeFindings: findings,
    caveat:
      "Sample sizes per type are small. Comparisons descriptive only; not statistically tested.",
  };
}
