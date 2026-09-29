import { describe, expect, it } from "vitest";
import {
  sourceUrlFromCitation,
  vintageFromCitation,
} from "@/lib/data/citationVintage";

describe("citation vintage extraction", () => {
  it("keeps a day the citation states", () => {
    expect(vintageFromCitation(
      "SEC EDGAR EX-99.1 — 23andMe/Lemonaid merger agreement (Oct 22, 2021)",
    )).toEqual({ publicAsOfDate: "2021-10-22", datePrecision: "day" });
  });

  it("keeps month and year precision without inventing a day", () => {
    expect(vintageFromCitation("Series D at $1B+ valuation (Aug 2021)"))
      .toEqual({ publicAsOfDate: "2021-08-01", datePrecision: "month" });
    expect(vintageFromCitation("Press reports from Series B (2019)")).toEqual({
      publicAsOfDate: "2019-01-01",
      datePrecision: "year",
    });
    expect(vintageFromCitation("SEC 10-K, CooperCompanies FY2012")).toEqual({
      publicAsOfDate: "2012-01-01",
      datePrecision: "year",
    });
  });

  it("returns null when the citation states no date or host", () => {
    expect(vintageFromCitation("Acquisition value reported in press")).toBe(
      null,
    );
    expect(sourceUrlFromCitation("Acquisition value reported in press")).toBe(
      undefined,
    );
  });

  it("copies a host path already written in the citation", () => {
    expect(sourceUrlFromCitation(
      "Crunchbase - crunchbase.com/organization/ro",
    )).toBe("https://crunchbase.com/organization/ro");
  });
});
