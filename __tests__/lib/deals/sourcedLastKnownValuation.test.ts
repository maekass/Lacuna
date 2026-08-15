import { describe, expect, it } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import {
  sourcedDistinctLastKnownValuation,
  sourcedLastKnownValuationForCompany,
} from "@/lib/deals/sourcedLastKnownValuation";

describe("sourcedDistinctLastKnownValuation", () => {
  it("hides Biotheranostics when lastKnownValuation copies the $230M deal print", () => {
    expect(sourcedDistinctLastKnownValuation({
      lastKnownValuation: 230,
      valuationSource:
        "Acquisition price ~$230M (Hologic press release, Jan 2021)",
      dealValue: 230,
      preDealValuation: 170,
    })).toBeNull();
  });

  it("hides a figure that duplicates cited pre-deal valuation", () => {
    expect(sourcedDistinctLastKnownValuation({
      lastKnownValuation: 1000,
      valuationSource: "Series D at $1B+ valuation (Aug 2021)",
      preDealValuation: 1000,
    })).toBeNull();
  });

  it("returns null without valuationSource — never a silent TAM fallback", () => {
    expect(sourcedDistinctLastKnownValuation({
      lastKnownValuation: 5300,
      dealValue: 2400,
    })).toBeNull();
    expect(sourcedDistinctLastKnownValuation({
      lastKnownValuation: 5300,
      valuationSource: "   ",
      dealValue: 2400,
    })).toBeNull();
  });

  it("returns a distinct sourced company valuation", () => {
    expect(sourcedDistinctLastKnownValuation({
      lastKnownValuation: 5300,
      valuationSource:
        "Total company value ~$5.3B fully diluted; Roche paid ~$2.4B for remaining shares",
      dealValue: 2400,
    })).toEqual({
      value: 5300,
      source:
        "Total company value ~$5.3B fully diluted; Roche paid ~$2.4B for remaining shares",
    });
  });
});

describe("sourcedLastKnownValuationForCompany", () => {
  it("hides Biotheranostics $230M when it copies the verified deal print", () => {
    const company = minimalVerifiedDataset.companies.find((c) =>
      c.id === "c24"
    );
    expect(company?.lastKnownValuation).toBe(230);
    expect(
      sourcedLastKnownValuationForCompany(
        company!,
        minimalVerifiedDataset.acquisitions,
      ),
    ).toBeNull();
  });

  it("returns a sourced figure when it is distinct from the deal print", () => {
    expect(sourcedLastKnownValuationForCompany({
      id: "c21",
      lastKnownValuation: 5300,
      valuationSource:
        "Total company value ~$5.3B fully diluted; Roche paid ~$2.4B for remaining shares",
    }, [{ targetId: "c21", dealValue: 2400 }])).toEqual({
      value: 5300,
      source:
        "Total company value ~$5.3B fully diluted; Roche paid ~$2.4B for remaining shares",
    });
  });
});
