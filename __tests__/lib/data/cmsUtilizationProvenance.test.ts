import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getCmsUtilizationProvenance,
  isCmsUtilizationHardcodedFallback,
} from "@/lib/data/cmsUtilizationProvider";
import { assertCmsUtilizationSourceHonest } from "../../../scripts/verify-computed-artifacts";

const repoRoot = path.resolve(__dirname, "../../..");
const cmsPath = path.join(repoRoot, "src/data/computed-cms-utilization.json");

describe("CMS utilization provenance", () => {
  it("labels every CPT row with provenanceKind, pufDataYear, and fetchedAt", () => {
    const artifact = JSON.parse(readFileSync(cmsPath, "utf8")) as {
      source: string;
      intendedSource?: string;
      utilizationByCptCode: Array<{
        provenanceKind?: string;
        pufDataYear?: number | "unknown";
        fetchedAt?: string;
      }>;
    };
    expect(artifact.utilizationByCptCode.length).toBeGreaterThan(0);
    for (const row of artifact.utilizationByCptCode) {
      expect(row.provenanceKind).toBeDefined();
      expect(row.pufDataYear).toBeDefined();
      expect(row.fetchedAt).toBeTruthy();
    }
    expect(artifact.source).toMatch(/not retrieved from data\.cms\.gov/);
    expect(artifact.source).toMatch(/in-repo fallback table/);
    expect(artifact.intendedSource).toMatch(/data\.cms\.gov/);
  });

  it("reports the current artifact as 100% hardcoded fallback", () => {
    const provenance = getCmsUtilizationProvenance();
    expect(provenance.allHardcodedFallback).toBe(true);
    expect(provenance.rowCount).toBe(provenance.fallbackRowCount);
    expect(isCmsUtilizationHardcodedFallback()).toBe(true);
  });

  it("fails verify when fallback rows claim a data.cms.gov source", () => {
    expect(() => assertCmsUtilizationSourceHonest(cmsPath)).not.toThrow();
    const dishonest = {
      source:
        "CMS Medicare Provider Utilization and Payment Data (https://data.cms.gov)",
      utilizationByCptCode: [{ provenanceKind: "hardcoded_fallback" }],
    };
    const tmp = path.join(
      repoRoot,
      "src/data/.cms-utilization-dishonest.test.json",
    );
    writeFileSync(tmp, JSON.stringify(dishonest));
    try {
      expect(() => assertCmsUtilizationSourceHonest(tmp)).toThrow(
        /data\.cms\.gov/,
      );
    } finally {
      unlinkSync(tmp);
    }
  });
});
