import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("deriveEmpiricalPriors call sites", () => {
  it("pass the evidence-ledger funding denominator gate outside the module", () => {
    const callers = [...sourceFiles("src"), ...sourceFiles("scripts")].filter(
      (path) =>
        !path.endsWith(join("quant", "empiricalPriors.ts")) &&
        readFileSync(path, "utf8").includes("deriveEmpiricalPriors("),
    );
    expect(callers.length).toBeGreaterThan(0);
    for (const path of callers) {
      expect(readFileSync(path, "utf8"), path).toContain(
        "admitFundingDenominator",
      );
    }
  });
});
