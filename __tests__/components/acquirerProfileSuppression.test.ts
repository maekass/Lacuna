import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  path.resolve(__dirname, "../../src/components/AcquirerProfile.tsx"),
  "utf8",
);

describe("AcquirerProfile aggregate suppression", () => {
  it("routes the mean through Metric and does not format a raw $XM average", () => {
    expect(src).toMatch(/from "@\/components\/Metric"/);
    expect(src).toMatch(/buildAcquirerDealValueView/);
    expect(src).not.toMatch(/averageDealValue\.toFixed/);
    expect(src).toMatch(/<Metric/);
  });
});
