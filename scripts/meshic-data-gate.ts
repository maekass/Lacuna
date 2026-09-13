#!/usr/bin/env npx tsx

/**
 * MeshIC data integrity gate.
 *
 * Schema-valid data can still be decision-invalid when entity identity,
 * arithmetic, vintage, provenance class, or metric semantics are wrong.
 */

import { existsSync, readFileSync } from "node:fs";

interface Finding {
  severity: "RED" | "AMBER";
  code: string;
  message: string;
}

interface VerifiedDataset {
  acquisitions: Array<{
    id: string;
    targetId: string;
    targetName: string;
    announcedDate: string;
  }>;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function acquisitionYearByTarget(
  dataset: VerifiedDataset,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const deal of dataset.acquisitions) {
    const year = Number.parseInt(deal.announcedDate.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const existing = map.get(deal.targetId);
    if (existing === undefined || year < existing) map.set(deal.targetId, year);
  }
  return map;
}

function secRevenueFindings(dataset: VerifiedDataset): Finding[] {
  const artifact = readJson<{
    evidenceStatus?: string;
    records?: Array<{
      companyId: string;
      companyName: string;
      fiscalYear: number;
      cik: string;
    }>;
  }>("src/data/computed-sec-revenue.json");
  if (!artifact?.records) return [];

  const acquired = acquisitionYearByTarget(dataset);
  const findings: Finding[] = [];
  for (const row of artifact.records) {
    const acquiredYear = acquired.get(row.companyId);
    if (acquiredYear !== undefined && row.fiscalYear > acquiredYear) {
      findings.push({
        severity: "RED",
        code: "sec.postAcquisitionStandaloneRevenue",
        message:
          `${row.companyName} has FY${row.fiscalYear} standalone revenue after acquisition year ${acquiredYear} (CIK ${row.cik}).`,
      });
    }
  }
  return findings;
}

function cmsReimbursementFindings(): Finding[] {
  const artifact = readJson<{
    sectors?: Array<{
      sector: string;
      estimatedAnnualReimbursement: number | null;
    }>;
    utilizationByCptCode?: Array<{
      sector: string;
      cptCode: string;
      totalServices: number | null;
      avgMedicarePayment: number | null;
      provenanceKind?: string;
    }>;
  }>("src/data/computed-cms-utilization.json");
  if (!artifact?.sectors || !artifact.utilizationByCptCode) return [];

  const allFallback = artifact.utilizationByCptCode.length > 0 &&
    artifact.utilizationByCptCode.every((row) =>
      row.provenanceKind === "hardcoded_fallback"
    );
  const findings: Finding[] = [];

  for (const sector of artifact.sectors) {
    if (sector.estimatedAnnualReimbursement == null) continue;
    const rows = artifact.utilizationByCptCode.filter((row) =>
      row.sector === sector.sector && row.totalServices != null &&
      row.avgMedicarePayment != null
    );
    if (rows.length === 0) continue;

    const weighted = rows.reduce(
      (sum, row) => sum + row.totalServices! * row.avgMedicarePayment!,
      0,
    ) / 1_000_000;
    const delta = Math.abs(weighted - sector.estimatedAnnualReimbursement);
    const tolerance = Math.max(0.01, weighted * 0.001);
    if (delta > tolerance) {
      findings.push({
        severity: allFallback ? "AMBER" : "RED",
        code: allFallback
          ? "cms.legacyFallbackArithmetic"
          : "cms.unweightedReimbursement",
        message: `${sector.sector}: committed $${
          sector.estimatedAnnualReimbursement.toFixed(2)
        }M vs volume-weighted $${weighted.toFixed(2)}M. ${
          allFallback
            ? "Artifact is explicitly hardcoded/research-only; regenerate from verified aggregate input before decision use."
            : "Decision-grade artifact must use sum(services_i × payment_i)."
        }`,
      });
    }
  }

  if (allFallback) {
    findings.push({
      severity: "AMBER",
      code: "cms.hardcodedFallbackResearchOnly",
      message:
        "All CMS utilization rows are hardcoded fallback observations with unknown PUF vintage. Treat as research-only and exclude from investment valuation/market-size conclusions.",
    });
  }
  return findings;
}

function growthSemanticFindings(): Finding[] {
  const sec = readJson<{
    evidenceStatus?: string;
    records?: unknown[];
  }>("src/data/computed-sec-revenue.json");
  const artifact = readJson<{
    evidenceStatus?: string;
    companies?: Array<
      { companyName: string; method: string; confidence: string }
    >;
  }>("src/data/computed-growth-rates.json");
  if (
    artifact?.evidenceStatus === "derived_from_validated_operating_revenue" &&
    (sec?.evidenceStatus?.startsWith("withheld") || !sec?.records?.length)
  ) {
    return [{
      severity: "RED",
      code: "growth.validatedEmptiness",
      message:
        "Growth artifact is labeled derived_from_validated_operating_revenue while SEC revenue is withheld or empty.",
    }];
  }
  if (!artifact?.companies) return [];

  const bad = artifact.companies.filter((row) =>
    /CAGR\(totalFunding\s*→\s*(dealValue|lastKnownValuation)/.test(row.method)
  );
  if (bad.length === 0) return [];
  return [{
    severity: "RED",
    code: "growth.semanticMismatch",
    message:
      `${bad.length} rows annualize totalFunding→valuation/dealValue and label the result CAGR. These are not operating growth rates.`,
  }];
}

function qualityGradeFindings(): Finding[] {
  const artifact = readJson<{
    companies?: Array<{ sourceQuality: string; grade: string }>;
  }>("src/data/computed-data-quality-scores.json");
  if (!artifact?.companies) return [];
  const upgraded = artifact.companies.filter((row) =>
    row.grade === "A" && row.sourceQuality !== "A"
  );
  if (upgraded.length === 0) return [];
  return [{
    severity: "AMBER",
    code: "quality.completenessUpgradesEvidence",
    message:
      `${upgraded.length} company records have composite grade A without source-quality A. Composite quality must not be presented as provenance strength.`,
  }];
}

function vintageFindings(): Finding[] {
  const artifact = readJson<{
    vintage?: {
      primaryNumbers?: number;
      missingDedicatedAsOf?: number;
      missingDedicatedAsOfRate?: number;
    };
  }>("src/data/computed-quality-visibility.json");
  const vintage = artifact?.vintage;
  if (!vintage?.primaryNumbers || !vintage.missingDedicatedAsOf) return [];
  return [{
    severity: "AMBER",
    code: "vintage.missingAsOf",
    message:
      `${vintage.missingDedicatedAsOf}/${vintage.primaryNumbers} primary economic numbers lack a dedicated as-of date (${
        ((vintage.missingDedicatedAsOfRate ?? 0) * 100).toFixed(1)
      }%).`,
  }];
}

function main() {
  const dataset = readJson<VerifiedDataset>("src/data/dataset.verified.json");
  if (!dataset) throw new Error("Missing src/data/dataset.verified.json");

  const findings = [
    ...secRevenueFindings(dataset),
    ...cmsReimbursementFindings(),
    ...growthSemanticFindings(),
    ...qualityGradeFindings(),
    ...vintageFindings(),
  ];

  console.log(`MeshIC data gate: ${findings.length} finding(s)`);
  for (const finding of findings) {
    console.log(`[${finding.severity}] ${finding.code}: ${finding.message}`);
  }

  const red = findings.filter((finding) => finding.severity === "RED");
  if (process.argv.includes("--strict") && red.length > 0) {
    console.error(`\nStrict gate failed: ${red.length} RED finding(s).`);
    process.exitCode = 1;
  }
}

main();
