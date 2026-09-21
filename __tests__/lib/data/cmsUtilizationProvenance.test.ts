import { readFileSync } from "node:fs";
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
  it("withholds CPT rows instead of publishing hardcoded fallback $M totals", () => {
    const artifact = JSON.parse(readFileSync(cmsPath, "utf8")) as {
      source: string;
      evidenceStatus?: string;
      utilizationByCptCode: unknown[];
      sectors?: Array<{ estimatedAnnualReimbursement: number | null }>;
    };
    expect(artifact.evidenceStatus).toBe("withheld");
    expect(artifact.utilizationByCptCode).toEqual([]);
    expect(artifact.source).toMatch(/not retrieved from data\.cms\.gov/);
    expect(
      artifact.sectors?.every((s) => s.estimatedAnnualReimbursement === null),
    ).toBe(true);
  });

  it("reports the current artifact as withheld, not hardcoded fallback", () => {
    const provenance = getCmsUtilizationProvenance();
    expect(provenance.withheld).toBe(true);
    expect(provenance.rowCount).toBe(0);
    expect(provenance.fallbackRowCount).toBe(0);
    expect(isCmsUtilizationHardcodedFallback()).toBe(false);
  });

  it("fails verify when fallback rows claim a data.cms.gov source", () => {
    expect(() => assertCmsUtilizationSourceHonest(cmsPath)).not.toThrow();
  });
});
