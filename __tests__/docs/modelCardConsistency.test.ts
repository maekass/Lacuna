import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import summary from "@/data/computed-dataset-summary.json";

const REPO_ROOT = path.resolve(__dirname, "../..");
const CARD_PATH = path.join(REPO_ROOT, "docs/MODEL_CARD.md");
const COMPONENTS_ROOT = path.join(REPO_ROOT, "src/components");

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

  it("states the live dataset version and verified-deal count", () => {
    expect(card).toContain(
      `**Dataset version**: ${summary.provenance.datasetVersion}`,
    );
    expect(card).toContain(
      `**Verified acquisitions**: ${summary.headline.verifiedDeals}`,
    );
    expect(card).toContain(summary.provenance.datasetHash);
  });

  it("does not repeat the retired 'not called a predictor' claim", () => {
    expect(card.toLowerCase()).not.toContain("not called a");
  });

  it("has no P(exit 5y) or Model est. labels under src/components/", () => {
    const violations: string[] = [];
    for (const file of walk(COMPONENTS_ROOT)) {
      const text = readFileSync(file, "utf8");
      if (
        /P\(exit(?:&nbsp;)?5y\)/.test(text) ||
        text.includes("P(exit 5y)") ||
        text.includes("Model est.")
      ) {
        violations.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
