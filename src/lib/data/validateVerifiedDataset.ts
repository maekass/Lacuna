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
const MONTH_OR_QUARTER =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|q[1-4])\b/i;

function namesOnlyAYear(source: string | undefined): boolean {
  if (!source?.trim()) return false;
  const hasYear = /\b(?:19|20)\d{2}\b/.test(source);
  return hasYear && !MONTH_OR_QUARTER.test(source);
}

function push(
  list: ValidationIssue[],
  issue: ValidationIssue,
): void {
  list.push(issue);
}

/** Validate verified dataset integrity, provenance, and disclosure hygiene. */
export function validateVerifiedDataset(
  dataset: VerifiedDataset,
): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const companyIds = new Set(dataset.companies.map((c) => c.id));
  const acquirerIds = new Set(dataset.acquirers.map((a) => a.id));
  const acquirerOrCompanyIds = new Set([...companyIds, ...acquirerIds]);
  const dealIds = new Set<string>();

  if (
    !dataset.provenance.lastUpdated ||
    !ISO_DATE.test(dataset.provenance.lastUpdated)
  ) {
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
        message: `Company missing id, name, or sector`,
        entity: c.id ?? c.name,
      });
    }
    if ((c.sources ?? []).length < 2) {
      push(warnings, {
        code: "company.singleSource",
        severity: "warning",
        message:
          `Company "${c.name}" has fewer than 2 sources (dual-attestation recommended)`,
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
        message:
          `Deal "${d.id}" targetId "${d.targetId}" not found in companies`,
        entity: d.id,
      });
    }
    if (!acquirerOrCompanyIds.has(d.acquirerId)) {
      push(errors, {
        code: "deal.acquirerFk",
        severity: "error",
        message:
          `Deal "${d.id}" acquirerId "${d.acquirerId}" not in companies or acquirers`,
        entity: d.id,
      });
    } else if (!acquirerIds.has(d.acquirerId)) {
      push(warnings, {
        code: "deal.corporateAcquirer",
        severity: "warning",
        message:
          `Deal "${d.id}" acquirerId "${d.acquirerId}" resolves to a company row, not acquirers[] — document entity resolution`,
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
    }
    if (d.dealValue == null && !d.dealValueNote?.trim()) {
      push(warnings, {
        code: "deal.undisclosedNote",
        severity: "warning",
        message:
          `Deal "${d.id}" has no dealValue and no dealValueNote — add explicit undisclosed rationale`,
        entity: d.id,
      });
    }
    if (d.dealValue != null && !d.dealValueNote?.trim()) {
      push(warnings, {
        code: "deal.disclosedNote",
        severity: "warning",
        message:
          `Deal "${d.id}" has dealValue but no dealValueNote — cite filing or press basis`,
        entity: d.id,
      });
    }
    if (d.preDealValuationDate && d.preDealValuationDate > d.announcedDate) {
      push(errors, {
        code: "deal.preDealValuationDateOrder",
        severity: "error",
        message:
          `Deal "${d.id}" preDealValuationDate ${d.preDealValuationDate} is after announcedDate ${d.announcedDate}`,
        entity: d.id,
      });
    }
    const yearOnlySource = namesOnlyAYear(d.preDealValuationSource);
    if (
      d.preDealValuationDate?.endsWith("-01-01") &&
      yearOnlySource &&
      d.preDealValuationDatePrecision !== "year"
    ) {
      push(errors, {
        code: "deal.preDealValuationDatePrecision",
        severity: "error",
        message:
          `Deal "${d.id}" pre-deal mark is ${d.preDealValuationDate} and the source names only a year — set preDealValuationDatePrecision to "year"`,
        entity: d.id,
      });
    }
  }

  const stats = computeDisclosureStats(dataset);
  if (stats.dealsTotal > 0 && stats.disclosureRate < 0.2) {
    push(warnings, {
      code: "stats.lowDisclosure",
      severity: "warning",
      message: `Only ${
        (stats.disclosureRate * 100).toFixed(0)
      }% of deals have disclosed prices — price analytics remain underpowered`,
    });
  }

  const sectorCounts = computeSectorDealCounts(dataset);
  for (const row of sectorCounts) {
    if (row.deals === 0 && row.companies >= 3) {
      push(warnings, {
        code: "stats.sectorNoDeals",
        severity: "warning",
        message:
          `Sector "${row.sector}" has ${row.companies} companies but 0 verified deals`,
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
