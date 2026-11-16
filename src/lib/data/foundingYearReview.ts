/**
 * Review ledger for company founding years.
 *
 * A missing `founded` value stays null until a human accepts a row with a
 * citable source. Years already on `grandfatheredCompanyIds` predate this
 * gate and are not field-certified here.
 */

import { z } from "zod";
import { isCalendarDay } from "./pointInTime";
import {
  COMPANY_YEAR_PANEL_LIMIT,
  FORBIDDEN_FOUNDING_YEAR_INFERENCES,
  FOUNDING_YEAR_CONFIDENCE,
  FOUNDING_YEAR_ENTITY_RESOLUTIONS,
  FOUNDING_YEAR_REVIEW_AS_OF_YEAR,
  FOUNDING_YEAR_REVIEW_STATUSES,
  FOUNDING_YEAR_SOURCE_HIERARCHY,
  FOUNDING_YEAR_SOURCE_TYPES,
  type FoundingYearSourceType,
} from "./foundingYearPolicy";

export { COMPANY_YEAR_PANEL_LIMIT, FORBIDDEN_FOUNDING_YEAR_INFERENCES };

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableText = z.string().trim().min(1).nullable();
const nullableUrl = z.string().url().nullable();

export const foundingYearReviewRowSchema = z.object({
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  sector: z.string().min(1),
  foundedYear: z.number().int().nullable(),
  sourceUrl: nullableUrl,
  sourceName: nullableText,
  sourceType: z.enum(FOUNDING_YEAR_SOURCE_TYPES).nullable(),
  sourceAccessDate: isoDateSchema.nullable(),
  evidenceLocator: nullableText,
  corroboratingSourceUrl: nullableUrl,
  confidence: z.enum(FOUNDING_YEAR_CONFIDENCE),
  reviewStatus: z.enum(FOUNDING_YEAR_REVIEW_STATUSES),
  reviewer: nullableText,
  notInferred: z.boolean(),
  entityResolution: z.enum(FOUNDING_YEAR_ENTITY_RESOLUTIONS),
  canonicalCompanyId: z.string().min(1).nullable(),
  notes: nullableText,
});

export const foundingYearReviewLedgerSchema = z.object({
  schemaVersion: z.literal("1.0"),
  asOfYear: z.literal(FOUNDING_YEAR_REVIEW_AS_OF_YEAR),
  introducedOn: isoDateSchema,
  forbiddenInferences: z.tuple([
    z.literal("company_age"),
    z.literal("funding_date"),
    z.literal("portfolio_initial_investment"),
    z.literal("product_launch"),
    z.literal("domain_registration"),
    z.literal("model_output"),
  ]),
  sourceHierarchy: z.tuple([
    z.literal("official_company"),
    z.literal("filing"),
    z.literal("corporate_registry"),
    z.literal("investor_materials"),
    z.literal("corroborated_database"),
  ]),
  grandfatheredCompanyIds: z.array(z.string().min(1)),
  rows: z.array(foundingYearReviewRowSchema),
}).superRefine((ledger, ctx) => {
  if (!isCalendarDay(ledger.introducedOn)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "introducedOn must be a real calendar day",
      path: ["introducedOn"],
    });
  }

  const seen = new Set<string>();
  ledger.rows.forEach((row, index) => {
    if (seen.has(row.companyId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate review row for ${row.companyId}`,
        path: ["rows", index, "companyId"],
      });
    }
    seen.add(row.companyId);
    for (const issue of rowStatusIssues(row, ledger.asOfYear)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ["rows", index, issue.field],
      });
    }
  });

  const grandfathered = new Set<string>();
  ledger.grandfatheredCompanyIds.forEach((id, index) => {
    if (grandfathered.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate grandfathered company ${id}`,
        path: ["grandfatheredCompanyIds", index],
      });
    }
    grandfathered.add(id);
  });
});

export type FoundingYearReviewRow = z.infer<typeof foundingYearReviewRowSchema>;
export type FoundingYearReviewLedger = z.infer<
  typeof foundingYearReviewLedgerSchema
>;

export interface FoundingYearReviewIssue {
  code: string;
  message: string;
  companyId?: string;
  field?: string;
}

