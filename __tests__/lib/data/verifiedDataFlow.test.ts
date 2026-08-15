import { describe, expect, it } from "vitest";
import { buildAcquirerProfilesFromVerified } from "@/lib/data/buildAcquirerProfilesFromVerified";
import {
  filterActiveVerifiedCompanies,
  mapVerifiedCompanyToProfile,
} from "@/lib/data/companyProfileMapper";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { buildVerifiedComparableCompanies } from "@/lib/data/verifiedComparables";
import { formatCuratedDatasetProvenanceLine } from "@/lib/constants/provenance";

describe("companyProfileMapper", () => {
  const derived = buildVerifiedDerivedData(getStaticVerifiedDataset());

  it("maps totalFunding and founded from verified company rows", () => {
    const withFunding = derived.verifiedCompanies.find(
      (c) => typeof c.totalFunding === "number" && c.founded,
    );
    expect(withFunding).toBeDefined();
    const profile = mapVerifiedCompanyToProfile(withFunding!);
    expect(profile.fundingTotal).toBe(withFunding!.totalFunding);
    expect(profile.foundingDate).toBe(`${withFunding!.founded}-01-01`);
    expect(profile.revenue).toBeUndefined();
  });

  it("does not treat Biotheranostics deal print as revenue", () => {
    const biotheranostics = derived.verifiedCompanies.find(
      (c) => c.name === "Biotheranostics",
    );
    expect(biotheranostics?.lastKnownValuation).toBe(230);
    const profile = mapVerifiedCompanyToProfile(biotheranostics!);
    expect(profile.revenue).toBeUndefined();
  });

  it("excludes acquired targets from active company list", () => {
    const active = filterActiveVerifiedCompanies(
      derived.verifiedCompanies,
      derived.verifiedAcquisitions,
    );
    const acquiredIds = new Set(
      derived.verifiedAcquisitions.map((d) => d.targetId),
    );
    for (const company of active) {
      expect(acquiredIds.has(company.id)).toBe(false);
    }
  });
});

describe("buildAcquirerProfilesFromVerified", () => {
  it("derives deal history from verified acquisitions", () => {
    const derived = buildVerifiedDerivedData(getStaticVerifiedDataset());
    const profiles = buildAcquirerProfilesFromVerified(
      derived.verifiedAcquirers,
      derived.verifiedAcquisitions,
      derived.verifiedCompanies,
    );

    expect(profiles.length).toBe(derived.verifiedAcquirers.length);
    const hologic = profiles.find((p) => p.name.includes("Hologic"));
    expect(hologic?.acquisitionHistory.length).toBeGreaterThan(0);
    expect(hologic?.acquisitionHistory[0].targetName).toBeTruthy();
  });
});

describe("verifiedComparables", () => {
  it("includes only disclosed verified deals", () => {
    const comparables = buildVerifiedComparableCompanies();
    expect(comparables.length).toBeGreaterThan(0);
    for (const deal of comparables) {
      expect(deal.source.length).toBeGreaterThan(0);
      expect(deal.acquisitionPrice).toBeGreaterThan(0);
    }
  });
});

describe("formatCuratedDatasetProvenanceLine", () => {
  it("substitutes live deal count", () => {
    expect(formatCuratedDatasetProvenanceLine(51)).toContain(
      "n=51 verified deals",
    );
  });
});
