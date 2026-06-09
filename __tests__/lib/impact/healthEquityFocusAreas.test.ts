import { describe, expect, it } from "vitest";
import verifiedJson from "@/data/dataset.verified.json";
import { EPIDEMIOLOGY_DATABASE } from "@/lib/impact/oaisCalculator";
import {
  HEALTH_EQUITY_FOCUS_AREAS,
  type HealthEquityDataTier,
  type HealthEquityFocusArea,
} from "@/lib/impact/healthEquityFocusAreas";

const VALID_TIERS: HealthEquityDataTier[] = [
  "cited_epidemiology",
  "illustrative_static",
];

function assertFocusAreaShape(area: HealthEquityFocusArea): void {
  expect(area.id).toMatch(/^[a-z0-9-]+$/);
  expect(area.title.length).toBeGreaterThan(0);
  expect(area.summary.length).toBeGreaterThan(0);
  expect(area.disparityLabel.length).toBeGreaterThan(0);
  expect(VALID_TIERS).toContain(area.dataTier);
  expect(area.source.length).toBeGreaterThan(0);
  expect(area.relatedSectors.length).toBeGreaterThan(0);
}

describe("HEALTH_EQUITY_FOCUS_AREAS", () => {
  it("defines a non-empty catalog with unique ids (success)", () => {
    expect(HEALTH_EQUITY_FOCUS_AREAS.length).toBeGreaterThan(0);
    const ids = HEALTH_EQUITY_FOCUS_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each focus area satisfies structural invariants (success)", () => {
    for (const area of HEALTH_EQUITY_FOCUS_AREAS) {
      assertFocusAreaShape(area);
    }
  });

  it("cited epidemiology rows link to EPIDEMIOLOGY_DATABASE conditions (success)", () => {
    const cited = HEALTH_EQUITY_FOCUS_AREAS.filter((a) =>
      a.dataTier === "cited_epidemiology"
    );
    expect(cited.length).toBeGreaterThan(0);

    for (const area of cited) {
      expect(area.epidemiologyCondition).toBeTruthy();
      const match = EPIDEMIOLOGY_DATABASE.find((e) =>
        e.condition === area.epidemiologyCondition
      );
      expect(
        match,
        `missing epidemiology row for ${area.epidemiologyCondition}`,
      ).toBeDefined();
      if (area.sourceYear !== undefined) {
        expect(area.sourceYear).toBeGreaterThanOrEqual(2000);
      }
    }
  });

  it("illustrative rows omit epidemiologyCondition (edge)", () => {
    const illustrative = HEALTH_EQUITY_FOCUS_AREAS.filter((a) =>
      a.dataTier === "illustrative_static"
    );
    expect(illustrative.length).toBeGreaterThan(0);
    for (const area of illustrative) {
      expect(area.epidemiologyCondition).toBeUndefined();
      expect(area.source.toLowerCase()).toContain("illustrative");
    }
  });

  it("related sectors align with verified dataset sector vocabulary (edge)", () => {
    const knownSectors = new Set([
      ...verifiedJson.companies.map((c) => c.sector),
      ...verifiedJson.acquirers.map((a) => a.sector),
    ]);
    for (const area of HEALTH_EQUITY_FOCUS_AREAS) {
      for (const sector of area.relatedSectors) {
        expect(
          knownSectors.has(sector),
          `unexpected sector ${sector} on ${area.id}`,
        ).toBe(true);
      }
    }
  });
});
