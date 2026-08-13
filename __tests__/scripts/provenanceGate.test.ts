import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectCensus,
  type ProvenanceCensus,
  type ProvenanceExemption,
  ratchetFailure,
  validateExemptions,
} from "../../scripts/provenance-gate";

const fixtureRoot = path.resolve(
  process.cwd(),
  "__tests__/fixtures/provenance-census",
);
const fixtureFiles = fs.readdirSync(fixtureRoot)
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => path.join(fixtureRoot, file))
  .sort();

describe("provenance census", () => {
  it("classifies covered, exempt, and uncovered display sites", () => {
    const initial = collectCensus({
      cwd: process.cwd(),
      files: fixtureFiles,
      exemptions: [],
    });
    const exemptSite = initial.sites.find((site) =>
      site.file.endsWith("Exempted.tsx")
    );
    expect(exemptSite).toBeDefined();
    const exemptions: ProvenanceExemption[] = [{
      key: exemptSite!.key,
      category: "date",
      reason: "Fixture exemption proves the registry path.",
    }];
    const census = collectCensus({
      cwd: process.cwd(),
      files: fixtureFiles,
      exemptions,
    });
    expect(census.covered).toBeGreaterThan(0);
    expect(census.exempt).toBe(1);
    expect(census.uncovered).toBeGreaterThan(0);
    expect(
      census.sites.some((site) =>
        site.functionName === "Nullable" &&
        site.expression === "value" &&
        site.class === "uncovered"
      ),
    ).toBe(true);
  });

  it("produces deterministic site output", () => {
    const options = { cwd: process.cwd(), files: fixtureFiles, exemptions: [] };
    expect(collectCensus(options)).toEqual(collectCensus(options));
  });

  it("rejects exemptions without a category or reason", () => {
    expect(() => validateExemptions([{ key: "x", category: "", reason: " " }]))
      .toThrow("key, supported category, and reason are required");
  });

  it("distinguishes regressions from stale improvements", () => {
    const baseline: ProvenanceCensus = {
      version: 1,
      total: 1,
      covered: 0,
      exempt: 0,
      uncovered: 1,
      perFileUncovered: { "fixture.tsx": 1 },
      sites: [],
    };
    const regression = { ...baseline, total: 2, uncovered: 2 };
    expect(ratchetFailure(regression, baseline)).toContain(
      "Provenance gate failed: display debt increased.",
    );
    const improved = { ...baseline, covered: 1, uncovered: 0 };
    expect(ratchetFailure(improved, baseline)).toContain(
      "Provenance baseline is stale after an improvement or benign census drift.",
    );
    expect(ratchetFailure(improved, improved)).toBeNull();
  });
});
