import { describe, expect, it } from "vitest";
import { csvEscape } from "@/lib/api/csvEscape";

describe("csvEscape", () => {
  it.each([
    ["=SUM(A1)", '"\'=SUM(A1)"'],
    ["\t=cmd", '"\'\t=cmd"'],
    ["\r=cmd", '"\'\r=cmd"'],
    ['a"b', '"a""b"'],
    ["Hologic", '"Hologic"'],
    ["", '""'],
  ])("escapes %j", (value, expected) => {
    expect(csvEscape(value)).toBe(expected);
  });
});
