import { describe, expect, it } from "vitest";
import { exitAgeAtAnnouncement, peerExitAgeMedian } from "@/lib/quant/exitAge";

describe("age at acquisition announcement", () => {
  it("uses the event year rather than today's year and excludes the scored target", () => {
    const ages = new Map([
      ["old-exit", exitAgeAtAnnouncement(2010, "year", "2018-04-12")],
      ["recent-exit", exitAgeAtAnnouncement(2010, "year", "2023-06-01")],
    ]);
    expect(ages.get("old-exit")).toBe(8);
    expect(peerExitAgeMedian(ages, "recent-exit")).toBe(8);
    expect(peerExitAgeMedian(ages, "old-exit")).toBe(13);
  });

  it("withholds unknown, estimated, invalid, and pre-founding event ages", () => {
    expect(exitAgeAtAnnouncement(undefined, "unknown", "2018-01-01"))
      .toBeNull();
    expect(exitAgeAtAnnouncement(2010, "estimated", "2018-01-01")).toBeNull();
    expect(exitAgeAtAnnouncement(2010, "year", undefined)).toBeNull();
    expect(exitAgeAtAnnouncement(2010, "year", "2018-02-30")).toBeNull();
    expect(exitAgeAtAnnouncement(2020, "year", "2018-01-01")).toBeNull();
    expect(peerExitAgeMedian(new Map([["a", null]]), "b")).toBeNull();
  });
});
