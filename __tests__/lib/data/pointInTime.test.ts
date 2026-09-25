import { describe, expect, it } from "vitest";
import { atDecisionDate } from "@/lib/data/pointInTime";

describe("field level point-in-time eligibility", () => {
  const cutoff = "2018-04-12";

  it("keeps a contemporaneously sourced value", () => {
    expect(
      atDecisionDate({ value: 10, asOf: cutoff, source: "filing" }, cutoff),
    )
      .toEqual({ eligible: true, value: 10 });
  });

  it("withholds a later value even when a deal was announced at the cutoff", () => {
    expect(
      atDecisionDate(
        { value: 300, asOf: "2020-02-01", source: "filing" },
        cutoff,
      ),
    )
      .toEqual({ eligible: false, reason: "after-cutoff" });
  });

  it("fails closed when vintage or source is missing, or a date is invalid", () => {
    expect(atDecisionDate({ value: 300, asOf: null, source: "filing" }, cutoff))
      .toEqual({ eligible: false, reason: "missing-provenance" });
    expect(atDecisionDate({ value: 300, asOf: cutoff, source: "" }, cutoff))
      .toEqual({ eligible: false, reason: "missing-provenance" });
    expect(
      atDecisionDate(
        { value: 300, asOf: "2018-02-30", source: "filing" },
        cutoff,
      ),
    )
      .toEqual({ eligible: false, reason: "invalid-date" });
  });
});
