import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

describe("catalog selection provenance", () => {
  const dataset = getStaticVerifiedDataset();

  it("gives every company a catalogEntryReason and outcomeType", () => {
    expect(dataset.companies).toHaveLength(150);
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
    expect(acquired).toHaveLength(dataset.acquisitions.length);
    expect(acquired).toHaveLength(59);
  });

  it("does not impute founding years", () => {
    for (const company of dataset.companies) {
      if (company.foundedPrecision === "unknown") {
        expect(company.founded).toBeUndefined();
      }
    }
  });
});
