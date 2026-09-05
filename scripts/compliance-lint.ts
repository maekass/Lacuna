#!/usr/bin/env npx tsx

/**
 * SEC, Penal Code & IP Law Compliance Lint
 *
 * Vets the Lacuna codebase against:
 * - SEC Reg FD (Fair Disclosure) — only publicly disclosed information
 * - No MNPI (Material Non-Public Information)
 * - Data provenance traceability
 * - Descriptive-only analytics labeling
 * - PII / PHI protection (HIPAA)
 * - Real citation verification
 * - Investment disclaimer presence
 * - US Penal Code: No fraud, wire fraud, securities fraud language
 * - IP Law: No copyright/trademark/patent infringement indicators
 * - No unauthorized data scraping or crawling code
 * - No trade secret misappropriation indicators
 *
 * Usage: npx tsx scripts/compliance-lint.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import process from "node:process";
import { extname, join } from "path";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC_DIR = "src";
const __dirname = dirname(fileURLToPath(import.meta.url));
export const COMPLIANCE_EXEMPTIONS_PATH = join(
  __dirname,
  "compliance-lint-exemptions.json",
);

export interface ComplianceViolation {
  file: string;
  line: number;
  rule: string;
  message: string;
}

export interface ComplianceExemption {
  file: string;
  line: number;
  rule: string;
  reason: string;
  addedAt: string;
}

const RULES = {
  // SEC violations
  SYNTHETIC_REVENUE:
    /(?:revenue|valuation|price|dealValue)\s*[=:]\s*(?:5_?000_?000|10_?000_?000|50_?000_?000|100_?000_?000|5000000|10000000|50000000|100000000)/gi,
  PREDICTIVE_CLAIMS:
    /(?:will\s+(?:acquire|merge|buy|sell)|guaranteed\s+return|risk[- ]free|certain\s+to|definitely\s+will|forecast\s+accuracy)/gi,
  PII_PATTERNS: /(?:\b\d{3}-\d{2}-\d{4}\b|\b\d{16}\b)/g,
  HARDCODED_MNPI:
    /(?:insider|confidential\s+source|non[- ]?public\s+info|undisclosed\s+source|leaked|whisper\s+number)/gi,
  CAUSAL_CLAIMS:
    /(?:proves?\s+that|definitively\s+shows?|conclusive(?:ly)?\s+evidence\s+of)/gi,

  // US Penal Code violations (18 USC)
  FRAUD_INDICATORS:
    /(?:wire\s+fraud|securities\s+fraud|pump\s+and\s+dump|ponzi|pyramid\s+scheme|embezzl|kickback|bribe|bribery)/gi,
  DATA_THEFT:
    /(?:stolen\s+data|hacked\s+database|scrape\s+(?:sec|edgar|crunchbase|linkedin)|crawl\s+without\s+(?:permission|license|authorization)|pirate[ds]?\s+(?:data|content|api))/gi,

  // IP Law violations (17 USC Copyright, 15 USC Trademark, 35 USC Patent)
  COPYRIGHT_INFRINGEMENT:
    /(?:copied\s+from\s+(?:without|no)|ripped\s+from|plagiariz|reproduced\s+without\s+(?:permission|license|authorization)|all\s+rights\s+reserved.*(?:used|reproduced)\s+without)/gi,
  TRADEMARK_VIOLATION:
    /(?:impersonat(?:e|ing)\s+(?:brand|company|trademark)|counterfeit|fake\s+(?:brand|logo|trademark)|unauthorized\s+use\s+of\s+(?:trademark|logo|brand\s+name))/gi,
  PATENT_INFRINGEMENT:
    /(?:patent\s+(?:infring|violat)|willfully\s+infring|stolen\s+(?:patent|IP|intellectual\s+property)|misappropriat(?:e|ing)\s+(?:trade\s+secret|proprietary))/gi,
  TRADE_SECRET_THEFT:
    /(?:trade\s+secret\s+(?:theft|misappropriat|stolen|leaked)|proprietary\s+(?:algorithm|code|data)\s+(?:stolen|leaked|copied|taken))/gi,

  // HIPAA / PHI
  PHI_PATTERNS:
    /(?:patient\s+(?:name|dob|birth|address|phone|ssn|diagnosis\s+code)|medical\s+record\s+number|health\s+record\s+number|\bMRN\b\s*[=:]\s*\d)/gi,
};

const DISCLAIMER_FILES = ["src/app/page.tsx", "src/app/deals/page.tsx"];

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" || entry === "__tests__" ||
        entry === "_quarantine"
      ) continue;
      results.push(...walkDir(fullPath, exts));
    } else if (exts.includes(extname(entry))) {
      if (entry.includes(".test.")) continue;
      results.push(fullPath);
    }
  }
  return results;
}

function lintFile(
  path: string,
  content: string,
  violations: ComplianceViolation[],
) {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (RULES.SYNTHETIC_REVENUE.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R1: No synthetic financials",
        message:
          "Hardcoded revenue/valuation default — may be mistaken for real data. Use 0 or null.",
      });
    }
    RULES.SYNTHETIC_REVENUE.lastIndex = 0;

    if (RULES.PREDICTIVE_CLAIMS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R2: No predictive claims",
        message:
          "Predictive language — Lacuna is descriptive only. Rephrase as historical observation.",
      });
    }
    RULES.PREDICTIVE_CLAIMS.lastIndex = 0;

    if (RULES.HARDCODED_MNPI.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R3: No MNPI",
        message:
          "Reference to non-public/confidential info — violates SEC Reg FD.",
      });
    }
    RULES.HARDCODED_MNPI.lastIndex = 0;

    if (RULES.CAUSAL_CLAIMS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R4: No unsupported causation",
        message:
          "Causal claim without evidence qualifier — use 'associated with' or 'correlated with'.",
      });
    }
    RULES.CAUSAL_CLAIMS.lastIndex = 0;

    if (RULES.PII_PATTERNS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R5: No PII",
        message:
          "Possible PII (SSN or card number) detected — remove immediately.",
      });
    }
    RULES.PII_PATTERNS.lastIndex = 0;

    // R8: US Penal Code — fraud indicators (18 USC §1343, §1344, §1348)
    if (RULES.FRAUD_INDICATORS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R8: No fraud language (18 USC)",
        message:
          "Fraud-related language detected — potential securities/wire fraud indicator. Remove or rephrase.",
      });
    }
    RULES.FRAUD_INDICATORS.lastIndex = 0;

    // R9: US Penal Code — data theft (18 USC §1030, §1832)
    if (RULES.DATA_THEFT.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R9: No data theft (18 USC §1030)",
        message:
          "Unauthorized data scraping/theft indicator — violates CFAA and EEA. Remove.",
      });
    }
    RULES.DATA_THEFT.lastIndex = 0;

    // R10: IP Law — copyright infringement (17 USC §501)
    if (RULES.COPYRIGHT_INFRINGEMENT.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R10: No copyright infringement (17 USC)",
        message:
          "Copyright infringement indicator — content reproduced without permission. Remove or properly license.",
      });
    }
    RULES.COPYRIGHT_INFRINGEMENT.lastIndex = 0;

    // R11: IP Law — trademark violation (15 USC §1114)
    if (RULES.TRADEMARK_VIOLATION.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R11: No trademark violation (15 USC)",
        message:
          "Trademark violation indicator — unauthorized use of brand/trademark. Remove.",
      });
    }
    RULES.TRADEMARK_VIOLATION.lastIndex = 0;

    // R12: IP Law — patent infringement (35 USC §271)
    if (RULES.PATENT_INFRINGEMENT.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R12: No patent infringement (35 USC)",
        message:
          "Patent infringement indicator — willful infringement carries treble damages. Remove.",
      });
    }
    RULES.PATENT_INFRINGEMENT.lastIndex = 0;

    // R13: IP Law — trade secret theft (18 USC §1832, DTSA)
    if (RULES.TRADE_SECRET_THEFT.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R13: No trade secret theft (DTSA)",
        message:
          "Trade secret misappropriation indicator — violates DTSA and EEA. Remove immediately.",
      });
    }
    RULES.TRADE_SECRET_THEFT.lastIndex = 0;

    // R14: HIPAA — PHI patterns
    if (RULES.PHI_PATTERNS.test(line)) {
      violations.push({
        file: path,
        line: lineNum,
        rule: "R14: No PHI (HIPAA)",
        message:
          "Possible Protected Health Information detected — violates HIPAA. Remove or de-identify.",
      });
    }
    RULES.PHI_PATTERNS.lastIndex = 0;
  }
}

function checkDisclaimers(violations: ComplianceViolation[]) {
  for (const file of DISCLAIMER_FILES) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const hasDisclaimer =
      /not\s+investment\s+advice|descriptive\s+analytics\s+only|not\s+a\s+substitute\s+for/i
        .test(content);
    if (!hasDisclaimer) {
      violations.push({
        file,
        line: 0,
        rule: "R6: Disclaimer required",
        message:
          "Missing 'not investment advice' / 'descriptive analytics only' disclaimer.",
      });
    }
  }
}

function checkCitations(violations: ComplianceViolation[]) {
  const datasetPath = "src/data/dataset.verified.json";
  if (!existsSync(datasetPath)) return;
  try {
    const content = readFileSync(datasetPath, "utf-8");
    const data = JSON.parse(content);
    const companies = data.companies ?? data.deals ?? [];
    let uncitedCount = 0;

    for (const entry of companies) {
      if (
        !entry.sources && !entry.source && !entry.citation && !entry.provenance
      ) {
        uncitedCount++;
      }
    }

    if (uncitedCount > 0) {
      violations.push({
        file: datasetPath,
        line: 0,
        rule: "R7: Data provenance",
        message:
          `${uncitedCount} entries missing source/citation — every record must have traceable provenance.`,
      });
    }
  } catch {
    // JSON parse error — skip
  }
}

function exemptionKey(entry: {
  file: string;
  line: number;
  rule: string;
}): string {
  return `${entry.file}::${entry.line}::${entry.rule}`;
}

export function loadComplianceExemptions(
  filePath = COMPLIANCE_EXEMPTIONS_PATH,
): ComplianceExemption[] {
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, "utf-8")) as ComplianceExemption[];
}

export function validateComplianceExemptions(
  exemptions: readonly ComplianceExemption[],
  violations: readonly ComplianceViolation[],
): string[] {
  const errors: string[] = [];
  const violationKeys = new Set(violations.map(exemptionKey));
  for (const exemption of exemptions) {
    if (!exemption.reason?.trim() || !exemption.addedAt?.trim()) {
      errors.push(
        `Exemption ${
          exemptionKey(exemption)
        } is missing a written reason or addedAt.`,
      );
    }
    if (!violationKeys.has(exemptionKey(exemption))) {
      errors.push(
        `Stale compliance exemption ${
          exemptionKey(exemption)
        } — line no longer matches a violation.`,
      );
    }
  }
  return errors;
}

export function collectComplianceViolations(): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const files = walkDir(SRC_DIR, [".ts", ".tsx", ".js", ".jsx"]);
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    lintFile(file, content, violations);
  }
  checkDisclaimers(violations);
  checkCitations(violations);
  return violations;
}

export function applyComplianceExemptions(
  violations: readonly ComplianceViolation[],
  exemptions: readonly ComplianceExemption[],
): ComplianceViolation[] {
  const exempted = new Set(exemptions.map(exemptionKey));
  return violations.filter((violation) =>
    !exempted.has(exemptionKey(violation))
  );
}

export function runComplianceLint(): {
  raw: ComplianceViolation[];
  remaining: ComplianceViolation[];
  exemptionErrors: string[];
} {
  const raw = collectComplianceViolations();
  const exemptions = loadComplianceExemptions();
  const exemptionErrors = validateComplianceExemptions(exemptions, raw);
  return {
    raw,
    remaining: applyComplianceExemptions(raw, exemptions),
    exemptionErrors,
  };
}

export function main(): number {
  console.log("🔍 Running SEC, Penal Code & IP Law Compliance Lint...\n");
  const { remaining, exemptionErrors } = runComplianceLint();
  if (exemptionErrors.length > 0) {
    console.log(
      `❌ ${exemptionErrors.length} compliance exemption error(s):\n`,
    );
    for (const error of exemptionErrors) {
      console.log(`  ${error}\n`);
    }
    return 1;
  }
  if (remaining.length === 0) {
    console.log("✅ All compliance checks passed — no violations found.");
    return 0;
  }
  console.log(`❌ ${remaining.length} compliance violation(s) found:\n`);
  for (const v of remaining) {
    console.log(`  ${v.rule}`);
    console.log(`  📁 ${v.file}:${v.line}`);
    console.log(`  ⚠️  ${v.message}\n`);
  }
  return 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
