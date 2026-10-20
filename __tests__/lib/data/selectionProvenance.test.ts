import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

describe("catalog selection provenance", () => {
  const dataset = getStaticVerifiedDataset();

  it("gives every company a catalogEntryReason and outcomeType", () => {
    expect(dataset.companies).toHaveLength(151);
    for (const company of dataset.companies) {
      expect(company.catalogEntryReason).toBeDefined();
      expect(company.outcomeType).toBeDefined();
      expect(company.foundedPrecision).toBeDefined();
    }
  });

  it("matches acquired outcomes to the acquisitions array", () => {
    const acquired = dataset.companies.filter((c) =>
      c.outcomeType === "acquired"
    );
    // One company can be the target of several deals (c151: deal60, deal61),
    // so acquired outcomes match distinct targets, not the deal count.
    const targetIds = new Set(dataset.acquisitions.map((d) => d.targetId));
    expect(acquired.map((c) => c.id).sort()).toEqual([...targetIds].sort());
    expect(acquired).toHaveLength(60);
    expect(dataset.acquisitions).toHaveLength(61);
  });

  it("does not impute founding years", () => {
    for (const company of dataset.companies) {
      if (company.foundedPrecision === "unknown") {
        expect(company.founded).toBeUndefined();
      }
    }
  });
});
