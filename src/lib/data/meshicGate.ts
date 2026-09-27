import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseVerifiedDataset, type VerifiedDataset } from "./datasetSchema";
import {
  applyEconomicEvidenceLedger,
  parseEconomicEvidenceLedger,
} from "./evidenceLedger";
import { auditEconomicEvidence } from "./evidenceLedgerAudit";
import {
  auditEconomicDisplays,
  type ClaimException,
  EXIT_ANALYSIS_CLAIM_FILES,
  scanClaimLanguage,
  validateClaimExceptions,
} from "./meshicClaimScan";
import { blockingFinding, type MeshicFinding } from "./meshicFindings";
import {
  auditRepositoryLineage,
  scanRawDatasetImports,
} from "./meshicLineageScan";
import {
  scanDescriptiveZeroCoercion,
  scanReplaySafety,
  type SourceFile,
} from "./meshicReplayScan";

const WALK_ROOTS = ["src", "scripts"];

function walk(dir: string, root: string, out: SourceFile[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, root, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith(".test.ts")) {
      continue;
    }
    const path = relative(root, full).split("\\").join("/");
    out.push({ path, content: readFileSync(full, "utf8") });
  }
}

function readExceptions(root: string): {
  exceptions: ClaimException[];
  findings: MeshicFinding[];
} {
  const path = join(root, "scripts/meshic-claim-exceptions.json");
  if (!existsSync(path)) {
    return {
      exceptions: [],
      findings: [blockingFinding(
        "claim.invalidException",
        "scripts/meshic-claim-exceptions.json",
        "The claim-exception registry is missing.",
        "Add scripts/meshic-claim-exceptions.json. Use an empty exceptions array when there are no bounded-model exemptions.",
      )],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      exceptions?: ClaimException[];
    };
    if (!Array.isArray(parsed.exceptions)) {
      return {
        exceptions: [],
        findings: [blockingFinding(
          "claim.invalidException",
          "scripts/meshic-claim-exceptions.json",
          "exceptions must be an array.",
          "Set exceptions to [] or to explicit bounded-model entries. Do not omit the key.",
        )],
      };
    }
    return { exceptions: parsed.exceptions, findings: [] };
  } catch (error) {
    return {
      exceptions: [],
      findings: [blockingFinding(
        "claim.invalidException",
        "scripts/meshic-claim-exceptions.json",
        error instanceof Error
          ? error.message
          : "Claim exception registry is not valid JSON.",
        "Restore valid JSON. A broken registry must not silently drop claim matches.",
      )],
    };
  }
}

function replayFiles(files: readonly SourceFile[]): SourceFile[] {
  return files.filter((file) =>
    file.path.startsWith("src/lib/") ||
    EXIT_ANALYSIS_CLAIM_FILES.includes(
      file.path as (typeof EXIT_ANALYSIS_CLAIM_FILES)[number],
    )
  );
}

/**
 * Provenance and historical-replay checks for the working tree.
 * Does not write files, call a model, or invent evidence.
 */
export function collectProvenanceGateFindings(root: string): MeshicFinding[] {
  const files = walkSources(root);
  const findings: MeshicFinding[] = [];
  const datasetPath = join(root, "src/data/dataset.verified.json");
  const ledgerPath = join(root, "src/data/evidence.verified.json");
  let rawDataset: unknown;
  let rawLedger: unknown;
  try {
    rawDataset = JSON.parse(readFileSync(datasetPath, "utf8"));
    rawLedger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  } catch (error) {
    findings.push(blockingFinding(
      "ledger.malformedJson",
      existsSync(ledgerPath) ? ledgerPath : datasetPath,
      error instanceof Error
        ? error.message
        : "Verified dataset or evidence ledger is not valid JSON.",
      "Restore valid JSON. Do not replace the file with fabricated records.",
    ));
    return findings;
  }

  const rawCompanies = Array.isArray(
      (rawDataset as { companies?: unknown }).companies,
    )
    ? (rawDataset as { companies: Record<string, unknown>[] }).companies
    : [];

  let materialized: VerifiedDataset | null = null;
  try {
    materialized = applyEconomicEvidenceLedger(
      parseVerifiedDataset(rawDataset),
      parseEconomicEvidenceLedger(rawLedger),
    );
  } catch {
    materialized = null;
  }

  findings.push(...auditEconomicEvidence({
    ledgerRaw: rawLedger,
    rawCompanies,
    materialized,
    ledgerLocation: "src/data/evidence.verified.json",
  }));

  const logicFiles = replayFiles(files).filter((file) =>
    !file.path.includes("/meshic") &&
    !file.path.endsWith("/evidenceLedgerAudit.ts")
  );
  findings.push(...scanReplaySafety(logicFiles));
  findings.push(...scanDescriptiveZeroCoercion(files));
  findings.push(...scanRawDatasetImports(files));

  const claimFiles = EXIT_ANALYSIS_CLAIM_FILES.map((path) => {
    const found = files.find((file) => file.path === path);
    return found ?? { path, content: "" };
  }).filter((file) => file.content.length > 0);
  const registry = readExceptions(root);
  findings.push(...registry.findings);
  findings.push(...scanClaimLanguage({
    files: claimFiles,
    exceptions: registry.exceptions,
  }));
  findings.push(...validateClaimExceptions({
    exceptions: registry.exceptions,
    fileExists: (path) => statSafe(join(root, path)),
  }));
  findings.push(...auditEconomicDisplays(
    files.filter((file) => file.path.startsWith("src/components/")),
  ));

  if (materialized) {
    findings.push(...auditRepositoryLineage(root, materialized));
  } else if (!findings.some((finding) => finding.disposition === "blocking")) {
    findings.push(blockingFinding(
      "lineage.staleDatasetHash",
      "src/lib/data/staticDataset.ts",
      "The evidence ledger could not be materialized, so artifact lineage was not compared.",
      "Fix the ledger so it can be applied, then regenerate artifacts. Do not regenerate from a broken ledger.",
    ));
  }
  return findings;
}

function walkSources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const dir of WALK_ROOTS) walk(join(root, dir), root, files);
  return files;
}

function statSafe(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
