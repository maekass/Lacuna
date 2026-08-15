import { describe, expect, it } from "vitest";
import {
  adjacencyExclusionMillions,
  type AggregationParams,
  announcedFromIsoDay,
  ART_FERTILITY_UNCONFIRMED,
  asClinicalComparable,
  asCompletedDeal,
  asTransactionTarget,
  benchmarkAgainst,
  type ClassifierMeasurement,
  compareIntervals,
  completedDealsOf,
  completedExitDisclosedTotalMillions,
  COOK_COOPERSURGICAL_TERMINATED,
  type CoverageRatio,
  dayPrecisionToDate,
  dealsFromVerifiedDataset,
  DEFAULT_CLINICAL_COMPARABLES,
  disclosedOnlyTotal,
  type EvidenceGapMeasurement,
  formatDisclosedBillions,
  isComparable,
  type LacunaDeal,
  liveDisclosedStats,
  prevalenceAdjustPpv,
  rankMeasurements,
  timeSeries,
  toInterval,
} from "@/lib/data/lacunaDataset";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { aoaDxCoverage } from "@/lib/data/lacunaDataset/samplingFrame";

const coverage: CoverageRatio = aoaDxCoverage({ lacunaDealCount: 10 });

function baseParams(
  overrides: Partial<AggregationParams> = {},
): AggregationParams {
  return {
    womensHealthOnly: true,
    minTier: "market_research",
    completedOnly: true,
    concentrationWarnShare: 0.4,
    adjacencyWarnShare: 0.25,
    coverage,
    ...overrides,
  };
}

/** Curated fixture totaling $18.3B WH + $23.0B adjacency disclosed. */
function eighteenThreeAndTwentyThree(): LacunaDeal[] {
  const completed = (
    id: string,
    name: string,
    millions: number,
    scope: LacunaDeal["scope"],
    tier: LacunaDeal["valueTier"] = "sec_filing",
  ): LacunaDeal => ({
    id,
    targetId: `t-${id}`,
    acquirerId: `a-${id}`,
    targetName: name,
    acquirerName: "Fixture Buyer",
    announced: { precision: "day", date: "2021-06-01" },
    dealValueMillions: millions,
    valueTier: tier,
    scope,
    source: "SEC 8-K fixture",
    statusHistory: [
      {
        status: "announced",
        statusAsOf: "2021-01-01",
        statusSource: "fixture",
      },
      {
        status: "completed",
        statusAsOf: "2021-06-01",
        statusSource: "fixture",
      },
    ],
  });

  return [
    completed("wh-a", "WH Alpha", 10000, "womens_health"),
    completed("wh-b", "WH Beta", 5300, "womens_health"),
    completed("wh-c", "WH Gamma", 3000, "womens_health"),
    completed("adj-a", "Adj Alpha", 21000, "adjacency"),
    completed("adj-b", "Adj Beta", 2000, "adjacency"),
    COOK_COOPERSURGICAL_TERMINATED,
    ART_FERTILITY_UNCONFIRMED,
  ];
}

describe("deal lifecycle (prompt 3)", () => {
  it("brands Cook/CooperSurgical as non-completed (terminated fixture)", () => {
    expect(asCompletedDeal(COOK_COOPERSURGICAL_TERMINATED)).toBeNull();
    expect(
      completedDealsOf([COOK_COOPERSURGICAL_TERMINATED]),
    ).toHaveLength(0);
  });

  it("excludes ART Fertility unconfirmed from completed-exit totals", () => {
    expect(asCompletedDeal(ART_FERTILITY_UNCONFIRMED)).toBeNull();
    const completed = completedDealsOf([
      COOK_COOPERSURGICAL_TERMINATED,
      ART_FERTILITY_UNCONFIRMED,
      ...eighteenThreeAndTwentyThree().filter((d) =>
        d.id.startsWith("wh-") || d.id.startsWith("adj-")
      ),
    ]);
    expect(
      completedExitDisclosedTotalMillions(completed),
    ).toBe(18300 + 23000);
  });

  it("excludes live deal12 (Cook) from completed WH disclosed total", () => {
    const stats = liveDisclosedStats(getStaticVerifiedDataset());
    expect(stats.womensHealth.excludedDealIds).toContain("deal12");
  });
});

describe("estimand-named aggregation (prompt 1)", () => {
  it("asserts $18.3B women's-health disclosed-only on the curated fixture", () => {
    const deals = eighteenThreeAndTwentyThree();
    const result = disclosedOnlyTotal(deals, baseParams());
    expect(result.estimand).toBe("disclosed_only_observed_sum");
    expect(result.disclosedOnlyTotalMillions).toBe(18300);
    expect(formatDisclosedBillions(result.disclosedOnlyTotalMillions)).toBe(
      "$18.3B",
    );
  });

  it("asserts $23B adjacency exclusion on the curated fixture", () => {
    const deals = eighteenThreeAndTwentyThree();
    const excluded = adjacencyExclusionMillions(deals, baseParams());
    expect(excluded).toBe(23000);
    expect(formatDisclosedBillions(excluded)).toBe("$23.0B");
  });

  it("records caller thresholds and emits concentration warnings when asked", () => {
    const deals = eighteenThreeAndTwentyThree();
    const result = disclosedOnlyTotal(
      deals,
      baseParams({ concentrationWarnShare: 0.5, adjacencyWarnShare: 0.01 }),
    );
    // WH-only run: adjacency share is 0, but concentration on 10/18.3 > 50%
    expect(result.warnings.some((w) => w.includes("Concentration risk"))).toBe(
      true,
    );
    expect(result.params.concentrationWarnShare).toBe(0.5);
    expect(result.provenanceMix.sec_filing).toBeCloseTo(1, 5);
  });

  it("live WH disclosed-only matches pinned millions", () => {
    const stats = liveDisclosedStats(getStaticVerifiedDataset());
    expect(stats.womensHealth.disclosedOnlyTotalMillions).toBe(22104);
    expect(stats.adjacencyExcludedMillions).toBe(118150);
  });
});

