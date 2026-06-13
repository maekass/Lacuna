import { describe, expect, it } from "vitest";
import {
  bootstrap,
  degreeDistribution,
  giniCoefficient,
  herfindahlIndex,
  networkDensity,
  type NetworkEdge,
  type NetworkNode,
  nullModelComparison,
  temporalAnalysis,
} from "@/lib/network/networkStatistics";

const nodes: NetworkNode[] = [
  { id: "c1", label: "Modern Fertility", type: "company", sector: "Fertility" },
  { id: "a1", label: "Ro", type: "acquirer", sector: "General Wellness" },
  { id: "c2", label: "Maven Clinic", type: "company", sector: "Fertility" },
];

const edges: NetworkEdge[] = [
  { source: "a1", target: "c1", type: "acquisition", year: 2021 },
  { source: "a1", target: "c2", type: "acquisition", year: 2022 },
];

describe("bootstrap", () => {
  it("returns CI for non-empty sample (success)", () => {
    const result = bootstrap(
      [1, 2, 3, 4, 5],
      (s) => s.reduce((a, b) => a + b, 0) / s.length,
      200,
    );
    expect(result.numSamples).toBe(200);
    expect(result.lower).toBeLessThanOrEqual(result.estimate);
    expect(result.upper).toBeGreaterThanOrEqual(result.estimate);
  });

  it("returns zeros for empty input (edge)", () => {
    const result = bootstrap([], (s) => s.length);
    expect(result).toEqual({
      estimate: 0,
      lower: 0,
      upper: 0,
      median: 0,
      iqr: [0, 0],
      numSamples: 0,
    });
  });
});

describe("degreeDistribution", () => {
  it("counts undirected degrees (success)", () => {
    const dist = degreeDistribution(nodes, edges);
    expect(dist.degrees.get("a1")).toBe(2);
    expect(dist.max).toBe(2);
    expect(dist.distribution.length).toBe(3);
  });

  it("handles graph with no edges (edge)", () => {
    const dist = degreeDistribution(nodes, []);
    expect(dist.mean).toBe(0);
    expect(dist.max).toBe(0);
  });
});

describe("networkDensity", () => {
  it("computes undirected density for small graph (success)", () => {
    const result = networkDensity(100, 10, false);
    expect(result.density).toBeLessThan(0.1);
    expect(result.interpretation).toContain("Sparse");
  });

  it("returns zero density for single node (edge)", () => {
    const result = networkDensity(1, 0);
    expect(result.density).toBe(0);
    expect(result.interpretation).toBe("Too few nodes");
  });
});

describe("giniCoefficient", () => {
  it("detects inequality in skewed values (success)", () => {
    const result = giniCoefficient([1, 1, 1, 10]);
    expect(result.gini).toBeGreaterThan(0.3);
    expect(result.topConcentration.top1).toBeGreaterThan(0.5);
  });

  it("returns neutral result for empty array (edge)", () => {
    const result = giniCoefficient([]);
    expect(result.gini).toBe(0);
    expect(result.interpretation).toBe("No data");
  });

  it("handles all-zero values (edge)", () => {
    const result = giniCoefficient([0, 0, 0]);
    expect(result.gini).toBe(0);
    expect(result.interpretation).toBe("No values");
  });
});

describe("herfindahlIndex", () => {
  it("classifies concentrated market shares (success)", () => {
    const result = herfindahlIndex([70, 20, 10]);
    expect(result.hhi).toBeGreaterThan(1500);
    expect(result.doj_classification).toBe("highly_concentrated");
  });

  it("returns unconcentrated for empty sum (edge)", () => {
    const result = herfindahlIndex([]);
    expect(result.hhi).toBe(0);
    expect(result.doj_classification).toBe("unconcentrated");
  });
});

describe("nullModelComparison", () => {
  it("compares observed concentration to random baseline (success)", () => {
    const result = nullModelComparison([10, 2, 1, 1], 100);
    expect(result.observed.gini).toBeGreaterThan(0);
    expect(result.randomBaseline.gini.mean).toBeGreaterThanOrEqual(0);
    expect(result.interpretation).toBeTruthy();
  });

  it("returns no-data interpretation for empty values (edge)", () => {
    const result = nullModelComparison([]);
    expect(result.interpretation).toBe("No data");
  });
});

describe("temporalAnalysis", () => {
  it("aggregates acquisition counts by year (success)", () => {
    const result = temporalAnalysis(edges);
    expect(result.totalAcquisitions).toBe(2);
    expect(result.yearlyData.some((y) => y.year === 2021 && y.count === 1))
      .toBe(true);
    expect(result.yearRange[0]).toBe(2021);
  });

  it("returns insufficient_data when edges lack years (edge)", () => {
    const result = temporalAnalysis([{ source: "a1", target: "c1" }]);
    expect(result.totalAcquisitions).toBe(0);
    expect(result.trend.confidence).toBe("insufficient_data");
    expect(result.caveats).toContain("No temporal data available");
  });
});
