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

  it("gives same-day snapshots distinct ids", () => {
    const row = {
      backfilled: true,
      companies: { avgScore: 60 },
      acquisitions: { avgScore: 70 },
      provenance: { uncovered: 10 },
      disclosure: { disclosureRate: 0.5 },
    };
    const view = buildQualityTrendView([
      { ...row, runAt: "2026-07-02T00:00:00.000Z" },
      { ...row, runAt: "2026-07-02T06:00:00.000Z" },
    ]);
    expect(view.points[0].runAtLabel).toBe("2026-07-02");
    expect(view.points[1].runAtLabel).toBe("2026-07-02");
    expect(view.points[0].id).not.toBe(view.points[1].id);
  });

  it("assigns unique ids to the committed history", () => {
    const view = buildQualityTrendView();
    const ids = view.points.map((point) => point.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });
});