describe("date precision (prompt 2)", () => {
  it("toInterval expands month and year bounds", () => {
    expect(toInterval({ precision: "day", date: "2023-04-15" })).toEqual([
      "2023-04-15",
      "2023-04-15",
    ]);
    expect(toInterval({ precision: "month", yearMonth: "2023-02" })).toEqual([
      "2023-02-01",
      "2023-02-28",
    ]);
    expect(toInterval({ precision: "year", year: 2023 })).toEqual([
      "2023-01-01",
      "2023-12-31",
    ]);
  });

  it("toInterval rejects impossible months instead of fabricating a range", () => {
    expect(() => toInterval({ precision: "month", yearMonth: "2024-13" }))
      .toThrow("Invalid yearMonth: 2024-13");
    expect(() => toInterval({ precision: "month", yearMonth: "2024-00" }))
      .toThrow("Invalid yearMonth: 2024-00");
  });

  it("timeSeries returns excluded rows instead of dropping them", () => {
    const deals: LacunaDeal[] = [
      {
        ...eighteenThreeAndTwentyThree()[0]!,
        id: "day-deal",
        announced: announcedFromIsoDay("2022-03-04"),
      },
      {
        ...ART_FERTILITY_UNCONFIRMED,
        id: "year-deal",
      },
    ];
    const series = timeSeries(deals, "day");
    expect(series.buckets).toHaveLength(1);
    expect(series.excluded).toHaveLength(1);
    expect(series.excluded[0]?.dealId).toBe("year-deal");
  });

  it("compareIntervals returns indeterminate on overlap", () => {
    const order = compareIntervals(
      toInterval({ precision: "month", yearMonth: "2023-01" }),
      toInterval({ precision: "day", date: "2023-01-15" }),
    );
    expect(order.kind).toBe("indeterminate");
  });

  it("dayPrecisionToDate only accepts day precision", () => {
    const d = dayPrecisionToDate({ precision: "day", date: "2020-01-02" });
    expect(d.toISOString().startsWith("2020-01-02")).toBe(true);
  });
});

describe("clinical assets + measurements (prompts 5–6)", () => {
  it("benchmarks a transaction target against comparables", () => {
    const target = asTransactionTarget(
      {
        id: "asset-1",
        name: "Acquired Dx",
        indication: "preeclampsia",
        evidenceRung: "clinical_validation",
      },
      "deal7",
    );
    const delta = benchmarkAgainst(target, DEFAULT_CLINICAL_COMPARABLES);
    expect(delta.comparableCount).toBe(3);
    expect(delta.deltaVsMedian).toBeLessThan(0);
  });

  it("refuses to treat a comparable as a transaction at the factory", () => {
    expect(() =>
      asClinicalComparable({
        id: "x",
        name: "Natera",
        indication: "NIPT",
        evidenceRung: "guidelines_adopted",
        // @ts-expect-error dealId forbidden on comparables
        dealId: "deal-x",
      })
    ).toThrow(/must not have a dealId/);
  });

  it("isComparable flags threshold/population mismatches", () => {
    const a: EvidenceGapMeasurement = {
      kind: "ppv",
      evidenceGap: true,
      endpoint: "sFlt-1:PlGF",
      threshold: "38",
      value: 0.8,
      population: { label: "ambulatory EU", careSetting: "outpatient" },
      studyDesign: "cohort",
    };
    const b: EvidenceGapMeasurement = {
      kind: "ppv",
      evidenceGap: true,
      endpoint: "sFlt-1:PlGF",
      threshold: ">=40",
      value: 0.85,
      population: { label: "hospitalized US", careSetting: "inpatient" },
      studyDesign: "cohort",
    };
    const cmp = isComparable(a, b);
    expect(cmp.ok).toBe(false);
    expect(() => rankMeasurements([a, b])).toThrow(/incomparable/);
  });

  it("prevalenceAdjustPpv requires ClassifierMeasurement (sens/spec)", () => {
    const m: ClassifierMeasurement = {
      kind: "classifier",
      evidenceGap: false,
      endpoint: "sFlt-1:PlGF",
      threshold: "38",
      value: 0.8,
      sensitivity: 0.9,
      specificity: 0.95,
      prevalence: 0.05,
      population: { label: "study", prevalence: 0.05 },
      studyDesign: "cohort",
    };
    const adjusted = prevalenceAdjustPpv(m, 0.02);
    expect(adjusted).toBeGreaterThan(0);
    expect(adjusted).toBeLessThan(m.value);
  });
});

describe("verified adapter", () => {
  it("loads annotated deals from the static dataset", () => {
    const deals = dealsFromVerifiedDataset(getStaticVerifiedDataset());
    expect(deals.length).toBeGreaterThan(50);
    expect(deals.some((d) => d.scope === "adjacency")).toBe(true);
  });
});
