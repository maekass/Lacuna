/**
 * Founding-year review policy. Kept free of schema parsers so client
 * components can quote the limit without pulling the ledger validator.
 */

export const FOUNDING_YEAR_REVIEW_AS_OF_YEAR = 2026;

export const FOUNDING_YEAR_SOURCE_TYPES = [
  "official_company",
  "filing",
  "corporate_registry",
  "investor_materials",
  "corroborated_database",
] as const;

export type FoundingYearSourceType =
  (typeof FOUNDING_YEAR_SOURCE_TYPES)[number];

/** Highest tier first. A lower tier does not outrank a disagreement above it. */
export const FOUNDING_YEAR_SOURCE_HIERARCHY = [
  "official_company",
  "filing",
  "corporate_registry",
  "investor_materials",
  "corroborated_database",
] as const satisfies readonly FoundingYearSourceType[];

export const FOUNDING_YEAR_SOURCE_LABELS: Record<
  FoundingYearSourceType,
  string
> = {
  official_company: "Official company materials",
  filing: "Filing",
  corporate_registry: "Corporate registry",
  investor_materials: "Investor materials",
  corroborated_database: "Database, corroborated",
};

export const FOUNDING_YEAR_CONFIDENCE = [
  "unreviewed",
  "insufficient",
  "stated",
] as const;

export type FoundingYearConfidence = (typeof FOUNDING_YEAR_CONFIDENCE)[number];

export const FOUNDING_YEAR_REVIEW_STATUSES = [
  "unresolved",
  "in_review",
  "accepted",
  "rejected",
  "blocked_entity_resolution",
] as const;

export type FoundingYearReviewStatus =
  (typeof FOUNDING_YEAR_REVIEW_STATUSES)[number];

export const FOUNDING_YEAR_ENTITY_RESOLUTIONS = [
  "distinct",
  "needs_resolution",
] as const;

export type FoundingYearEntityResolution =
  (typeof FOUNDING_YEAR_ENTITY_RESOLUTIONS)[number];

/**
 * Signals that must not be turned into a founding year. Portfolio entry
 * dates live on `portfolioInitialInvestment` and are funding events.
 */
export const FORBIDDEN_FOUNDING_YEAR_INFERENCES = [
  "company_age",
  "funding_date",
  "portfolio_initial_investment",
  "product_launch",
  "domain_registration",
  "model_output",
] as const;

export const COMPANY_YEAR_PANEL_LIMIT =
  "A company-year panel is not constructible from this catalog. Companies without a founding year stay excluded, stored founding years are not an eight-year window, and missing years are not inferred.";
