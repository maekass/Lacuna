import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const REPO_ROOT = path.resolve(__dirname, "../../..");

/** Remaining client JSON importers — convert in a follow-up PR. */
const ALLOWLIST = new Set([
  "src/components/PatientEmpowermentPanel.tsx",
  "src/components/SpaceWhResearchGapsPanel.tsx",
]);

const FORBIDDEN_IMPORTS = [
  /from\s+["']@\/data\/dataset\.verified\.json["']/,
  /from\s+["']@\/lib\/data\/staticDataset["']/,
  /from\s+["']@\/data\/verifiedData["']/,
  /from\s+["'][^"']*dataset\.verified\.json["']/,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "_quarantine" || entry === "node_modules") continue;
      files.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function isUseClient(content: string): boolean {
  const trimmed = content.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "")
    .replace(/^\s*\/\/.*\n/gm, "");
  return /^["']use client["']/.test(trimmed.trimStart());
}

describe("client components do not import the static verified dataset", () => {
  it("forbids dataset.verified.json, staticDataset, and verifiedData outside the allowlist", () => {
    const files = walk(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!isUseClient(content)) continue;
      const relative = path.relative(REPO_ROOT, file);
      if (ALLOWLIST.has(relative)) continue;
      for (const pattern of FORBIDDEN_IMPORTS) {
        if (pattern.test(content)) {
          violations.push(`${relative} matched ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("allowlisted follow-up files still import the JSON (so the list stays honest)", () => {
    for (const relative of ALLOWLIST) {
      const content = readFileSync(path.join(REPO_ROOT, relative), "utf8");
      expect(content).toMatch(/dataset\.verified\.json/);
    }
  });

  it("converted hub surfaces receive mode-aware data from getVerifiedDataset()", () => {
    const hubPage = readFileSync(
      path.join(SRC_ROOT, "app/(product)/page.tsx"),
      "utf8",
    );
    const methodsPage = readFileSync(
      path.join(SRC_ROOT, "app/(product)/methods/page.tsx"),
      "utf8",
    );
    const footnote = readFileSync(
      path.join(SRC_ROOT, "components/DatasetCoverageFootnote.tsx"),
      "utf8",
    );
    const insight = readFileSync(
      path.join(SRC_ROOT, "components/PatientEmpowermentInsight.tsx"),
      "utf8",
    );
    const hub = readFileSync(
      path.join(SRC_ROOT, "app/sections/HubPage.tsx"),
      "utf8",
    );

    expect(hubPage).toMatch(/getVerifiedDataset/);
    expect(hubPage).not.toMatch(/getStaticVerifiedDataset/);
    expect(methodsPage).toMatch(/getVerifiedDataset/);
    expect(footnote).toMatch(/changelog:/);
    expect(footnote).not.toMatch(/staticDataset/);
    expect(insight).toMatch(/patientEmpowermentInsightTypes/);
    expect(insight).not.toMatch(/dataset\.verified\.json/);
    expect(hub).not.toMatch(/getStaticVerifiedDataset/);
    expect(hub).not.toMatch(/getDatasetChangelog\(/);
  });

  it("does not import computed-data-quality-scores from client surfaces", () => {
    const files = walk(SRC_ROOT);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!isUseClient(content)) continue;
      if (content.includes("computed-data-quality-scores")) {
        violations.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
