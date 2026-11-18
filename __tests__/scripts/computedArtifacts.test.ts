import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { hashDataset } from "@/lib/lineage/datasetHash";

const ROOT = path.resolve(__dirname, "../..");
const ARTIFACTS = [
  "src/data/computed-benchmarks.json",
  "src/data/computed-benchmarks.slim.json",
  "src/data/computed-growth-rates.json",
  "src/data/computed-acquirer-premiums.json",
  "src/data/computed-acquirer-premiums.slim.json",
  "src/data/computed-confidence-intervals.json",
  "src/data/computed-sector-correlations.json",
  "src/data/computed-data-quality-scores.json",
  "src/data/computed-dataset-summary.json",
  "src/data/computed-quality-visibility.json",
];

function readArtifact<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
}

describe("lineage-backed computed artifacts", () => {
  it("records a canonical dataset hash in every lineage artifact", () => {
    const expected = hashDataset(getStaticVerifiedDataset()).fullHash;
    for (const file of ARTIFACTS) {
      const artifact = readArtifact<{
        datasetHash?: unknown;
        provenance?: { datasetHash?: unknown };
      }>(file);
      expect(
        artifact.datasetHash ?? artifact.provenance?.datasetHash,
        file,
      ).toBe(expected);
    }
  });

  it("records suppressed benchmark metrics with lineage", () => {
    const artifact = readArtifact<{
      benchmarks: Array<{ medianMoic?: unknown }>;
      withheld: Array<{
        metricId: string;
        reason: string;
        lineage: { n: number };
      }>;
    }>("src/data/computed-benchmarks.json");

    // Every v11 funding denominator is locator_only or unstated_conflict, so
    // no sector exit/funding ratio is published.
    expect(artifact.benchmarks).toHaveLength(0);
    expect(
      artifact.withheld.some((entry) =>
        entry.metricId === "sector.moic.median" &&
        entry.lineage.n === 0 &&
        entry.reason.includes("below minimum")
      ),
    ).toBe(true);
  });

  it("keeps premium denominator metrics separate", () => {
    const artifact = readArtifact<{
      premiumMetrics: Record<string, {
        estimate: { lineage: { n: number } };
      }>;
      withheld: Array<{
        metricId: string;
        lineage: {
          n: number;
          excluded: Array<{ reason: string; count: number }>;
          missingness: Array<{ field: string; missing: number }>;
        };
      }>;
    }>("src/data/computed-acquirer-premiums.json");

    expect(Object.keys(artifact.premiumMetrics).sort()).toEqual([
      "acquirer.premium.lastKnownValuation",
      "acquirer.premium.preDealValuation",
    ]);
    expect(
      artifact.premiumMetrics["acquirer.premium.preDealValuation"].estimate
        .lineage.n,
    ).toBe(47);
    // 48 sourced last-known valuations minus 9 bounds or partial figures
    // (up_to, range_high, upfront, stake).
    expect(
      artifact.premiumMetrics["acquirer.premium.lastKnownValuation"].estimate
        .lineage.n,
    ).toBe(39);

    const funding = artifact.withheld.find((entry) =>
      entry.metricId === "acquirer.premium.totalFunding"
    );
    expect(funding?.lineage.n).toBe(0);
    expect(funding?.lineage.excluded).toContainEqual({
      reason: "funding_basis_inadmissible",
      count: 7,
    });
    // An inadmissible basis is not a missing value.
    expect(
      funding?.lineage.missingness.filter((m) => m.field === "totalFunding")
        .map((m) => m.missing),
    ).toEqual([45]);
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
