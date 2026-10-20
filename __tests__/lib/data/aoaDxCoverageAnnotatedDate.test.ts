import { describe, expect, it, vi } from "vitest";

// One fixture deal whose raw announcedDate (2025-01-02) is outside the AOA Dx
// frame but whose annotation records year precision 2024 (inside). Both
// coverage numerators must follow the annotated date.
vi.mock("@/data/lacunaDataset.annotations.json", async (importOriginal) => {
  const actual = await importOriginal<
    { default: { version: number; deals: Record<string, unknown> } }
  >();
  return {
    default: {
      ...actual.default,
      deals: {
        ...actual.default.deals,
        "fixture-boundary": {
          valueTier: "trade_press",
          scope: "womens_health",
          announcedPrecision: "year",
          year: 2024,
          statusHistory: [
            {
              status: "announced",
              statusAsOf: "2025-01-02",
              statusSource: "fixture",
            },
          ],
        },
      },
    },
  };
});

const { getStaticVerifiedDataset } = await import("@/lib/data/staticDataset");
const { liveDisclosedStats } = await import(
  "@/lib/data/lacunaDataset/liveStats"
);
const { observedCatalogComposition } = await import(
  "@/lib/quant/observedExitRates"
);

describe("AOA Dx coverage with an annotated announcement date", () => {
  it("counts the annotated year in both live and catalog coverage", () => {
    const dataset = getStaticVerifiedDataset();
    const base = dataset.acquisitions[0]!;
    const fixture = {
      ...dataset,
      acquisitions: [
        ...dataset.acquisitions,
        {
          ...base,
          id: "fixture-boundary",
          announcedDate: "2025-01-02",
          closedDate: undefined,
        },
      ],
    };
    const live = liveDisclosedStats(fixture).womensHealth.coverage.numerator;
    const catalog = observedCatalogComposition(fixture).catalogCoverage
      .successes;
    const baseline = liveDisclosedStats(dataset).womensHealth.coverage
      .numerator;
    expect(live).toBe(baseline + 1);
    expect(catalog).toBe(live);
  });
});
