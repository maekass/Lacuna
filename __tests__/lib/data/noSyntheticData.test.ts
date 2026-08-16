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
      "app/(product)/deals/[id]/page.tsx",
      "lib/deals/getDealDetailView.ts",
      "lib/deals/empowermentContextForDeal.ts",
      "lib/deals/keyedRegulatoryCitations.ts",
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
      /\benrichCompanyFromPublicApis\b/,
      /\bfetchClinicalTrialsGov\b/,
      /\bfetchOpenFda\b/,
      /\/api\/clinical-trials/,
      /\/api\/evidence\/clinical-trials/,
      /\/api\/evidence\/fda/,
      /\/api\/enrichment\/company/,
      /\bClinicalTrialTracker\b/,
      /\bEvidenceMaturityDashboard\b/,
      /\bclinicaltrials-mcp-connector\b/,
      /\bopenfda-mcp-connector\b/,
      /\bcms-reimbursement-connector\b/,
      /\bcmsUtilizationProvider\b/,
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

  it("deal dossier does not render live ClinicalTrials/FDA/CMS name search", () => {
    const page = readFileSync(
      path.join(SRC_ROOT, "app/sections/DealDetailPage.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/ClinicalTrials|openFDA|\/api\/enrichment/);
    expect(page).not.toMatch(/cmsUtilization|cms-reimbursement/);
    const view = readFileSync(
      path.join(SRC_ROOT, "lib/deals/getDealDetailView.ts"),
      "utf8",
    );
    expect(view).toMatch(/keyedRegulatoryCitationsForTarget/);
    expect(view).not.toMatch(/enrichCompanyFromPublicApis/);
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

  it("deal economics, comps, and dual-source do not import research heuristics", () => {
    const files = [
      "components/DealEconomicsCard.tsx",
      "components/DealComparableTables.tsx",
      "components/EvidenceLadder.tsx",
      "lib/deals/evidenceLadder.ts",
      "lib/deals/listComparableDeals.ts",
      "lib/deals/listAcquirerDeals.ts",
      "lib/deals/dealTiming.ts",
      "lib/deals/dealMetricModels.ts",
      "lib/deals/getDealDetailView.ts",
      "lib/gamma/formatDealBrief.ts",
      "components/ValuationMatrix.tsx",
      "components/ValuationMatrixGrid.tsx",
      "components/QuantValuationPanel.tsx",
    ];
    const forbidden = [
      /patientEmpowermentPipeline/,
      /buildPatientEmpowermentSnapshot/,
      /acquirer-prediction-engine/,
      /cms-reimbursement-connector/,
      /burdenCapitalGap/,
      /classifyEvidence/,
      /matchKeywords/,
      /selectVerifiedComparables/,
      /analyzeCompetitiveDynamics/,
      /heuristicProvenance/,
      /gapScoreForSector/,
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

  it("deals-page similarity does not use research affinity language", () => {
    const similarity = readFileSync(
      path.join(SRC_ROOT, "components/CompanySimilarity.tsx"),
      "utf8",
    );
    expect(similarity).not.toMatch(/Sector affinity/);
    expect(similarity).toMatch(/Sector overlap/);
    expect(similarity).toMatch(/not a valuation peer set/);
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
