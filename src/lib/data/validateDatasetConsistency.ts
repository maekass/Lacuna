import type { VerifiedDataset } from "./datasetTypes";
import type { ValidationIssue } from "./validateVerifiedDataset";

export interface ConsistencyIssues {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when one label contains the other (e.g. "Teladoc" / "Teladoc Health"). */
function namesCompatible(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return x.includes(y) || y.includes(x);
}

function sectorStem(sector: string): string {
  return sector.toLowerCase().replace(/\([^)]*\)/g, "").trim().replace(
    /s$/,
    "",
  );
}

/**
 * Pairs of sector labels that look like spellings of one sector:
 * same stem after dropping a parenthetical / plural "s", or one label is the
 * first word of the other ("Reproductive" vs "Reproductive Health").
 */
export function findSectorLabelVariants(
  sectors: readonly string[],
): [string, string][] {
  const unique = [...new Set(sectors)].sort();
  const pairs: [string, string][] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i];
      const b = unique[j];
      const sa = sectorStem(a);
      const sb = sectorStem(b);
      const [short, long] = sa.length <= sb.length ? [sa, sb] : [sb, sa];
      if (sa === sb || long.startsWith(`${short} `)) pairs.push([a, b]);
    }
  }
  return pairs;
}

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/**
 * Cross-record consistency checks for the verified dataset: id uniqueness
 * across entity types, deal/company agreement, and date ordering.
 */
export function validateDatasetConsistency(
  dataset: VerifiedDataset,
): ConsistencyIssues {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const companies = new Map(dataset.companies.map((c) => [c.id, c]));
  const acquirers = new Map(dataset.acquirers.map((a) => [a.id, a]));
  const asOf = dataset.provenance.lastUpdated;

  for (const id of duplicates(dataset.companies.map((c) => c.id))) {
    errors.push({
      code: "company.duplicateId",
      severity: "error",
      message: `Duplicate company id "${id}"`,
      entity: id,
    });
  }
  for (const id of duplicates(dataset.acquirers.map((a) => a.id))) {
    errors.push({
      code: "acquirer.duplicateId",
      severity: "error",
      message: `Duplicate acquirer id "${id}"`,
      entity: id,
    });
  }
  for (const id of companies.keys()) {
    if (acquirers.has(id)) {
      errors.push({
        code: "entity.idCollision",
        severity: "error",
        message:
          `Id "${id}" is used by both a company and an acquirer, so deal.acquirerId is ambiguous`,
        entity: id,
      });
    }
  }
  for (
    const name of duplicates(
      dataset.companies.map((c) => normalizeName(c.name)),
    )
  ) {
    warnings.push({
      code: "company.duplicateName",
      severity: "warning",
      message:
        `More than one company is named "${name}" — merge or disambiguate`,
    });
  }
  for (
    const [a, b] of findSectorLabelVariants(
      dataset.companies.map((c) => c.sector),
    )
  ) {
    warnings.push({
      code: "company.sectorLabelVariant",
      severity: "warning",
      message:
        `Sector labels "${a}" and "${b}" look like variants of one sector; sector counts split across them`,
    });
  }

  const dealPairs = new Map<string, string>();
  const dealTargets = new Set<string>();
  for (const d of dataset.acquisitions) {
    dealTargets.add(d.targetId);
    const pairKey = `${d.targetId}→${d.acquirerId}`;
    const firstDeal = dealPairs.get(pairKey);
    if (firstDeal) {
      warnings.push({
        code: "deal.duplicatePair",
        severity: "warning",
        message:
          `Deals "${firstDeal}" and "${d.id}" share target ${d.targetId} and acquirer ${d.acquirerId} — confirm they are distinct transactions`,
        entity: d.id,
      });
    } else {
      dealPairs.set(pairKey, d.id);
    }

    if (d.closedDate && d.closedDate < d.announcedDate) {
      errors.push({
        code: "deal.closedBeforeAnnounced",
        severity: "error",
        message:
          `Deal "${d.id}" closedDate ${d.closedDate} is before announcedDate ${d.announcedDate}`,
        entity: d.id,
      });
    }
    for (
      const [field, value] of [
        ["announcedDate", d.announcedDate],
        ["closedDate", d.closedDate],
      ] as const
    ) {
      if (value && asOf && value > asOf) {
        errors.push({
          code: "deal.futureDate",
          severity: "error",
          message:
            `Deal "${d.id}" ${field} ${value} is after provenance.lastUpdated ${asOf}`,
          entity: d.id,
        });
      }
    }
    if (d.dealValue != null && !(d.dealValue > 0)) {
      errors.push({
        code: "deal.nonPositiveValue",
        severity: "error",
        message:
          `Deal "${d.id}" dealValue ${d.dealValue} must be positive; leave it empty when undisclosed`,
        entity: d.id,
      });
    }

    const target = companies.get(d.targetId);
    if (target) {
      if (target.founded != null && yearOf(d.announcedDate) < target.founded) {
        errors.push({
          code: "deal.targetFoundedAfterDeal",
          severity: "error",
          message: `Deal "${d.id}" was announced in ${
            yearOf(d.announcedDate)
          } but target ${target.id} lists founded ${target.founded}`,
          entity: d.id,
        });
      }
      if (target.outcomeType !== "acquired") {
        errors.push({
          code: "deal.targetOutcome",
          severity: "error",
          message:
            `Deal "${d.id}" target ${target.id} has outcomeType "${target.outcomeType}", expected "acquired"`,
          entity: d.id,
        });
      }
      if (!namesCompatible(d.targetName, target.name)) {
        warnings.push({
          code: "deal.targetName",
          severity: "warning",
          message:
            `Deal "${d.id}" targetName "${d.targetName}" does not match company "${target.name}"`,
          entity: d.id,
        });
      }
    }
    const acquirer = acquirers.get(d.acquirerId) ??
      companies.get(d.acquirerId);
    if (acquirer && !namesCompatible(d.acquirerName, acquirer.name)) {
      warnings.push({
        code: "deal.acquirerName",
        severity: "warning",
        message:
          `Deal "${d.id}" acquirerName "${d.acquirerName}" does not match "${acquirer.name}"`,
        entity: d.id,
      });
    }
  }

  for (const c of dataset.companies) {
    if (c.outcomeType === "acquired" && !dealTargets.has(c.id)) {
      warnings.push({
        code: "company.acquiredWithoutDeal",
        severity: "warning",
        message:
          `Company "${c.name}" is outcomeType "acquired" but no verified deal targets it`,
        entity: c.id,
      });
    }
  }

  return { errors, warnings };
}
