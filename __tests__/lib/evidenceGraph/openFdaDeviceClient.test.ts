import { describe, expect, it } from "vitest";
import { buildOpenFdaDeviceUrl } from "@/lib/evidenceGraph/openFdaDeviceClient";

describe("openFDA device client", () => {
  it("builds an encoded 510(k) search URL", () => {
    const url = buildOpenFdaDeviceUrl("510k", {
      search: 'applicant:"Example Medical"',
      limit: 25,
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/device/510k.json");
    expect(parsed.searchParams.get("search")).toBe(
      'applicant:"Example Medical"',
    );
    expect(parsed.searchParams.get("limit")).toBe("25");
  });

  it("supports PMA, event, recall, UDI, and classification endpoints", () => {
    for (
      const endpoint of [
        "pma",
        "event",
        "recall",
        "udi",
        "classification",
      ] as const
    ) {
      expect(buildOpenFdaDeviceUrl(endpoint)).toContain(
        `/device/${endpoint}.json`,
      );
    }
  });

  it("rejects limits above the openFDA single-call maximum", () => {
    expect(() => buildOpenFdaDeviceUrl("event", { limit: 1001 })).toThrow(
      "openFDA limit must be an integer from 1 to 1000",
    );
  });

  it("rejects negative skip values", () => {
    expect(() => buildOpenFdaDeviceUrl("recall", { skip: -1 })).toThrow(
      "openFDA skip must be a non-negative integer",
    );
  });
});