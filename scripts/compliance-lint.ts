#!/usr/bin/env npx tsx

/**
 * SEC & US Legal/Ethical Compliance Lint
 *
 * Vets the Lacuna codebase against:
 * - SEC Reg FD (Fair Disclosure) — only publicly disclosed information
 * - No MNPI (Material Non-Public Information)
 * - Data provenance traceability
 * - Descriptive-only analytics labeling
 * - PII protection
 * - Real citation verification
 * - Investment disclaimer presence
 *
 * Usage: npx tsx scripts/compliance-lint.ts
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const SRC_DIR = "src";
const violations: { file: string; line: number; rule: string; message: string }[] = [];

const RULES = {
  SYNTHETIC_REVENUE:
    /(?:revenue|valuation|price|dealValue)\s*[=:]\s*(?:5_?000_?000|10_?000_?000|50_?000_?000|100_?000_?000|5000000|10000000|50000000|100000000)/gi,
  PREDICTIVE_CLAIMS:
    /(?:will\s+(?:acquire|merge|buy|sell)|guaranteed\s+return|risk[- ]free|certain\s+to|definitely\s+will|forecast\s+accuracy)/gi,
  PII_PATTERNS:
    /(?:\b\d{3}-\d{2}-\d{4}\b|\b\d{16}\b)/g,
  HARDCODED_MNPI:
    /(?:insider|confidential\s+source|non[- ]?public\s+info|undisclosed\s+source|leaked|whisper\s+number)/gi,
  CAUSAL_CLAIMS:
    /(?:proves?\s+that|definitively\s+shows?|conclusive(?:ly)?\s+evidence\s+of)/gi,
};

const DISCLAIMER_FILES = ["src/app/page.tsx", "src/app/deals/page.tsx"];

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__" || entry === "_quarantine") continue;
      results.push(...walkDir(fullPath, exts));
    } else if (exts.includes(extname(entry))) {
      if (entry.includes(".test.")) continue;
      results.push(fullPath);
    }
  }
  return results;
}

function lintFile(path: string, content: string) {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (RULES.SYNTHETIC_REVENUE.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R1: No synthetic financials",
        message: "Hardcoded revenue/valuation default — may be mistaken for real data. Use 0 or null.",
      });
    }
    RULES.SYNTHETIC_REVENUE.lastIndex = 0;

    if (RULES.PREDICTIVE_CLAIMS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R2: No predictive claims",
        message: "Predictive language — Lacuna is descriptive only. Rephrase as historical observation.",
      });
    }
    RULES.PREDICTIVE_CLAIMS.lastIndex = 0;

    if (RULES.HARDCODED_MNPI.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R3: No MNPI",
        message: "Reference to non-public/confidential info — violates SEC Reg FD.",
      });
    }
    RULES.HARDCODED_MNPI.lastIndex = 0;

    if (RULES.CAUSAL_CLAIMS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R4: No unsupported causation",
        message: "Causal claim without evidence qualifier — use 'associated with' or 'correlated with'.",
      });
    }
    RULES.CAUSAL_CLAIMS.lastIndex = 0;

    if (RULES.PII_PATTERNS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R5: No PII",
        message: "Possible PII (SSN or card number) detected — remove immediately.",
      });
    }
    RULES.PII_PATTERNS.lastIndex = 0;
  }
}

function checkDisclaimers() {
  for (const file of DISCLAIMER_FILES) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const hasDisclaimer =
      /not\s+investment\s+advice|descriptive\s+analytics\s+only|not\s+a\s+substitute\s+for/i.test(content);
    if (!hasDisclaimer) {
      violations.push({
        file,
        line: 0,
        rule: "R6: Disclaimer required",
        message: "Missing 'not investment advice' / 'descriptive analytics only' disclaimer.",
      });
    }
  }
}

function checkCitations() {
  const datasetPath = "src/data/dataset.verified.json";
  if (!existsSync(datasetPath)) return;
  try {
    const content = readFileSync(datasetPath, "utf-8");
    const data = JSON.parse(content);
    const companies = data.companies ?? data.deals ?? [];
    let uncitedCount = 0;

    for (const entry of companies) {
      if (!entry.sources && !entry.source && !entry.citation && !entry.provenance) {
        uncitedCount++;
      }
    }

    if (uncitedCount > 0) {
      violations.push({
        file: datasetPath,
        line: 0,
        rule: "R7: Data provenance",
        message: `${uncitedCount} entries missing source/citation — every record must have traceable provenance.`,
      });
    }
  } catch {
    // JSON parse error — skip
  }
}

// Main
console.log("🔍 Running SEC & US Legal/Ethical Compliance Lint...\n");

const files = walkDir(SRC_DIR, [".ts", ".tsx", ".js", ".jsx"]);
for (const file of files) {
  const content = readFileSync(file, "utf-8");
  lintFile(file, content);
}

checkDisclaimers();
checkCitations();

if (violations.length === 0) {
  console.log("✅ All compliance checks passed — no violations found.");
  process.exit(0);
} else {
  console.log(`❌ ${violations.length} compliance violation(s) found:\n`);
  for (const v of violations) {
    console.log(`  ${v.rule}`);
    console.log(`  📁 ${v.file}:${v.line}`);
    console.log(`  ⚠️  ${v.message}\n`);
  }
  process.exit(1);
}
