import { describe, expect, it } from "vitest";
import { ferricCarboxymaltoseUsEvidence } from "@/data/evidence/ferricCarboxymaltoseUs";
import {
  assessEvidenceAt,
  evidenceAvailableAt,
  evidenceObservationSchema,
} from "@/lib/evidenceGraph";

describe("Evidence Graph", () => {
  it("validates the sourced ferric carboxymaltose vertical slice", () => {
    expect(ferricCarboxymaltoseUsEvidence).toHaveLength(2);
    for (const observation of ferricCarboxymaltoseUsEvidence) {
      expect(evidenceObservationSchema.safeParse(observation).success).toBe(
        true,
      );
      expect(observation.source.url).toMatch(/^https:\/\//);
      expect(observation.limitations.length).toBeGreaterThan(0);
    }
  });

  it("preserves FDA's fewer-than qualifier without false precision", () => {
    const monitoring = ferricCarboxymaltoseUsEvidence.find((observation) =>
      observation.metric === "safety.monitoring.serum_phosphate_testing_share"
    );

    expect(monitoring?.value).toBe(0.2);
    expect(monitoring?.comparator).toBe("lt");
  });

  it("rejects a derived value without a recorded derivation", () => {
    const base = ferricCarboxymaltoseUsEvidence[0];
    const result = evidenceObservationSchema.safeParse({
      ...base,
      id: "derived-without-method",
      evidenceKind: "derived",
      derivation: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an as-of date before publication", () => {
    const base = ferricCarboxymaltoseUsEvidence[0];
    const result = evidenceObservationSchema.safeParse({
      ...base,
      id: "time-leaked-observation",
      asOf: "2026-08-12",
    });

    expect(result.success).toBe(false);
  });

  it("excludes evidence published after a historical snapshot", () => {
    const observation = ferricCarboxymaltoseUsEvidence[1];

    expect(assessEvidenceAt(observation, "2026-08-31").status).toBe("future");
    expect(assessEvidenceAt(observation, "2026-09-01").status).toBe(
      "admissible",
    );
  });

  it("does not use event date to bypass publication-date leakage", () => {
    const base = ferricCarboxymaltoseUsEvidence[1];
    const eventBeforePublication = evidenceObservationSchema.parse({
      ...base,
      id: "event-before-publication",
      eventDate: "2026-01-01",
    });

    expect(assessEvidenceAt(eventBeforePublication, "2026-08-31").status).toBe(
      "future",
    );
  });

  it("returns only evidence knowable at the requested snapshot", () => {
    const available = evidenceAvailableAt(
      ferricCarboxymaltoseUsEvidence,
      "2026-08-20",
    );

    expect(available.map((observation) => observation.id)).toEqual([
      "fcm-us-boxed-warning-hypophosphatemia-2026",
    ]);
  });
});