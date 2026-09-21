import { describe, expect, it } from "vitest";
import { listMeasurementArtifactStatuses } from "@/lib/data/measurementArtifactStatus";

describe("listMeasurementArtifactStatuses", () => {
  it("labels SEC revenue, growth, and CMS utilization as withheld (success)", () => {
    const rows = listMeasurementArtifactStatuses();
    expect(rows.map((r) => r.id)).toEqual([
      "sec-revenue",
      "growth-rates",
      "cms-utilization",
    ]);
    expect(rows.every((r) => r.withheld)).toBe(true);
    expect(rows.every((r) => r.statusLabel.length > 0)).toBe(true);
  });
});
