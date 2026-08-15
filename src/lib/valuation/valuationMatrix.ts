import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import { fromRecords } from "@/lib/lineage/tracedCollection";
import type { LineageOptions, TracedValue } from "@/lib/lineage/types";

export type CanonicalStage =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+"
  | "Public"
  | "Acquired";

export interface ValuationMatrixEstimate {
  readonly estimate: TracedValue;
  readonly valuations: readonly number[];
}

export function canonicalStage(raw: string): CanonicalStage | null {
  if (/Acquired/i.test(raw)) return "Acquired";
  if (/Public/i.test(raw)) return "Public";
  if (/Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(raw)) {
    return "Series D+";
  }
  if (/Series C/i.test(raw)) return "Series C";
  if (/Series B/i.test(raw)) return "Series B";
  if (/Series A/i.test(raw)) return "Series A";
  if (/Seed/i.test(raw)) return "Seed";
  return null;
}

function hasValuation(
  company: VerifiedCompanyView,
): company is VerifiedCompanyView & { readonly lastKnownValuation: number } {
  return typeof company.lastKnownValuation === "number";
}

export function buildValuationMatrixEstimate(
  companies: readonly VerifiedCompanyView[],
  sector: string,
  stage: CanonicalStage,
  options: LineageOptions = {},
): ValuationMatrixEstimate {
  const collection = fromRecords("companies", companies, {
    ...options,
    reproductionParameters: { sector, stage },
  })
    .exclude((company) => company.sector !== sector, "out_of_sector")
    .exclude(
      (company) => canonicalStage(company.stage) !== stage,
      "out_of_stage",
    )
    .exclude(
      (company) => !hasValuation(company),
      "valuation_undisclosed",
      "lastKnownValuation",
    );
  const valuations = collection.records
    .map((record) => record.value)
    .filter(hasValuation)
    .map((company) => company.lastKnownValuation);
  return {
    estimate: collection
      .map(
        (company) => hasValuation(company) ? company.lastKnownValuation : 0,
        ({ input, ref, output }) => [{
          ref,
          field: "lastKnownValuation",
          value: hasValuation(input) ? output : undefined,
        }],
      )
      .estimate("valuation.matrix.median"),
    valuations,
  };
}
