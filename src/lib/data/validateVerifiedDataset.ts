import type { VerifiedDataset } from "./datasetTypes";
import {
  computeDisclosureStats,
  computeSectorDealCounts,
  computeYearDealCounts,
  type DisclosureStats,
  type SectorDealCount,
  type YearDealCount,
} from "./datasetCoverageStats";

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  entity?: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: DisclosureStats;
  sectorCounts: SectorDealCount[];
  yearCounts: YearDealCount[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR = /\b(?:19|20)\d{2}\b/;
const URL_RE = /https?:\/\/[^\s]+/i;

function push(list: ValidationIssue[], issue: ValidationIssue): void {
  list.push(issue);
}

function sourceIsResolvable(source: string): boolean {
  const value = source.trim().toLowerCase();
  if (URL_RE.test(source)) return true;
  // Filing identifiers can be resolvable without embedding a full URL.
  return value.includes("sec edgar") || value.includes("accession") ||
    value.includes("10-k") || value.includes("8-k") ||
    value.includes("defm14a") || value.includes("s-4") ||
    value.includes("stock exchange filing");
}

function extractDomain(source: string): string | null {
  const match = source.match(URL_RE);
  if (!match) return null;
  try {
    return new URL(match[0]).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Validate verified dataset integrity, provenance, disclosure and evidence hygiene. */
export function validateVerifiedDataset(dataset: VerifiedDataset): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const companyIds = new Set(dataset.companies.map((c) => c.id));
  const acquirerIds = new Set(dataset.acquirers.map((a) => a.id));
  const acquirerOrCompanyIds = new Set([...companyIds, ...acquirerIds]);
  const dealIds = new Set<string>();

  if (!dataset.provenance.lastUpdated || !ISO_DATE.test(dataset.provenance.lastUpdated)) {
    push(errors, {
      code: "provenance.lastUpdated",
      severity: "error",
      message: "provenance.lastUpdated must be ISO date YYYY-MM-DD",
    });
  }
  if (!dataset.provenance.disclaimer?.trim()) {
    push(errors, {
      code: "provenance.disclaimer",
      severity: "error",
      message: "provenance.disclaimer is required",
    });
  }
  if (dataset.provenance.sources.length === 0) {
    push(warnings, {
      code: "provenance.sources",
      severity: "warning",
      message: "provenance.sources is empty — add global source categories",
    });
  }

  for (const c of dataset.companies) {
    if (!c.id || !c.name || !c.sector) {
      push(errors, {
        code: "company.required",
        severity: "error",
        message: "Company missing id, name, or sector",
        entity: c.id ?? c.name,
      });
    }

    const sources = c.sources ?? [];
    if (sources.length < 2) {
      push(warnings, {
        code: "company.singleSource",
        severity: "warning",
        message: `Company "${c.name}" has fewer than 2 sources (dual-attestation recommended)`,
        entity: c.id,
      });
    }

    const unresolvable = sources.filter((source) => !sourceIsResolvable(source));
    if (unresolvable.length > 0) {
      push(warnings, {
        code: "company.nonResolvableSource",
        severity: "warning",
        message: `Company "${c.name}" has ${unresolvable.length}/${sources.length} source citation(s) without a canonical URL or filing identifier`,
        entity: c.id,
      });
    }

    const domains = sources.map(extractDomain).filter((value): value is string => value !== null);
    if (sources.length >= 2 && domains.length >= 2 && new Set(domains).size === 1) {
      push(warnings, {
        code: "company.nonIndependentSources",
        severity: "warning",
        message: `Company "${c.name}" cites multiple URLs from only one domain; dual attestation should use independent evidence when policy requires it`,
        entity: c.id,
      });
    }

    if (c.lastKnownValuation != null && !c.valuationSource?.trim()) {
      push(warnings, {
        code: "company.valuationSource",
        severity: "warning",
        message: `Company "${c.name}" has valuation without valuationSource`,
        entity: c.id,
      });
    }
    if (c.lastKnownValuation != null && c.valuationSource?.trim() && !YEAR.test(c.valuationSource)) {
      push(warnings, {
        code: "company.valuationVintage",
        severity: "warning",
        message: `Company "${c.name}" has a valuation source without an explicit year; store a dedicated as-of date when the schema supports it`,
        entity: c.id,
      });
    }
  }

  for (const d of dataset.acquisitions) {
    if (dealIds.has(d.id)) {
      push(errors, {
        code: "deal.duplicateId",
        severity: "error",
        message: `Duplicate deal id "${d.id}"`,
        entity: d.id,
      });
    }
    dealIds.add(d.id);

    if (!ISO_DATE.test(d.announcedDate)) {
      push(errors, {
        code: "deal.announcedDate",
        severity: "error",
        message: `Deal "${d.id}" announcedDate must be YYYY-MM-DD`,
        entity: d.id,
      });
    }
    if (d.closedDate && !ISO_DATE.test(d.closedDate)) {
      push(errors, {
        code: "deal.closedDate",
        severity: "error",
        message: `Deal "${d.id}" closedDate must be YYYY-MM-DD`,
        entity: d.id,
      });
    }
    if (!companyIds.has(d.targetId)) {
      push(errors, {
        code: "deal.targetFk",
        severity: "error",
        message: `Deal "${d.id}" targetId "${d.targetId}" not found in companies`,
        entity: d.id,
      });
    }
    if (!acquirerOrCompanyIds.has(d.acquirerId)) {
      push(errors, {
        code: "deal.acquirerFk",
        severity: "error",
        message: `Deal "${d.id}" acquirerId "${d.acquirerId}" not in companies or acquirers`,
        entity: d.id,
      });
    } else if (!acquirerIds.has(d.acquirerId)) {
      push(warnings, {
        code: "deal.corporateAcquirer",
        severity: "warning",
        message: `Deal "${d.id}" acquirerId "${d.acquirerId}" resolves to a company row, not acquirers[] — document entity resolution`,
        entity: d.id,
      });
    }

    if (!d.source?.trim()) {
      push(errors, {
        code: "deal.source",
        severity: "error",
        message: `Deal "${d.id}" missing source`,
        entity: d.id,
      });
    } else if (!sourceIsResolvable(d.source)) {
      push(warnings, {
        code: "deal.nonResolvableSource",
        severity: "warning",
        message: `Deal "${d.id}" source is not a canonical URL or filing identifier`,
        entity: d.id,
      });
    }

    if (d.dealValue == null && !d.dealValueNote?.trim()) {
      push(warnings, {
        code: "deal.undisclosedNote",
        severity: "warning",
        message: `Deal "${d.id}" has no dealValue and no dealValueNote — add explicit undisclosed rationale`,
        entity: d.id,
      });
    }
    if (d.dealValue != null && !d.dealValueNote?.trim()) {
      push(warnings, {
        code: "deal.disclosedNote",
        severity: "warning",
        message: `Deal "${d.id}" has dealValue but no dealValueNote — cite filing or press basis`,
        entity: d.id,
      });
    }
  }

  const stats = computeDisclosureStats(dataset);
  if (stats.dealsTotal > 0 && stats.disclosureRate < 0.2) {
    push(warnings, {
      code: "stats.lowDisclosure",
      severity: "warning",
      message: `Only ${(stats.disclosureRate * 100).toFixed(0)}% of deals have disclosed prices — price analytics remain underpowered`,
    });
  }

  const sectorCounts = computeSectorDealCounts(dataset);
  for (const row of sectorCounts) {
    if (row.deals === 0 && row.companies >= 3) {
      push(warnings, {
        code: "stats.sectorNoDeals",
        severity: "warning",
        message: `Sector "${row.sector}" has ${row.companies} companies but 0 verified deals`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats,
    sectorCounts,
    yearCounts: computeYearDealCounts(dataset),
  };
}
