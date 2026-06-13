// ============================================================================
// VERIFIED DATA ONLY
// ============================================================================
// Typed interface + derived helpers. Source: JSON (static) or Postgres (db mode).
// Prefer `useVerifiedDataset()` in client components when wrapped by VerifiedDatasetProvider.
// ============================================================================

import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  buildVerifiedDerivedData,
  type VerifiedAcquirerView,
  type VerifiedAcquisitionView,
  type VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";

export type VerifiedCompany = VerifiedCompanyView & {
  readonly sector:
    | "Fertility"
    | "Mental Health"
    | "General Wellness"
    | "Wearables"
    | "Pelvic Health";
};

export type VerifiedAcquisition = VerifiedAcquisitionView & {
  readonly dealType: "Acquisition" | "Strategic Investment" | "Partnership";
};

const staticDerived = buildVerifiedDerivedData(getStaticVerifiedDataset());

export const verifiedCompanies = staticDerived
  .verifiedCompanies as VerifiedCompany[];
export const verifiedAcquisitions = staticDerived
  .verifiedAcquisitions as VerifiedAcquisition[];
export const verifiedAcquirers = staticDerived
  .verifiedAcquirers as VerifiedAcquirerView[];
export const dataProvenance = staticDerived.dataProvenance;

export const foregroundPortfolio = [
  "Nurx",
  "Evvy",
  "Seven Starling",
  "Cofertility",
  "Mae",
  "Millie",
  "Bloomlife",
  "Eli Health",
  "Cadence OTC",
  "AOA Dx",
  "Vitra Labs",
  "Ovian",
  "Planera",
  "Gesynta Pharma",
  "Nadia Care",
] as const;

/** Amboy Street Ventures portfolio, per amboystreet.vc/portfolio (June 2026). */
export const amboyPortfolio = [
  "Evvy",
  "Contraline",
  "Alloy",
  "Béa Fertility",
  "Hey Jane",
  "Testmate Health",
  "Granata Bio",
  "Aunt Flow",
  "Dame",
  "Playground",
  "Origin",
  "Gennev",
  "Gesynta Pharma",
  "Millie",
  "Juniper Genomics",
  "Allswell",
  "Defiant Health",
] as const;

export const getVerifiedNetworkNodes = staticDerived.getVerifiedNetworkNodes;
export const getVerifiedNetworkLinks = staticDerived.getVerifiedNetworkLinks;
export const getVerifiedTotalDealValue =
  staticDerived.getVerifiedTotalDealValue;
export const getVerifiedDealsByYear = staticDerived.getVerifiedDealsByYear;