export interface FoundingYearCompanyRef {
  id: string;
  name: string;
  sector: string;
  founded?: number;
}

export interface AmbiguousFoundingEntity {
  companyId: string;
  companyName: string;
  canonicalCompanyId: string;
  canonicalCompanyName: string;
  normalizedName: string;
}

export interface DuplicateIdentityGroup {
  normalizedName: string;
  companyIds: readonly string[];
}

export interface FoundedYearCompleteness {
  companiesTotal: number;
  withFoundedYear: number;
  missingFoundedYear: number;
  minFoundedYear: number | null;
  maxFoundedYear: number | null;
  backlogRows: number;
  acceptedRows: number;
  ambiguousEntities: readonly AmbiguousFoundingEntity[];
  duplicateIdentityGroups: readonly DuplicateIdentityGroup[];
}

interface RowFieldIssue {
  field: string;
  message: string;
}

const LEGAL_SUFFIX = /\b(inc|llc|ltd|corp|co|company|the)\b/g;

/** Compare catalog names after dropping portfolio markers and legal suffixes. */
export function normalizeCompanyIdentityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(portfolio\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compareCompanyId(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sameUrl(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.trim().replace(/\/+$/, "").toLowerCase();
  return normalize(left) === normalize(right);
}

function notesCiteCanonical(
  notes: string | null,
  canonicalCompanyId: string,
): boolean {
  if (!notes) return false;
  return new RegExp(`\\b${canonicalCompanyId}\\b`).test(notes);
}

function provenanceIsBlank(row: FoundingYearReviewRow): boolean {
  return row.sourceUrl == null &&
    row.sourceName == null &&
    row.sourceType == null &&
    row.sourceAccessDate == null &&
    row.evidenceLocator == null &&
    row.corroboratingSourceUrl == null &&
    row.reviewer == null;
}

/**
 * Issues that block accepting a founding year. Open rows must not call this
 * with a filled year; `rowStatusIssues` rejects that separately.
 */
export function acceptedFoundingYearIssues(
  row: FoundingYearReviewRow,
  asOfYear: number,
): RowFieldIssue[] {
  const issues: RowFieldIssue[] = [];
  if (
    row.foundedYear == null || !Number.isInteger(row.foundedYear) ||
    row.foundedYear < 1800 || row.foundedYear > asOfYear
  ) {
    issues.push({
      field: "foundedYear",
      message:
        `foundedYear must be an integer from 1800 through ${asOfYear}, or stay null`,
    });
  }
  if (row.reviewStatus !== "accepted") {
    issues.push({
      field: "reviewStatus",
      message: "reviewStatus must be accepted",
    });
  }
  if (row.confidence !== "stated") {
    issues.push({
      field: "confidence",
      message: "confidence must be stated — the source itself gives the year",
    });
  }
  if (row.notInferred !== true) {
    issues.push({
      field: "notInferred",
      message:
        "notInferred must be true. Do not infer a year from company age, funding date, product launch, domain registration, or model output",
    });
  }
  if (row.entityResolution !== "distinct" || row.canonicalCompanyId != null) {
    issues.push({
      field: "entityResolution",
      message: "Resolve duplicate entities before accepting a founding year",
    });
  }
  if (!row.sourceUrl || !isHttpUrl(row.sourceUrl)) {
    issues.push({
      field: "sourceUrl",
      message: "sourceUrl must be an http(s) URL",
    });
  }
  if (!row.sourceName) {
    issues.push({
      field: "sourceName",
      message: "sourceName is required",
    });
  }
  if (
    row.sourceType == null ||
    !FOUNDING_YEAR_SOURCE_HIERARCHY.includes(row.sourceType)
  ) {
    issues.push({
      field: "sourceType",
      message: "sourceType must be in the founding-year source hierarchy",
    });
  }
  if (!row.sourceAccessDate || !isCalendarDay(row.sourceAccessDate)) {
    issues.push({
      field: "sourceAccessDate",
      message: "sourceAccessDate must be a real YYYY-MM-DD access date",
    });
  } else if (Number(row.sourceAccessDate.slice(0, 4)) > asOfYear) {
    issues.push({
      field: "sourceAccessDate",
      message: `sourceAccessDate cannot be after ${asOfYear}`,
    });
  }
  if (!row.evidenceLocator || row.evidenceLocator.trim().length < 12) {
    issues.push({
      field: "evidenceLocator",
      message: "evidenceLocator must quote or locate the stated year",
    });
  }
  if (!row.reviewer) {
    issues.push({
      field: "reviewer",
      message: "reviewer is required",
    });
  }
  if (row.sourceType === "corroborated_database") {
    if (
      !row.corroboratingSourceUrl || !isHttpUrl(row.corroboratingSourceUrl) ||
      (row.sourceUrl != null &&
        sameUrl(row.sourceUrl, row.corroboratingSourceUrl))
    ) {
      issues.push({
        field: "corroboratingSourceUrl",
        message:
          "A database year needs a second http(s) URL that is not the same page",
      });
    }
  } else if (row.corroboratingSourceUrl != null) {
    issues.push({
      field: "corroboratingSourceUrl",
      message:
        "corroboratingSourceUrl is only for corroborated_database sources",
    });
  }
  return issues;
}

function rowStatusIssues(
  row: FoundingYearReviewRow,
  asOfYear: number,
): RowFieldIssue[] {
  if (row.reviewStatus === "accepted") {
    return acceptedFoundingYearIssues(row, asOfYear);
  }

  const issues: RowFieldIssue[] = [];
  if (row.foundedYear != null) {
    issues.push({
      field: "foundedYear",
      message:
        "Leave foundedYear null until reviewStatus is accepted with provenance",
    });
  }
  if (row.notInferred) {
    issues.push({
      field: "notInferred",
      message: "notInferred stays false until the year is accepted",
    });
  }
  if (row.confidence === "stated") {
    issues.push({
      field: "confidence",
      message: "confidence stated is only valid on an accepted year",
    });
  }

  if (row.reviewStatus === "blocked_entity_resolution") {
    if (!provenanceIsBlank(row) || row.confidence !== "unreviewed") {
      issues.push({
        field: "reviewStatus",
        message:
          "Entity-resolution blocks stay blank. Do not record a year first",
      });
    }
    if (
      row.entityResolution !== "needs_resolution" ||
      row.canonicalCompanyId == null ||
      !notesCiteCanonical(row.notes, row.canonicalCompanyId)
    ) {
      issues.push({
        field: "canonicalCompanyId",
        message:
          "A blocked row names the other catalog id in canonicalCompanyId and notes",
      });
    }
    return issues;
  }

  if (row.entityResolution === "needs_resolution") {
    issues.push({
      field: "entityResolution",
      message:
        "needs_resolution rows use reviewStatus blocked_entity_resolution",
    });
  }
  if (row.canonicalCompanyId != null) {
    issues.push({
      field: "canonicalCompanyId",
      message: "canonicalCompanyId is only set while entity resolution is open",
    });
  }

  if (
    row.reviewStatus === "unresolved" &&
    (!provenanceIsBlank(row) || row.confidence !== "unreviewed")
  ) {
    issues.push({
      field: "reviewStatus",
      message:
        "Unresolved rows keep source fields empty. Move to in_review to record a source",
    });
  }

  if (row.reviewStatus === "rejected" && !row.notes) {
    issues.push({
      field: "notes",
      message: "A rejected year needs a note describing the conflict or gap",
    });
  }

  return issues;
}

function blankAttestationRow(
  input: FoundingYearAttestationInput & {
    companyId: string;
    companyName: string;
    sector: string;
  },
): FoundingYearReviewRow {
  const text = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  const foundedYear = input.foundedYear;
  return {
    companyId: input.companyId,
    companyName: input.companyName,
    sector: input.sector,
    foundedYear:
      typeof foundedYear === "number" && Number.isInteger(foundedYear)
        ? foundedYear
        : null,
    sourceUrl: text(input.sourceUrl),
    sourceName: text(input.sourceName),
    sourceType: input.sourceType ?? null,
    sourceAccessDate: text(input.sourceAccessDate),
    evidenceLocator: text(input.evidenceLocator),
    corroboratingSourceUrl: text(input.corroboratingSourceUrl),
    confidence: "stated",
    reviewStatus: "accepted",
    reviewer: text(input.reviewer),
    notInferred: input.notInferred === true,
    entityResolution: "distinct",
    canonicalCompanyId: null,
    notes: null,
  };
}

export interface FoundingYearAttestationInput {
  foundedYear?: number | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceType?: FoundingYearSourceType | null;
  sourceAccessDate?: string | null;
  evidenceLocator?: string | null;
  corroboratingSourceUrl?: string | null;
  reviewer?: string | null;
  notInferred?: boolean | null;
}

const PROMOTION_GAP_BY_FIELD: Record<string, string> = {
  foundedYear: "company.founded",
  sourceUrl: "company.founded.sourceUrl",
  sourceName: "company.founded.sourceName",
  sourceType: "company.founded.sourceType",
  sourceAccessDate: "company.founded.sourceAccessDate",
  evidenceLocator: "company.founded.evidenceLocator",
  corroboratingSourceUrl: "company.founded.corroboratingSourceUrl",
  reviewer: "company.founded.reviewer",
  notInferred: "company.founded.notInferred",
  confidence: "company.founded.confidence",
  reviewStatus: "company.founded.reviewStatus",
  entityResolution: "company.founded.entityResolution",
};

/** Field keys still required before a new company may receive `founded`. */
export function listFoundingYearAttestationGaps(
  input: FoundingYearAttestationInput,
): string[] {
  const row = blankAttestationRow({
    ...input,
    companyId: "pending",
    companyName: "Pending",
    sector: "Pending",
  });
  const gaps = new Set<string>();
  for (
    const issue of acceptedFoundingYearIssues(
      row,
      FOUNDING_YEAR_REVIEW_AS_OF_YEAR,
    )
  ) {
    const key = PROMOTION_GAP_BY_FIELD[issue.field];
    if (key) gaps.add(key);
  }
  return [...gaps];
}

/** Accepted ledger row for a reviewer attestation. Null when any gap remains. */
export function acceptedRowFromAttestation(
  input: FoundingYearAttestationInput & {
    companyId: string;
    companyName: string;
    sector: string;
  },
): FoundingYearReviewRow | null {
  if (listFoundingYearAttestationGaps(input).length > 0) return null;
  return blankAttestationRow(input);
}

export function findDuplicateIdentityGroups(
  companies: readonly FoundingYearCompanyRef[],
): DuplicateIdentityGroup[] {
  const groups = new Map<string, FoundingYearCompanyRef[]>();
  for (const company of companies) {
    const key = normalizeCompanyIdentityName(company.name);
    const list = groups.get(key) ?? [];
    list.push(company);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalizedName, group]) => ({
      normalizedName,
      companyIds: [...group]
        .sort((left, right) => compareCompanyId(left.id, right.id))
        .map((company) => company.id),
    }))
    .sort((left, right) =>
      left.normalizedName.localeCompare(right.normalizedName)
    );
}

