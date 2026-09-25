import { describe, expect, it } from "vitest";
import { buildPredictions } from "@/components/ExitPredictor";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { minimalVerifiedDataset } from "../helpers/fixtures";

describe("Exit Similarity Explorer age factor", () => {
  it("compares candidate age to event-time precedents and withholds missing ages", () => {
    const target = minimalVerifiedDataset.companies.find((c) =>
      c.id === "c24"
    )!;
    const candidate = minimalVerifiedDataset.companies.find((c) =>
      c.id === "c39"
    )!;
    const deal = minimalVerifiedDataset.acquisitions[0];
    const dataset = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: [
        { ...target, founded: 2010, foundedPrecision: "year" },
        { ...candidate, founded: 2010, foundedPrecision: "year" },
      ],
      acquisitions: [{
        ...deal,
        targetId: target.id,
        announcedDate: "2018-04-12",
      }],
    });
    const rows = buildPredictions(dataset);
    const ageFactor = rows.find((row) => row.companyId === candidate.id)!
      .factorDetails.find((factor) => factor.label.startsWith("Age within"))!;
    // Both companies have the same current age, so the old code scored a match.
    // The precedent was eight years old at announcement, so it must not match.
    expect(ageFactor.available).toBe(true);
    expect(ageFactor.present).toBe(false);

    const withoutDate = buildPredictions(buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: dataset.verifiedCompanies,
      acquisitions: [{
        ...deal,
        targetId: target.id,
        announcedDate: "bad-date",
      }],
    }));
    expect(
      withoutDate.find((row) => row.companyId === candidate.id)!
        .factorDetails.find((factor) => factor.label.startsWith("Age within"))!
        .available,
    ).toBe(false);
  });
});
