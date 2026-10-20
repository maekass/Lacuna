import { describe, expect, it } from "vitest";
import computedSummary from "@/data/computed-dataset-summary.json";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { dealsFromVerifiedDataset } from "@/lib/data/lacunaDataset/fromVerified";
import {
  announcedYear,
  AOA_DX_FRAME,
  aoaDxCoverage,
  countInAoaDxFrame,
  isInAoaDxFrame,
} from "@/lib/data/lacunaDataset/samplingFrame";
import { liveDisclosedStats } from "@/lib/data/lacunaDataset/liveStats";
import { observedCatalogComposition } from "@/lib/quant/observedExitRates";

/**
 * AOA Dx "Follow the Exits" examines 272 announced exits over 2000–2024; its
 * 276 headline adds 4 highlighted 2025 exits without a full 2025 analysis.
 * Coverage must count only Lacuna deals announced inside that frame.
 */
describe("AOA Dx coverage frame", () => {
  const dataset = getStaticVerifiedDataset();
  const deals = dealsFromVerifiedDataset(dataset);
  const outOfFrame = dataset.acquisitions
    .filter((deal) => !isInAoaDxFrame(Number(deal.announcedDate.slice(0, 4))))
    .map((deal) => deal.id)
    .sort();

  it("pins the sourced frame: 272 exits, 2000–2024", () => {
    expect(AOA_DX_FRAME).toEqual({
      name: "AOA Dx Follow the Exits (2000–2024)",
      startYear: 2000,
      endYear: 2024,
      referenceCount: 272,
    });
  });

  it("reads the announcement year at every stored precision", () => {
    expect(announcedYear({ precision: "day", date: "2024-12-31" })).toBe(2024);
    expect(announcedYear({ precision: "month", yearMonth: "2025-01" })).toBe(
      2025,
    );
    expect(announcedYear({ precision: "year", year: 2000 })).toBe(2000);
  });

  it("includes 2000 and 2024 and excludes 1999, 2025 and 2026", () => {
    expect([1999, 2000, 2024, 2025, 2026].map(isInAoaDxFrame)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });

  it("excludes exactly the 2025–2026 deals from the numerator", () => {
    expect(outOfFrame).toEqual(["deal18", "deal50", "deal60"]);
    expect(countInAoaDxFrame(deals)).toBe(dataset.acquisitions.length - 3);
    expect(countInAoaDxFrame(deals)).toBe(57);
  });

  it("publishes 57/272 in the headline and the live stats", () => {
    const coverage = liveDisclosedStats(dataset).womensHealth.coverage;
    expect(coverage.numerator).toBe(57);
    expect(coverage.denominator).toBe(272);
    expect(coverage.rate).toBeCloseTo(57 / 272, 12);
    expect(computedSummary.headline.coverageNumerator).toBe(57);
    expect(computedSummary.headline.coverageDenominator).toBe(272);
    expect(computedSummary.headline.coverageRate).toBeCloseTo(57 / 272, 12);
    expect(computedSummary.headline.coverageReferenceName).toBe(
      AOA_DX_FRAME.name,
    );
  });

  it("uses the same in-frame numerator for catalog coverage", () => {
    const { catalogCoverage } = observedCatalogComposition(dataset);
    expect(catalogCoverage.successes).toBe(57);
    expect(catalogCoverage.sampleSize).toBe(272);
  });

  it("passes the in-frame count through and states the frame caveat", () => {
    const coverage = aoaDxCoverage({ inFrameDealCount: 10 });
    expect(coverage.numerator).toBe(10);
    expect(coverage.denominator).toBe(272);
    expect(coverage.caveats.join(" ")).toContain("announced 2000–2024");
  });

  it("labels a caller-supplied overlap count as record-matched", () => {
    const matched = aoaDxCoverage({
      inFrameDealCount: 57,
      observedOverlapCount: 40,
    });
    expect(matched.numerator).toBe(40);
    expect(matched.referenceFrameNote).toContain("record-matched overlap count");
    expect(matched.referenceFrameNote).not.toContain("not record-matched");
    expect(matched.caveats.join(" ")).not.toContain("not record-matched");
    const unmatched = aoaDxCoverage({ inFrameDealCount: 57 });
    expect(unmatched.referenceFrameNote).toContain("not record-matched");
    expect(unmatched.caveats.join(" ")).toContain("not record-matched");
  });
});