function chooseCanonical(
  company: FoundingYearCompanyRef,
  group: readonly FoundingYearCompanyRef[],
): FoundingYearCompanyRef | null {
  const others = group.filter((candidate) => candidate.id !== company.id);
  const withYear = others.filter((candidate) =>
    candidate.founded !== undefined
  );
  const pool = withYear.length > 0 ? withYear : others;
  return [...pool].sort((left, right) =>
    compareCompanyId(left.id, right.id)
  )[0] ??
    null;
}

/** Missing-year rows that share a normalized name with another catalog company. */
export function findAmbiguousFoundingEntities(
  companies: readonly FoundingYearCompanyRef[],
): AmbiguousFoundingEntity[] {
  const groups = new Map<string, FoundingYearCompanyRef[]>();
  for (const company of companies) {
    const key = normalizeCompanyIdentityName(company.name);
    const list = groups.get(key) ?? [];
    list.push(company);
    groups.set(key, list);
  }

  const ambiguous: AmbiguousFoundingEntity[] = [];
  for (const [normalizedName, group] of groups) {
    if (group.length < 2) continue;
    for (const company of group) {
      if (company.founded !== undefined) continue;
      const canonical = chooseCanonical(company, group);
      if (!canonical) continue;
      ambiguous.push({
        companyId: company.id,
        companyName: company.name,
        canonicalCompanyId: canonical.id,
        canonicalCompanyName: canonical.name,
        normalizedName,
      });
    }
  }
  return ambiguous.sort((left, right) =>
    compareCompanyId(left.companyId, right.companyId)
  );
}

