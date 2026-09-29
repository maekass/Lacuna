import { describe, expect, it } from "vitest";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { minimalVerifiedDataset } from "../../helpers/fixtures";

describe("deal calendar year", () => {
  it("counts the ISO year and skips undisclosed prices in the disclosed sum", () => {
    const deal = minimalVerifiedDataset.acquisitions[0];
    const derived = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      acquisitions: [
        { ...deal, announcedDate: "2020-01-01", dealValue: 10 },
        {
          ...deal,
          id: "undisclosed",
          announcedDate: "2020-01-01",
          dealValue: undefined,
        },
      ],
    });
    expect(derived.getVerifiedDealsByYear()).toEqual([
      { year: 2020, count: 2 },
    ]);
    expect(derived.getVerifiedTotalDealValue()).toBe(10);
  });
});
