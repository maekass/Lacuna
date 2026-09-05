import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAcquisitionQuality,
  getCompanyQuality,
  getDataQualityScores,
} from "@/lib/data/dataQualityScores";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  computeMetricPublicationCensus,
  computeVintageCensus,
  countReproduciblePremiums,
  formatQualityVisibilityMarkdown,
  normalizeGradeCounts,
  summarizeDisplayProvenance,
} from "@/lib/data/qualityVisibility";
import { getQualityVisibility } from "@/lib/data/qualityVisibilityProvider";

const ROOT = path.resolve(__dirname, "../../..");

describe("quality visibility census", () => {
  it("src reads the computed quality-score artifact", () => {
    const scores = getDataQualityScores();
    expect(scores.companies.length).toBe(scores.summary.companies.total);
    expect(scores.acquisitions.length).toBe(scores.summary.acquisitions.total);
    expect(getCompanyQuality(scores.companies[0].id)?.id).toBe(
      scores.companies[0].id,
    );
    expect(getAcquisitionQuality(scores.acquisitions[0].id)?.id).toBe(
      scores.acquisitions[0].id,
    );
  });

  it("fills missing letter grades with zero", () => {
    expect(normalizeGradeCounts({ A: 2, C: 1 })).toEqual({
      A: 2,
      B: 0,
      C: 1,
      D: 0,
      F: 0,
    });
  });

  it("counts dedicated as-of only for pre-deal valuation dates", () => {
    const census = computeVintageCensus({
      companies: [
        { lastKnownValuation: 100 },
        { totalFunding: 10 },
        {},
      ],
      acquisitions: [
        {
          dealValue: 200,
          announcedDate: "2021-01-01",
          preDealValuation: 150,
          preDealValuationDate: "2020-06-01",
        },
        { preDealValuation: 80, preDealValuationDate: "2019-01-01" },
        { dealValue: 50, announcedDate: "2022-02-02" },
      ],
    });
    expect(census.companyPrimary).toEqual({
      total: 2,
      withDedicatedAsOf: 0,
    });
    expect(census.dealValues).toEqual({
      total: 2,
      withEventDate: 2,
      withValueAsOf: 0,
    });
    expect(census.preDealValuations).toEqual({
      total: 2,
      withDedicatedAsOf: 2,
    });
    expect(census.primaryNumbers).toBe(5);
    expect(census.dedicatedAsOf).toBe(1);
    expect(census.missingDedicatedAsOf).toBe(4);
  });

  it("reproduces curated premiums from dealValue / preDealValuation", () => {
    const counts = countReproduciblePremiums([
      { dealValue: 200, preDealValuation: 100, computedPremium: 2 },
      { dealValue: 13900, preDealValuation: 10500, computedPremium: 1.32 },
      { dealValue: 150, preDealValuation: 100, computedPremium: 1.4 },
      { dealValue: 10, preDealValuation: 10 },
    ]);
    expect(counts).toEqual({ computed: 3, reproducible: 2 });
  });

  it("counts published and withheld gated metrics from artifact slices", () => {
    const census = computeMetricPublicationCensus({
      benchmarks: {
        benchmarks: [{
          sector: "All sectors",
          label: "Median sector MOIC",
          definition: "MOIC",
          unit: "x",
          medianMoic: {
            kind: "sufficient",
            value: 2,
            sampleSize: 7,
            confidenceInterval: [1, 3],
            lineage: { metricId: "sector.moic.median" },
          },
        }],
        withheld: [{}, {}],
      },
      premiums: {
        premiumMetrics: {
          "acquirer.premium.preDealValuation": {
            metricId: "acquirer.premium.preDealValuation",
            estimate: {
              kind: "sufficient",
              value: 1.3,
              sampleSize: 47,
              confidenceInterval: [1.2, 1.4],
              lineage: { metricId: "acquirer.premium.preDealValuation" },
            },
          },
        },
        acquirerPremiums: [{
          acquirerName: "Hologic",
          metricId: "acquirer.premium.preDealValuation",
          estimate: {
            kind: "sufficient",
            value: 1.5,
            sampleSize: 9,
            confidenceInterval: [1.3, 1.6],
            lineage: { metricId: "acquirer.premium.preDealValuation" },
          },
        }],
        withheld: [{}],
      },
      confidenceIntervals: {
        results: [{
          metricId: "sector.moic.median",
          scope: "All sectors",
          estimate: {
            kind: "sufficient",
            value: 2,
            sampleSize: 7,
            confidenceInterval: [1, 3],
            lineage: { metricId: "sector.moic.median" },
          },
        }],
        withheld: [{}, {}],
      },
      correlations: { sectors: [], withheld: [{}] },
    });
    expect(census.published).toBe(4);
    expect(census.withheld).toBe(6);
    expect(census.registered).toBe(10);
    expect(census.publishedWithFullProvenance).toBe(4);
  });

  it("summarizes the display-provenance baseline without the site list", () => {
    const summary = summarizeDisplayProvenance({
      total: 10,
      covered: 1,
      exempt: 1,
      uncovered: 8,
      perFileUncovered: {
        "src/b.tsx": 2,
        "src/a.tsx": 5,
        "src/c.tsx": 1,
      },
    });
    expect(summary.uncoveredRate).toBe(0.8);
    expect(summary.topUncoveredFiles[0]).toEqual({
      file: "src/a.tsx",
      count: 5,
    });
  });

  it("matches live verified-dataset vintage and premium reproducibility", () => {
    const dataset = getStaticVerifiedDataset();
    const vintage = computeVintageCensus(dataset);
    const premiums = countReproduciblePremiums(dataset.acquisitions);
    const visibility = getQualityVisibility();
    expect(visibility.vintage.primaryNumbers).toBe(vintage.primaryNumbers);
    expect(visibility.premiums).toEqual(premiums);
    expect(premiums.computed).toBeGreaterThan(0);
    expect(premiums.reproducible).toBe(premiums.computed);
  });

  it("formats a GitHub summary that names the four gaps", () => {
    const markdown = formatQualityVisibilityMarkdown(getQualityVisibility());
    expect(markdown).toContain("<!-- lacuna-quality-visibility -->");
    expect(markdown).toContain("Gated metrics");
    expect(markdown).toContain("Vintage");
    expect(markdown).toContain("Display provenance");
    expect(markdown).toContain("Quality grades");
  });

  it("pipeline status no longer invents stage durations", () => {
    const source = readFileSync(
      path.join(ROOT, "src/components/DataPipelineStatus.tsx"),
      "utf8",
    );
    expect(source).toContain("DataQualityVisibility");
    expect(source).not.toMatch(/durationMs:\s*\d+/);
    expect(source).not.toMatch(/Math\.floor\(dealsCount/);
  });
});
