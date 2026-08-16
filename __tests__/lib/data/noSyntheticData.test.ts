import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(__dirname, "../../../src");

/** Patterns that indicate fabricated M&A or outcome panels in app code. */
const FORBIDDEN_IN_SRC = [
  /\bmaDeals\b/,
  /\bVALIDATION_DATA\b/,
  /\bpreAcquisitionOAIS\b/,
  /\bAlpha Health\b/,
  /\bBig Pharma Co\b/,
  /expectedScaling:\s*[\d.]+/,
  /actualScaling:\s*[\d.]+/,
  /\bgenerateMarketSizing\b/,
  /\bfounder-pattern-analyzer\b/,
  /totalAddressableMarket:\s*base\.tam/,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "_quarantine") continue;
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("no synthetic M&A demo data in src/", () => {
  it("does not contain known synthetic deal panels or maDeals stubs", () => {
    const files = walk(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN_IN_SRC) {
        if (pattern.test(content)) {
          violations.push(
            `${path.relative(SRC_ROOT, file)} matched ${pattern}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("deal dossier does not import keyword classifiers or invented TAM panels", () => {
    const files = [
      "app/sections/DealDetailPage.tsx",
      "lib/deals/getDealDetailView.ts",
      "lib/deals/empowermentContextForDeal.ts",
      "lib/gamma/formatDealBrief.ts",
      "app/sections/DealsPage.tsx",
      "components/DealEmpowermentContext.tsx",
      "lib/data/verifiedDataHelpers.ts",
    ];
    const forbidden = [
      /\bclassifyEvidence\b/,
      /\bgenerateMarketSizing\b/,
      /\bCommercializationReadiness\b/,
      /\bSTRATEGIC_ACQUIRERS\b/,
      /\bPipelineStatusStrip\b/,
      /\bbuildPatientEmpowermentSnapshot\b/,
      /\bmatchKeywords\b/,
      /\bgenerateText\b/,
      /\bgenerateObject\b/,
      /\bgenerateAcquisitionInsights\b/,
      /\bitem201Excerpt\b/,
    ];
    const violations: string[] = [];
    for (const relative of files) {
      const content = readFileSync(path.join(SRC_ROOT, relative), "utf8");
      for (const pattern of forbidden) {
        if (pattern.test(content)) {
          violations.push(`${relative} matched ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("deal economics never fall back to lastKnownValuation as a second price", () => {
    const economics = readFileSync(
      path.join(SRC_ROOT, "components/DealEconomicsCard.tsx"),
      "utf8",
    );
    expect(economics).not.toMatch(/lastKnownValuation/);
    const page = readFileSync(
      path.join(SRC_ROOT, "app/sections/DealDetailPage.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/deal\.target\.lastKnownValuation/);
    expect(page).toMatch(/targetLastKnownValuation/);
  });

  it("deal dossier leaves strategicRationale as curated JSON copy", () => {
    const page = readFileSync(
      path.join(SRC_ROOT, "app/sections/DealDetailPage.tsx"),
      "utf8",
    );
    expect(page).toMatch(/acq\.strategicRationale/);
    expect(page).toMatch(/Curated copy from the verified dataset/);
    expect(page).toMatch(/not an 8-K LLM summary/);
    const draft = readFileSync(
      path.join(SRC_ROOT, "lib/ingestion/buildPromotionDraft.ts"),
      "utf8",
    );
    expect(draft).not.toMatch(
      /strategicRationale:\s*buildStrategicRationale\(deal\)/,
    );
    expect(draft).toMatch(/resolveStrategicRationale\(reviewer\)/);
    expect(draft).not.toMatch(
      /item201Excerpt[\s\S]{0,80}strategicRationale/,
    );
  });

  it("does not map lastKnownValuation onto revenue as a TAM fallback", () => {
    const mapper = readFileSync(
      path.join(SRC_ROOT, "lib/data/companyProfileMapper.ts"),
      "utf8",
    );
    expect(mapper).not.toMatch(/revenue:\s*company\.lastKnownValuation/);
    const reimbursement = readFileSync(
      path.join(SRC_ROOT, "components/ReimbursementIntelligenceDashboard.tsx"),
      "utf8",
    );
    expect(reimbursement).not.toMatch(/revenue:\s*company\.lastKnownValuation/);
  });
});

describe("test fixtures use verified JSON slice", () => {
  it("minimalVerifiedDataset references real verified company names", async () => {
    const { minimalVerifiedDataset } = await import("../../helpers/fixtures");
    expect(
      minimalVerifiedDataset.companies.some((c) =>
        c.name === "Biotheranostics"
      ),
    ).toBe(true);
    expect(minimalVerifiedDataset.acquisitions[0].targetName).toBe(
      "Biotheranostics",
    );
    expect(minimalVerifiedDataset.provenance.sources.length).toBeGreaterThan(0);
  });
});
