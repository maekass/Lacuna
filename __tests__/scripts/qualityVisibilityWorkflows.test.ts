import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

describe("quality visibility CI wiring", () => {
  it("CI workflows publish step summaries, warnings, and artifacts", () => {
    const ci = readFileSync(
      path.join(ROOT, ".github/workflows/deno.yml"),
      "utf8",
    );
    const daily = readFileSync(
      path.join(ROOT, ".github/workflows/dataset-summary.yml"),
      "utf8",
    );
    expect(ci).toContain("report:quality");
    expect(ci).toContain("actions/upload-artifact@v4");
    expect(ci).toContain("Comment quality census on PR");
    expect(daily).toContain("report:quality");
    expect(daily).toContain("actions/upload-artifact@v4");
    expect(daily.indexOf("payer-ops:benchmarks:fetch")).toBeLessThan(
      daily.indexOf("quality-history:append"),
    );
    expect(daily).toContain("src/data/payer-ops-benchmarks.snapshot.json");

    const report = readFileSync(
      path.join(ROOT, "scripts/report-quality-visibility.ts"),
      "utf8",
    );
    const gate = readFileSync(
      path.join(ROOT, "scripts/provenance-gate.ts"),
      "utf8",
    );
    expect(report).toContain("GITHUB_STEP_SUMMARY");
    expect(report).toContain("::warning");
    expect(gate).toContain("GITHUB_STEP_SUMMARY");
    expect(gate).toContain("::warning");
  });
});
