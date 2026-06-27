import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";

export interface VerifiedComparableCompany {
  name: string;
  sector: string;
  reimbursementStatus: string;
  valuationMultiple: number;
  acquisitionPrice?: number;
  source: string;
}

/**
 * Build M&A comparables from verified acquisitions with disclosed deal values.
 * Funding-to-exit multiples are computed only when target totalFunding is public.
 */
export function buildVerifiedComparableCompanies(): VerifiedComparableCompany[] {
  const derived = buildVerifiedDerivedData(getStaticVerifiedDataset());
  const companyById = new Map(
    derived.verifiedCompanies.map((company) => [company.id, company]),
  );

  return derived.verifiedAcquisitions
    .filter((deal) => typeof deal.dealValue === "number" && deal.dealValue > 0)
    .map((deal) => {
      const target = companyById.get(deal.targetId);
      const fundingM = target?.totalFunding;
      const valuationMultiple = fundingM && fundingM > 0
        ? deal.dealValue! / fundingM
        : 1.0;

      return {
        name: `${deal.targetName} (acquired by ${deal.acquirerName})`,
        sector: target?.sector ?? "unknown",
        reimbursementStatus: "verified_deal",
        valuationMultiple,
        acquisitionPrice: deal.dealValue! * 1_000_000,
        source: deal.source,
      };
    });
}

/** Closest verified comparables by funding-to-exit multiple distance. */
export function selectVerifiedComparables(
  targetMultiple: number,
  limit = 4,
): VerifiedComparableCompany[] {
  return buildVerifiedComparableCompanies()
    .sort(
      (a, b) =>
        Math.abs(a.valuationMultiple - targetMultiple) -
        Math.abs(b.valuationMultiple - targetMultiple),
    )
    .slice(0, limit);
}
