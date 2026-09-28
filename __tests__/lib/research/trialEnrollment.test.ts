import { describe, expect, it } from "vitest";
import {
  reportedEnrollment,
  summarizeEnrollment,
} from "@/lib/research/trialEnrollment";

describe("reportedEnrollment", () => {
  it.each([null, undefined, Number.NaN, -1, "12"])(
    "returns null for invalid enrollment %s",
    (count) => {
      expect(reportedEnrollment(count)).toBeNull();
    },
  );

  it("preserves a reported zero", () => {
    expect(reportedEnrollment(0)).toBe(0);
  });
});

describe("summarizeEnrollment", () => {
  it("sums only trials with reported enrollment", () => {
    expect(summarizeEnrollment([
      { enrollment: 120 },
      { enrollment: null },
      { enrollment: 0 },
    ])).toEqual({ total: 120, reportedTrials: 2, totalTrials: 3 });
  });

  it("returns zero counts for an empty list", () => {
    expect(summarizeEnrollment([])).toEqual({
      total: 0,
      reportedTrials: 0,
      totalTrials: 0,
    });
  });
});
