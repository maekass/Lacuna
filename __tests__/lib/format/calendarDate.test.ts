import { describe, expect, it } from "vitest";
import { calendarYear } from "@/lib/format/calendarDate";

describe("calendarYear", () => {
  it.each([
    ["2021-01-01", 2021],
    ["2021-06", 2021],
    ["2021", 2021],
    ["2021-01-01T00:00:00Z", 2021],
    ["", null],
    ["Jan 2021", null],
    ["21-01-01", null],
  ])("reads the calendar year from %s", (isoDate, expected) => {
    expect(calendarYear(isoDate)).toBe(expected);
  });
});
