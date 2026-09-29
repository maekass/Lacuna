import { describe, expect, it } from "vitest";
import { formatDealDate, getMarketPosition } from "@/components/PitchBrief";

describe("pitch brief dates and stage labels", () => {
  it("formats a calendar day in UTC so January 1 does not shift month", () => {
    expect(formatDealDate("2020-01-01")).toBe("Jan 1, 2020");
    expect(formatDealDate("2020-06")).toBe("Jun 2020");
    expect(formatDealDate("2018")).toBe("2018");
  });

  it("does not call an unspecified stage late-stage", () => {
    expect(getMarketPosition("Unspecified")).toBe("Unspecified");
  });
});
