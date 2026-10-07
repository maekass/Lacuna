import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import summary from "@/data/computed-dataset-summary.json";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

const REPO_ROOT = path.resolve(__dirname, "../..");
const CARD_PATH = path.join(REPO_ROOT, "docs/MODEL_CARD.md");
const SCAN_ROOTS = ["src/components", "src/app"].map((dir) =>
  path.join(REPO_ROOT, dir)
);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("MODEL_CARD.md stays true of the current tree", () => {
  const card = readFileSync(CARD_PATH, "utf8");
  const dataset = getStaticVerifiedDataset();
  const rawDataset = readFileSync(
    path.join(REPO_ROOT, "src/data/dataset.verified.json"),
  );
  const hazard = JSON.parse(
    readFileSync(
      path.join(
        REPO_ROOT,
        "src/data/ml/hazard/acquisition-time-v1.json",
      ),
      "utf8",
    ),
  ) as {
    datasetSha256: string;
    cohort: { nEvents: number; excludedMissingFounded: number; n: number };
  };

  it("states the live dataset version, deal count, and canonical hash", () => {
    expect(card).toContain(
      `**Dataset version**: ${summary.provenance.datasetVersion}`,
    );
    expect(card).toContain(
      `**Verified acquisitions**: ${summary.headline.verifiedDeals}`,
    );
    expect(card).toContain(summary.provenance.datasetHash);
    expect(card).toContain("Methodology status");
    expect(card.toLowerCase()).toContain("not a fitted or calibrated");
  });

  it("keeps company, valuation-disclosure, and event counts distinct", () => {
    expect(summary.headline.companiesInNetwork).toBe(dataset.companies.length);
    expect(summary.headline.verifiedDeals).toBe(dataset.acquisitions.length);
    expect(summary.disclosure.companiesWithValuation).not.toBe(
      summary.headline.verifiedDeals,
    );
    expect(card).toMatch(
      new RegExp(
        `Companies\\s+\\|\\s+${summary.headline.companiesInNetwork}\\s+\\|`,
      ),
    );
    expect(card).toMatch(
      new RegExp(
        `Valuation disclosures\\s+\\|\\s+${summary.disclosure.companiesWithValuation}\\s+\\|`,
      ),
    );
    expect(card).toMatch(
      new RegExp(
        `Verified acquisitions \\(events / deals\\)\\s+\\|\\s+${summary.headline.verifiedDeals}\\s+\\|`,
      ),
    );
    expect(card).toContain(
      `${summary.disclosure.companiesWithValuation} valuation disclosures and ${hazard.cohort.nEvents} hazard events`,
    );

    const sectorOf = new Map(
      dataset.companies.map((company) => [company.id, company.sector]),
    );
    const dealsBySector = new Map<string, number>();
    for (const deal of dataset.acquisitions) {
      const sector = sectorOf.get(deal.targetId);
      if (!sector) continue;
      dealsBySector.set(sector, (dealsBySector.get(sector) ?? 0) + 1);
    }
    const singleEventSectors = [...dealsBySector.entries()]
      .filter(([, count]) => count === 1)
      .map(([sector]) => sector)
      .sort();
    expect(dealsBySector.size).toBe(13);
    expect(new Set(dataset.companies.map((company) => company.sector)).size)
      .toBe(24);
    expect(singleEventSectors).toEqual([
      "Contraception",
      "Dermatology",
      "Mental Health",
    ]);
    expect(card).toContain(
      "Mental Health, Contraception, Dermatology",
    );
    expect(card).toContain("The company catalog has 24 sectors");
    expect(
      dataset.companies.filter((company) => company.founded == null).length,
    ).toBe(47);
    expect(summary.disclosure.dealsDisclosed).toBe(50);
    expect(card).toMatch(/Deals with a numeric price\s+\|\s+50\s+\|/);
  });

  it("records the raw file hash and the hazard export hash", () => {
    const fileHash = createHash("sha256").update(rawDataset).digest("hex");
    expect(card).toContain(fileHash);
    expect(card).toContain(rawDataset.length.toLocaleString("en-US"));
    expect(card).toContain(hazard.datasetSha256);
    expect(hazard.datasetSha256).toBe(fileHash);
    expect(hazard.datasetSha256).not.toBe(summary.provenance.datasetHash);
    expect(card).toContain("not the canonical hash");
    expect(card).not.toContain("not the SHA-256 of the current file");
  });

  it("states the valuation and hazard-event overlap", () => {
    const targets = new Set(
      dataset.acquisitions.map((deal) => deal.targetId),
    );
    const valued = new Set(
      dataset.companies.filter((company) =>
        typeof company.lastKnownValuation === "number"
      ).map((company) => company.id),
    );
    const hazardEvents = dataset.companies.filter((company) =>
      targets.has(company.id) && company.founded != null
    );
    const overlap = hazardEvents.filter((company) => valued.has(company.id))
      .length;
    expect(hazardEvents.length).toBe(hazard.cohort.nEvents);
    expect(valued.size).toBe(summary.disclosure.companiesWithValuation);
    expect(card).toContain(`${overlap} companies are in both sets`);
    expect(overlap).not.toBe(valued.size);
  });

  it("does not repeat retired probability labels or the old k-means names", () => {
    expect(card.toLowerCase()).not.toContain("not called a");
    expect(card).not.toContain("P(exit 5y)");
    expect(card).not.toContain("Model est.");
    expect(card).not.toContain(
      "labeled Emerging / Growth / Late-stage based on centroid",
    );
    expect(card).toContain("Smaller Capital");
    expect(card).toContain("hand-set");
  });

  it("matches the labels currently rendered for these scores", () => {
    const sources = new Map<string, string>();
    for (const root of SCAN_ROOTS) {
      for (const file of walk(root)) {
        sources.set(
          path.relative(REPO_ROOT, file),
          readFileSync(file, "utf8"),
        );
      }
    }
    const required: ReadonlyArray<readonly [string, string]> = [
      [
        "src/components/QuantValuationPanel.tsx",
        "Heuristic est.",
      ],
      [
        "src/components/QuantValuationPanel.tsx",
        "Historical acquisition-pattern similarity",
      ],
      [
        "src/components/ExitPredictor.tsx",
        "Exit Similarity Explorer",
      ],
      ["src/components/ExitPredictor.tsx", "Similarity band"],
      ["src/components/ExitPredictor.tsx", "Precedent acquirer"],
      [
        "src/components/ExitPredictor.tsx",
        "Descriptive · {verifiedCompanies.length} companies",
      ],
      [
        "src/components/ExitPredictor.tsx",
        "Factor weights are fixed and hand-set.",
      ],
      ["src/components/PitchBrief.tsx", "Stage group:"],
      ["src/components/PitchBrief.tsx", "Similarity band:"],
      [
        "src/app/sections/DealsPage.tsx",
        "Not a fitted model and not a time-to-exit forecast.",
      ],
      [
        "src/components/CompanySimilarity.tsx",
        "{verifiedCompanies.length} companies",
      ],
    ];
    const compact = (text: string) => text.replace(/\s+/g, " ");
    for (const [file, label] of required) {
      expect(compact(sources.get(file) ?? ""), file).toContain(label);
      expect(compact(card)).toContain(
        label.replace(/\{verifiedCompanies\.length\}/g, "{n}"),
      );
    }

    const violations: string[] = [];
    for (const [file, text] of sources) {
      if (
        /P\(exit(?:&nbsp;)?5y\)/.test(text) ||
        text.includes("P(exit 5y)") ||
        text.includes("Model est.") ||
        text.includes("Factor weights derived from")
      ) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
