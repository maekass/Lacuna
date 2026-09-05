import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDataQualityView } from "@/lib/data/dataQualityView";

const repoRoot = path.resolve(__dirname, "../../..");

describe("buildDataQualityView", () => {
  it("mirrors committed quality averages and counts", () => {
    const quality = JSON.parse(
      readFileSync(
        path.join(repoRoot, "src/data/computed-data-quality-scores.json"),
        "utf8",
      ),
    ) as {
      summary: {
        companies: { total: number; avgScore: number };
        acquisitions: { total: number; avgScore: number };
      };
      companies: Array<{ grade: string }>;
    };
    const view = buildDataQualityView(new Date("2026-09-05T00:00:00Z"));
    expect(view.companiesAvgScoreLabel).toBe(
      quality.summary.companies.avgScore.toFixed(1),
    );
    expect(view.dealsAvgScoreLabel).toBe(
      quality.summary.acquisitions.avgScore.toFixed(1),
    );
    expect(view.companiesTotalLabel).toBe(
      String(quality.summary.companies.total),
    );
    expect(view.dealsTotalLabel).toBe(
      String(quality.summary.acquisitions.total),
    );
    expect(view.gradeBars.map((bar) => bar.grade).join("")).toBe("ABCDF");
  });

  it("lists every D/F company row from the artifact", () => {
    const quality = JSON.parse(
      readFileSync(
        path.join(repoRoot, "src/data/computed-data-quality-scores.json"),
        "utf8",
      ),
    ) as { companies: Array<{ grade: string }> };
    const expected =
      quality.companies.filter((row) => row.grade === "D" || row.grade === "F")
        .length;
    const view = buildDataQualityView();
    expect(view.weakCompanies).toHaveLength(expected);
    expect(view.weakCompanyCountLabel).toBe(String(expected));
  });

  it("uses provenance-baseline covered/total exactly", () => {
    const baseline = JSON.parse(
      readFileSync(
        path.join(repoRoot, "scripts/provenance-baseline.json"),
        "utf8",
      ),
    ) as { covered: number; total: number };
    const view = buildDataQualityView();
    expect(view.provenanceCoveredLabel).toBe(String(baseline.covered));
    expect(view.provenanceTotalLabel).toBe(String(baseline.total));
    expect(view.provenanceDialLabel).toContain(
      `${baseline.covered} / ${baseline.total}`,
    );
  });
});
