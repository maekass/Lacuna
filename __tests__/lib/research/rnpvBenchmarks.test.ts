import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BENCHMARK_SOURCE_IDS,
  BENCHMARK_SOURCES,
  getBenchmarksBySource,
  getBenchmarkSourceById,
  getCitableBenchmarks,
  impliedStepUp,
  KNOWN_SOURCE_ISSUES,
  MINIMUM_CITABLE_SAMPLE,
  RNPV_BENCHMARKS,
  type Transition,
} from "@/lib/research/rnpvBenchmarks";
import { getResearchSourceById } from "@/lib/research/sourceRegistry";

const ROOT = process.cwd();
const MODULE = "src/lib/research/rnpvBenchmarks.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry) ? [path] : [];
  });
}

function value(id: string): number {
  const found = RNPV_BENCHMARKS.find((b) => b.id === id);
  if (!found) throw new Error(`missing benchmark ${id}`);
  return found.value;
}

const BIO_CUTS = [
  "all",
  "non-nme",
  "off-patent",
  "others",
  "oncology",
  "small-molecule",
  "rare",
  "biomarker",
] as const;

describe("rnpvBenchmarks", () => {
  it("keeps ids unique and every benchmark linked to a source", () => {
    const ids = RNPV_BENCHMARKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sourceIds = BENCHMARK_SOURCES.map((s) => s.id);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);

    for (const b of RNPV_BENCHMARKS) {
      expect(getBenchmarkSourceById(b.sourceId), b.id).toBeDefined();
      expect(b.locator.length, b.id).toBeGreaterThan(0);
      expect(b.cut.length, b.id).toBeGreaterThan(0);
      expect(b.period.length, b.id).toBeGreaterThan(0);
      expect(Number.isFinite(b.value), b.id).toBe(true);
      expect(b.value, b.id).toBeGreaterThan(0);
      if (b.unit === "fraction") expect(b.value, b.id).toBeLessThanOrEqual(1);
      if (b.verification === "derived_from_primary") {
        expect(b.derivation?.length, b.id).toBeGreaterThan(0);
      }
      expect(b.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    for (const source of BENCHMARK_SOURCES) {
      expect(source.sourceUrl.startsWith("https://"), source.id).toBe(true);
      expect(source.limitations.length, source.id).toBeGreaterThan(0);
      expect(getBenchmarksBySource(source.id).length, source.id)
        .toBeGreaterThan(0);
    }
  });

  it("is reference-only on every figure", () => {
    for (const b of RNPV_BENCHMARKS) {
      expect(b.prohibitedUses, b.id).toEqual(
        expect.arrayContaining([
          "lacuna_valuation_input",
          "company_score",
          "company_ranking",
          "predictive_model_input",
          "investment_recommendation",
        ]),
      );
      expect(b.approvedUses, b.id).toContain("analyst_reference");
    }
  });

  it("is not imported by any other application module", () => {
    const importers = walk(resolve(ROOT, "src"))
      .map((path) => relative(ROOT, path))
      .filter((path) => path !== MODULE)
      .filter((path) => readFileSync(path, "utf8").includes("rnpvBenchmarks"));
    expect(importers).toEqual([]);
  });

  it("reproduces each BIO LOA from its phase rates", () => {
    const phases: readonly Transition[] = [
      "phase1_to_phase2",
      "phase2_to_phase3",
      "phase3_to_submission",
      "submission_to_approval",
    ];
    const key: Record<string, string> = {
      phase1_to_phase2: "p1-p2",
      phase2_to_phase3: "p2-p3",
      phase3_to_submission: "p3-sub",
      submission_to_approval: "sub-appr",
    };
    for (const cut of BIO_CUTS) {
      const product = phases.reduce(
        (acc, t) => acc * value(`bio-2011-2020-${cut}-${key[t]}`),
        1,
      );
      expect(
        Math.abs(product - value(`bio-2011-2020-${cut}-loa`)),
        cut,
      ).toBeLessThan(0.002);
    }
  });

  it("sums BIO phase durations to the reported total", () => {
    const sum = ["phase1", "phase2", "phase3", "submission"]
      .map((p) => value(`bio-2011-2020-all-duration-${p}`))
      .reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(value("bio-2011-2020-all-duration-total"), 5);
  });

  it("reproduces the IQVIA 2024 composite from its phase rates", () => {
    const product = ["p1-p2", "p2-p3", "p3-sub", "sub-appr"]
      .map((k) => value(`iqvia-2025-2024-${k}`))
      .reduce((a, b) => a * b, 1);
    expect(Math.abs(product - value("iqvia-2025-composite-2024")))
      .toBeLessThan(0.005);
  });

  it("files the 7% composite under the 2025 IQVIA edition only", () => {
    const composites = RNPV_BENCHMARKS.filter(
      (b) => b.metric === "composite_success_rate",
    );
    expect(composites.length).toBeGreaterThan(0);
    for (const b of composites) {
      expect(b.sourceId, b.id).toBe(BENCHMARK_SOURCE_IDS.iqvia2025);
    }
  });

  it("matches the SVB women's-health chart sums to their derivations", () => {
    expect(value("svb-wh-2026-vc-total-2025")).toBe(
      (610 + 513 + 376 + 458) * 1_000_000,
    );
    expect(value("svb-wh-2026-vc-total-2024")).toBe(
      1_300_000_000 + (991 + 362 + 550) * 1_000_000,
    );
  });

  it("stores no device exit figures from the SVB H2 2026 edition", () => {
    const deviceExits = RNPV_BENCHMARKS.filter(
      (b) =>
        b.sourceId === BENCHMARK_SOURCE_IDS.svbH22026 &&
        /exit/i.test(`${b.id} ${b.cut}`),
    );
    expect(deviceExits).toEqual([]);
    expect(KNOWN_SOURCE_ISSUES.map((i) => i.id)).toContain(
      "svb-h2-2026-device-exits-duplicate",
    );
  });

  it("withholds small-sample figures from the citable set", () => {
    const citable = new Set(getCitableBenchmarks().map((b) => b.id));
    const small = RNPV_BENCHMARKS.filter(
      (b) => b.n !== undefined && b.n < MINIMUM_CITABLE_SAMPLE,
    );
    expect(small.length).toBeGreaterThan(0);
    for (const b of small) expect(citable.has(b.id), b.id).toBe(false);
    expect(citable.has("jpm-q2-2026-licensing-upfront-phase3-h1-2026"))
      .toBe(false);
    expect(citable.has("bio-2011-2020-all-loa")).toBe(true);
  });

  it("keeps the shared SVB source aligned with the canonical registry", () => {
    for (const source of BENCHMARK_SOURCES) {
      if (!source.registryId) continue;
      const registry = getResearchSourceById(source.registryId);
      expect(registry, source.id).toBeDefined();
      expect(registry?.publishedAt).toBe(source.publishedAt);
      expect(registry?.dataCutoff).toBe(source.dataCutoff);
      expect(registry?.sourceUrl).toBe(source.sourceUrl);
    }
  });

  it("computes implied step-ups and rejects invalid rates", () => {
    expect(impliedStepUp(0.52)).toBeCloseTo(1.923, 3);
    expect(impliedStepUp(0)).toBeUndefined();
    expect(impliedStepUp(1.2)).toBeUndefined();
    expect(impliedStepUp(Number.NaN)).toBeUndefined();
  });
});
