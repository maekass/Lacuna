import { describe, expect, it } from "vitest";
import { buildQualityTrendView } from "@/lib/data/qualityTrendView";

describe("buildQualityTrendView", () => {
  it("pre-formats scores and labels the backfilled region", () => {
    const view = buildQualityTrendView([
      {
        runAt: "2026-07-01T00:00:00.000Z",
        backfilled: true,
        companies: { avgScore: 66.0 },
        acquisitions: { avgScore: 80.0 },
        provenance: { uncovered: 1100 },
        disclosure: { disclosureRate: 0.8 },
      },
      {
        runAt: "2026-09-05T00:00:00.000Z",
        companies: { avgScore: 64.3 },
        acquisitions: { avgScore: 83.1 },
        provenance: { uncovered: 1019 },
        disclosure: { disclosureRate: 0.847 },
      },
    ]);
    expect(view.pointCountLabel).toBe("2");
    expect(view.backfilledCountLabel).toBe("1");
    expect(view.hasBackfilledRegion).toBe(true);
    expect(view.latestCompaniesAvgLabel).toBe("64.3");
    expect(view.latestDisclosureLabel).toBe("84.7%");
    expect(view.points[0].backfilled).toBe(true);
    expect(view.points[1].companiesAvgPct).toMatch(/%$/);
  });
});
