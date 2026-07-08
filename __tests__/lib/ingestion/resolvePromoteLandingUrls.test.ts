import { describe, expect, it } from "vitest";
import { resolvePromoteLandingUrls } from "@/lib/ingestion/resolvePromoteLandingUrls";

describe("resolvePromoteLandingUrls", () => {
  it("prefers API-provided URLs", () => {
    expect(
      resolvePromoteLandingUrls({
        verifiedDealUrl: "/deals/a99",
        networkUrl: "/deals?highlight=acq1#network",
      }),
    ).toEqual({
      verifiedDealUrl: "/deals/a99",
      networkUrl: "/deals?highlight=acq1#network",
    });
  });

  it("falls back to result ids", () => {
    expect(
      resolvePromoteLandingUrls({
        result: {
          acquisitionId: "a42",
          networkHighlightId: "acq7",
        },
      }),
    ).toEqual({
      verifiedDealUrl: "/deals/a42",
      networkUrl: "/deals?highlight=acq7#network",
    });
  });

  it("returns null when acquisition id is missing", () => {
    expect(resolvePromoteLandingUrls({})).toBeNull();
  });
});
