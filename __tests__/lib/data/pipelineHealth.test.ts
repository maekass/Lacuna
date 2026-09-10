import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPipelineHealthView } from "@/lib/data/pipelineHealth";

const repoRoot = path.resolve(__dirname, "../../..");

describe("buildPipelineHealthView", () => {
  it("uses the committed deal count, not a 0.7× heuristic", () => {
    const summary = JSON.parse(
      readFileSync(
        path.join(repoRoot, "src/data/computed-dataset-summary.json"),
        "utf8",
      ),
    ) as { headline: { verifiedDeals: number } };
    const view = buildPipelineHealthView(new Date("2026-09-05T00:00:00Z"));
    expect(view.dealsTotalLabel).toBe(String(summary.headline.verifiedDeals));
    expect(view.dealsTotalLabel).not.toBe(
      String(Math.floor(summary.headline.verifiedDeals * 0.7)),
    );
  });

  it("renders static-mode SEC ingest as not configured", () => {
    const view = buildPipelineHealthView(new Date("2026-09-05T00:00:00Z"));
    expect(view.secIngestConfigured).toBe(false);
    expect(view.secIngestLabel).toMatch(/not configured/i);
    expect(view.secIngestLabel).not.toMatch(/\d+ms/);
    expect(view.secIngestLabel).not.toMatch(/%/);
  });

  it("uses live ingest overrides instead of the static artifact", () => {
    const view = buildPipelineHealthView(new Date("2026-09-05T00:00:00Z"), {
      pipelines: {
        secIngestLastRunAt: "2026-09-04T12:00:00.000Z",
        secIngestStatus: "success",
      },
    });
    expect(view.secIngestConfigured).toBe(true);
    expect(view.secIngestLabel).toMatch(/success/);
    expect(view.secIngestLabel).toMatch(/2026-09-04T12:00:00.000Z/);
  });

  it("computes dataset age from provenance.lastUpdated", () => {
    const dataset = JSON.parse(
      readFileSync(
        path.join(repoRoot, "src/data/dataset.verified.json"),
        "utf8",
      ),
    ) as { provenance: { lastUpdated: string } };
    const lastUpdated = dataset.provenance.lastUpdated;
    const now = new Date(`${lastUpdated}T00:00:00Z`);
    now.setUTCDate(now.getUTCDate() + 2);
    const view = buildPipelineHealthView(now);
    expect(view.lastUpdated).toBe(lastUpdated);
    expect(view.datasetAgeDaysLabel).toBe("2 days since last update");
  });
});
