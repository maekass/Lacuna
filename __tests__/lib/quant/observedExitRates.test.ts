import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { isSufficient } from "@/lib/quant/estimators";
import {
  CATALOG_COMPOSITION_LABEL,
  observedCatalogComposition,
} from "@/lib/quant/observedExitRates";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("observedCatalogComposition", () => {
  const dataset = getStaticVerifiedDataset();
  const composition = observedCatalogComposition(dataset);

  it("labels the surface as observed catalog composition", () => {
    expect(composition.label).toBe(CATALOG_COMPOSITION_LABEL);
  });

  it("reports 59/150 with Wilson bounds to 4dp", () => {
    expect(composition.overall.successes).toBe(59);
    expect(composition.overall.sampleSize).toBe(150);
    expect(isSufficient(composition.overall.share)).toBe(true);
    if (isSufficient(composition.overall.share)) {
      expect(composition.overall.share.value).toBeCloseTo(59 / 150, 10);
      expect(composition.overall.share.confidenceInterval[0]).toBeCloseTo(
        0.3188,
        4,
      );
      expect(composition.overall.share.confidenceInterval[1]).toBeCloseTo(
        0.4732,
        4,
      );
    }
  });

  it("gates sectors with fewer than 5 events", () => {
    for (const sector of composition.sectors) {
      if (sector.successes < 5) {
        expect(isSufficient(sector.share)).toBe(false);
        expect(sector.interval).toBeNull();
      } else {
        expect(isSufficient(sector.share)).toBe(true);
        expect(sector.interval).not.toBeNull();
      }
      expect(sector.caveat.length).toBeGreaterThan(0);
    }
  });

  it("carries a non-empty caveat on every returned object", () => {
    expect(composition.overall.caveat.length).toBeGreaterThan(0);
    expect(composition.catalogCoverage.caveat.length).toBeGreaterThan(0);
    for (const sector of composition.sectors) {
      expect(sector.caveat.length).toBeGreaterThan(0);
    }
  });

  it("does not use forecast language in the module source", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../../src/lib/quant/observedExitRates.ts"),
      "utf8",
    );
    expect(source.toLowerCase()).not.toMatch(/probab|likelihood|predict/);
  });
});