function hasFoundedYear(company: FoundingYearCompanyRef): boolean {
  return company.founded !== undefined && company.founded !== null;
}

/** Completeness of `founded` plus review-ledger counts when a ledger is supplied. */
export function summarizeFoundedYears(
  companies: readonly FoundingYearCompanyRef[],
  review?: FoundingYearReviewLedger,
): FoundedYearCompleteness {
  const years = companies
    .filter(hasFoundedYear)
    .map((company) => company.founded as number);
  const openRows = review?.rows.filter((row) => row.reviewStatus !== "accepted")
    .length ?? 0;
  const acceptedRows =
    review?.rows.filter((row) => row.reviewStatus === "accepted").length ?? 0;
  return {
    companiesTotal: companies.length,
    withFoundedYear: years.length,
    missingFoundedYear: companies.length - years.length,
    minFoundedYear: years.length > 0 ? Math.min(...years) : null,
    maxFoundedYear: years.length > 0 ? Math.max(...years) : null,
    backlogRows: openRows,
    acceptedRows,
    ambiguousEntities: findAmbiguousFoundingEntities(companies),
    duplicateIdentityGroups: findDuplicateIdentityGroups(companies),
  };
}

export function formatFoundingYearPercent(
  count: number,
  total: number,
): string {
  if (total === 0) return "0.0";
  return ((count / total) * 100).toFixed(1);
}

