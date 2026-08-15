import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const ARTIFACTS = [
  "src/data/computed-benchmarks.json",
  "src/data/computed-acquirer-premiums.json",
  "src/data/computed-confidence-intervals.json",
  "src/data/computed-sector-correlations.json",
];

function readArtifact<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
}

describe("lineage-backed computed artifacts", () => {
  it("records suppressed benchmark metrics with lineage", () => {
    const artifact = readArtifact<{
      benchmarks: Array<{ medianMoic?: unknown }>;
      withheld: Array<{
        metricId: string;
        reason: string;
        lineage: { n: number };
      }>;
    }>("src/data/computed-benchmarks.json");

    expect(artifact.benchmarks).toHaveLength(1);
    expect(
      artifact.withheld.some((entry) =>
        entry.metricId === "sector.moic.median" &&
        entry.lineage.n === 1 &&
        entry.reason.includes("below minimum")
      ),
    ).toBe(true);
  });

  it("keeps premium denominator metrics separate", () => {
    const artifact = readArtifact<{
      premiumMetrics: Record<string, {
        estimate: { lineage: { n: number } };
      }>;
    }>("src/data/computed-acquirer-premiums.json");

    expect(Object.keys(artifact.premiumMetrics).sort()).toEqual([
      "acquirer.premium.lastKnownValuation",
      "acquirer.premium.preDealValuation",
      "acquirer.premium.totalFunding",
    ]);
    expect(
      artifact.premiumMetrics["acquirer.premium.preDealValuation"].estimate
        .lineage.n,
    ).toBe(47);
    expect(
      artifact.premiumMetrics["acquirer.premium.lastKnownValuation"].estimate
        .lineage.n,
    ).toBe(48);
    expect(
      artifact.premiumMetrics["acquirer.premium.totalFunding"].estimate.lineage
        .n,
    ).toBe(7);
  });

  it("produces byte-stable artifacts across consecutive computations", () => {
    const run = () => {
      execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/compute-all.ts"],
        { cwd: ROOT, stdio: "ignore" },
      );
      return ARTIFACTS.map((file) => readFileSync(path.join(ROOT, file)));
    };

    const first = run();
    const second = run();
    expect(second).toEqual(first);
  }, 30000);
});
