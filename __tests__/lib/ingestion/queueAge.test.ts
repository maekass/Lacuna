import { describe, expect, it } from "vitest";
import {
  formatQueueMedianAgeLabel,
  formatQueueSlaLabel,
} from "@/lib/ingestion/queueAge";

describe("queueAge", () => {
  it("formatQueueSlaLabel uses hours below 48h threshold", () => {
    const now = Date.parse("2026-07-08T12:00:00.000Z");
    const iso = "2026-07-08T00:00:00.000Z";
    expect(formatQueueSlaLabel(iso, now)).toBe("12h");
  });

  it("formatQueueMedianAgeLabel switches to days for older queues", () => {
    expect(formatQueueMedianAgeLabel(72)).toBe("3d median age");
  });
});