/** Markdown lines pinned in docs/FOUNDING_YEAR_PROVENANCE.md. */
export function formatFoundingYearStatsBlock(
  stats: FoundedYearCompleteness,
): string {
  const withPercent = formatFoundingYearPercent(
    stats.withFoundedYear,
    stats.companiesTotal,
  );
  const missingPercent = formatFoundingYearPercent(
    stats.missingFoundedYear,
    stats.companiesTotal,
  );
  const span = stats.minFoundedYear == null || stats.maxFoundedYear == null
    ? "none"
    : `${stats.minFoundedYear}–${stats.maxFoundedYear}`;
  return [
    `- Companies: **${stats.companiesTotal}**`,
    `- With a founded year: **${stats.withFoundedYear}** (${withPercent}%)`,
    `- Missing a founded year: **${stats.missingFoundedYear}** (${missingPercent}%)`,
    `- Non-null founded span: **${span}**`,
    `- Open founding-year review rows: **${stats.backlogRows}**`,
    `- Accepted founding-year review rows: **${stats.acceptedRows}**`,
  ].join("\n");
}

function pushIssue(
  issues: FoundingYearReviewIssue[],
  issue: FoundingYearReviewIssue,
): void {
  issues.push(issue);
}

/**
 * Cross-check the review ledger against the verified companies.
 * Does not invent years. Grandfathered years stay outside this certification.
 */
export function validateFoundingYearReview(
  companies: readonly FoundingYearCompanyRef[],
  review: FoundingYearReviewLedger,
): FoundingYearReviewIssue[] {
  const issues: FoundingYearReviewIssue[] = [];
  const byId = new Map(companies.map((company) => [company.id, company]));
  const ambiguous = new Map(
    findAmbiguousFoundingEntities(companies).map((entity) => [
      entity.companyId,
      entity,
    ]),
  );
  const rowById = new Map(review.rows.map((row) => [row.companyId, row]));
  const missingIds = companies.filter((company) => !hasFoundedYear(company))
    .map((company) => company.id);
  const openRows = review.rows.filter((row) => row.reviewStatus !== "accepted");
  const acceptedRows = review.rows.filter((row) =>
    row.reviewStatus === "accepted"
  );

  const openIds = new Set(openRows.map((row) => row.companyId));
  const missingSet = new Set(missingIds);
  for (const id of missingIds) {
    if (!openIds.has(id)) {
      pushIssue(issues, {
        code: "foundingYear.missingBacklogRow",
        message: `${id} has no founded year and no open review row`,
        companyId: id,
      });
    }
  }
  for (const row of openRows) {
    if (!missingSet.has(row.companyId)) {
      pushIssue(issues, {
        code: "foundingYear.openRowHasYear",
        message:
          `${row.companyId} is an open review row but the catalog already has founded`,
        companyId: row.companyId,
      });
    }
  }
  if (
    openRows.length !== missingIds.length || openIds.size !== missingSet.size
  ) {
    pushIssue(issues, {
      code: "foundingYear.backlogMismatch",
      message:
        `Open review rows (${openRows.length}) must equal companies missing founded (${missingIds.length})`,
    });
  }

  for (const row of review.rows) {
    const company = byId.get(row.companyId);
    if (!company) {
      pushIssue(issues, {
        code: "foundingYear.unknownCompany",
        message: `Review row ${row.companyId} is not in the company catalog`,
        companyId: row.companyId,
      });
      continue;
    }
    if (row.companyName !== company.name || row.sector !== company.sector) {
      pushIssue(issues, {
        code: "foundingYear.identityDrift",
        message: `${row.companyId} name or sector does not match the catalog`,
        companyId: row.companyId,
      });
    }
    const expected = ambiguous.get(row.companyId);
    if (expected) {
      if (
        row.reviewStatus !== "blocked_entity_resolution" ||
        row.canonicalCompanyId !== expected.canonicalCompanyId
      ) {
        pushIssue(issues, {
          code: "foundingYear.unflaggedDuplicate",
          message:
            `${row.companyId} shares a normalized name with ${expected.canonicalCompanyId} and must stay blocked`,
          companyId: row.companyId,
        });
      }
    } else if (row.reviewStatus === "blocked_entity_resolution") {
      pushIssue(issues, {
        code: "foundingYear.unexpectedBlock",
        message:
          `${row.companyId} is blocked for entity resolution without a catalog name collision`,
        companyId: row.companyId,
      });
    }
  }

  const grandfathered = new Set(review.grandfatheredCompanyIds);
  const acceptedIds = new Set(acceptedRows.map((row) => row.companyId));
  for (const id of grandfathered) {
    const company = byId.get(id);
    if (!company || !hasFoundedYear(company)) {
      pushIssue(issues, {
        code: "foundingYear.grandfatherMissingYear",
        message: `Grandfathered ${id} must still have a founded year`,
        companyId: id,
      });
    }
    if (rowById.has(id)) {
      pushIssue(issues, {
        code: "foundingYear.grandfatherInLedger",
        message:
          `Grandfathered ${id} is outside this certification and cannot also have a review row`,
        companyId: id,
      });
    }
  }

  for (const row of acceptedRows) {
    const company = byId.get(row.companyId);
    if (!company || company.founded !== row.foundedYear) {
      pushIssue(issues, {
        code: "foundingYear.acceptedYearMismatch",
        message:
          `${row.companyId} accepted year ${row.foundedYear} does not match catalog founded`,
        companyId: row.companyId,
      });
    }
    if (grandfathered.has(row.companyId)) {
      pushIssue(issues, {
        code: "foundingYear.grandfatherAccepted",
        message: `${row.companyId} cannot be both grandfathered and accepted`,
        companyId: row.companyId,
      });
    }
  }

  for (const company of companies) {
    if (!hasFoundedYear(company)) continue;
    const certified = grandfathered.has(company.id) ||
      acceptedIds.has(company.id);
    if (!certified) {
      pushIssue(issues, {
        code: "foundingYear.uncertifiedYear",
        message:
          `${company.id} has founded ${company.founded} without a grandfather entry or an accepted review row`,
        companyId: company.id,
      });
    }
  }

  return issues;
}

/** Parse the version-controlled founding-year review ledger. */
export function parseFoundingYearReview(
  raw: unknown,
): FoundingYearReviewLedger {
  return foundingYearReviewLedgerSchema.parse(raw);
}
