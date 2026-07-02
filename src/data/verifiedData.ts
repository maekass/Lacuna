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
import { RH_CAPITAL_PORTFOLIO_NAMES } from "./rhCapitalPortfolio";

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

/** Foreground Capital / RH Capital portfolio (rhcapital.vc/portfolio, July 2026). */
export const foregroundPortfolio = RH_CAPITAL_PORTFOLIO_NAMES;

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

/** A single portfolio company entry with fund listing metadata (as of 5/31/26). */
export interface PortfolioCompanyEntry {
  readonly id: string;
  readonly name: string;
  readonly initialInvestmentDate: string;
  readonly stage: string;
  readonly focusArea: string;
  readonly sector: string;
  readonly funds: readonly string[];
}

/** Full portfolio company listing sourced from fund document (as of 5/31/26). */
export const fundPortfolioCompanies: readonly PortfolioCompanyEntry[] = [
  {
    id: "c90",
    name: "Apollo Neuroscience",
    initialInvestmentDate: "2022-04-01",
    stage: "Series A",
    focusArea: "Manage stress, wellness",
    sector: "Consumer",
    funds: ["AAL", "AAL2"],
  },
  {
    id: "c91",
    name: "Aria CV",
    initialInvestmentDate: "2020-02-01",
    stage: "Series B",
    focusArea: "Lung disease",
    sector: "Medical Device",
    funds: ["FT", "FT2"],
  },
  {
    id: "c92",
    name: "Attn: Grace",
    initialInvestmentDate: "2022-08-08",
    stage: "Seed",
    focusArea: "Bladder leakage",
    sector: "Pelvic Health",
    funds: ["FT2", "FT3", "WH4"],
  },
  {
    id: "c93",
    name: "b.well",
    initialInvestmentDate: "2024-12-18",
    stage: "Series C",
    focusArea: "Platform for healthcare organizations",
    sector: "Digital Health",
    funds: ["ENT", "FT3", "WH4", "SPV2024", "SPV2026"],
  },
  {
    id: "c94",
    name: "Bone Health Technologies",
    initialInvestmentDate: "2020-01-01",
    stage: "Series A",
    focusArea: "Osteopenia",
    sector: "Medical Device",
    funds: ["FT", "FT2", "WH4", "SPV"],
  },
  {
    id: "c95",
    name: "Bowe Glow, Inc",
    initialInvestmentDate: "2023-07-14",
    stage: "Seed",
    focusArea: "Beauty",
    sector: "Consumer",
    funds: ["AAL2"],
  },
  {
    id: "c96",
    name: "Cat Health",
    initialInvestmentDate: "2025-07-31",
    stage: "Seed",
    focusArea: "Mental health",
    sector: "Therapeutics",
    funds: ["AAL2"],
  },
  {
    id: "c97",
    name: "Chronicle Bio",
    initialInvestmentDate: "2026-02-18",
    stage: "Seed",
    focusArea: "Neuroimmune disorders",
    sector: "Tech Bio",
    funds: ["WH4"],
  },
  {
    id: "c98",
    name: "Clear Gene",
    initialInvestmentDate: "2025-03-11",
    stage: "Seed",
    focusArea: "Covid-19 and cancer",
    sector: "Diagnostic",
    funds: ["FT3"],
  },
  {
    id: "c99",
    name: "E-Lovu Health",
    initialInvestmentDate: "2025-03-27",
    stage: "Seed",
    focusArea: "Platform for healthcare organizations",
    sector: "Digital Health",
    funds: ["FT3"],
  },
  {
    id: "c100",
    name: "Everly Health",
    initialInvestmentDate: "2020-11-25",
    stage: "Series D",
    focusArea: "At home Dx testing kits",
    sector: "Diagnostic",
    funds: ["FT2", "AAL"],
  },
  {
    id: "c101",
    name: "FemDx Medsystems",
    initialInvestmentDate: "2024-06-13",
    stage: "Series A",
    focusArea: "Ovarian cancer",
    sector: "Medical Device",
    funds: ["FT3"],
  },
  {
    id: "c102",
    name: "Frontier Bio",
    initialInvestmentDate: "2024-04-12",
    stage: "Seed",
    focusArea: "Lab grown human tissues",
    sector: "Biotech",
    funds: ["AAL2"],
  },
  {
    id: "c103",
    name: "Future Family",
    initialInvestmentDate: "2018-09-06",
    stage: "Series A",
    focusArea: "Fertility",
    sector: "Reproductive",
    funds: ["FT"],
  },
  {
    id: "c104",
    name: "Gameto",
    initialInvestmentDate: "2025-07-21",
    stage: "Series C",
    focusArea: "Infertility/IVF",
    sector: "Biotech",
    funds: ["FT3", "WH4"],
  },
  {
    id: "c105",
    name: "Harmony Nutrition",
    initialInvestmentDate: "2022-10-27",
    stage: "Seed",
    focusArea: "Nutrition",
    sector: "Biotech",
    funds: ["Food"],
  },
  {
    id: "c106",
    name: "Hera Biotech",
    initialInvestmentDate: "2024-10-11",
    stage: "Series A",
    focusArea: "Endometriosis",
    sector: "Diagnostic",
    funds: ["FT3", "WH4"],
  },
  {
    id: "c107",
    name: "Inherent Biosciences",
    initialInvestmentDate: "2022-08-22",
    stage: "Series A",
    focusArea: "Fertility",
    sector: "Diagnostic",
    funds: ["FT2", "FT3"],
  },
  {
    id: "c108",
    name: "Joylux",
    initialInvestmentDate: "2021-04-15",
    stage: "Series A",
    focusArea: "Menopause",
    sector: "Consumer",
    funds: ["CONS", "FT2"],
  },
  {
    id: "c109",
    name: "Lighthouse Pharma",
    initialInvestmentDate: "2023-05-03",
    stage: "Seed",
    focusArea: "Dementia",
    sector: "Therapeutics",
    funds: ["AAL2", "WH4", "SPV2023", "SPV2026"],
  },
  {
    id: "c110",
    name: "L-Nutra",
    initialInvestmentDate: "2023-05-04",
    stage: "Series C",
    focusArea: "Food",
    sector: "Consumer",
    funds: ["AAL2", "SPV"],
  },
  {
    id: "c111",
    name: "Madison Reed",
    initialInvestmentDate: "2021-11-19",
    stage: "Series G",
    focusArea: "Beauty",
    sector: "Consumer",
    funds: [
      "FSF",
      "FT2",
      "RA",
      "RA2",
      "RA3",
      "SPV2021",
      "SPV2023",
      "SPV2024",
      "SPV2026",
    ],
  },
  {
    id: "c112",
    name: "Madorra",
    initialInvestmentDate: "2019-05-17",
    stage: "Series A",
    focusArea: "Menopause",
    sector: "Medical Device",
    funds: ["FT", "FT2"],
  },
  {
    id: "c113",
    name: "Maude",
    initialInvestmentDate: "2023-08-18",
    stage: "Series A",
    focusArea: "Sexual wellness",
    sector: "Consumer",
    funds: ["FT3"],
  },
  {
    id: "c114",
    name: "Maven Clinic (portfolio)",
    initialInvestmentDate: "2020-05-08",
    stage: "Series C",
    focusArea: "Digital Clinic for women",
    sector: "Digital Health",
    funds: ["FT", "FSF", "AAL", "RA", "SPV"],
  },
  {
    id: "c115",
    name: "Mercy Bio",
    initialInvestmentDate: "2025-06-05",
    stage: "Series B",
    focusArea: "Ovarian cancer",
    sector: "Diagnostic",
    funds: ["FT3", "SPV"],
  },
  {
    id: "c116",
    name: "Mirvie",
    initialInvestmentDate: "2025-07-16",
    stage: "Series C",
    focusArea: "Preeclampsia",
    sector: "Diagnostic",
    funds: ["FT3", "RA3", "SPV"],
  },
  {
    id: "c117",
    name: "Nalu Bio",
    initialInvestmentDate: "2021-09-16",
    stage: "Seed",
    focusArea: "Cannabidiol (not hemp-based)",
    sector: "Wellness",
    funds: ["AAL"],
  },
  {
    id: "c118",
    name: "Nest Collaborative",
    initialInvestmentDate: "2021-02-12",
    stage: "Seed",
    focusArea: "Lactation",
    sector: "Maternal Health",
    funds: ["FT2"],
  },
  {
    id: "c119",
    name: "Neuspera",
    initialInvestmentDate: "2024-08-07",
    stage: "Series D",
    focusArea: "Overactive bladder",
    sector: "Medical Device",
    funds: ["FT3"],
  },
  {
    id: "c120",
    name: "NowDx",
    initialInvestmentDate: "2019-06-25",
    stage: "Series A",
    focusArea: "At home Dx with single drop of blood",
    sector: "Diagnostic",
    funds: ["FT", "FSF", "FT2"],
  },
  {
    id: "c121",
    name: "Proov (portfolio)",
    initialInvestmentDate: "2021-11-30",
    stage: "Series A",
    focusArea: "Fertility",
    sector: "Reproductive",
    funds: ["FT2"],
  },
  {
    id: "c122",
    name: "Rebundle",
    initialInvestmentDate: "2022-02-08",
    stage: "Seed",
    focusArea: "Skin rashes",
    sector: "Consumer",
    funds: ["RA2", "RA3"],
  },
  {
    id: "c123",
    name: "Rosy Wellness",
    initialInvestmentDate: "2021-08-06",
    stage: "Seed",
    focusArea: "Sexual wellness",
    sector: "Wellness",
    funds: ["FT2"],
  },
  {
    id: "c124",
    name: "Sana Health",
    initialInvestmentDate: "2020-01-01",
    stage: "Seed",
    focusArea: "Chronic pain",
    sector: "Medical Device",
    funds: ["FT"],
  },
  {
    id: "c125",
    name: "Simple HealthKit",
    initialInvestmentDate: "2024-07-16",
    stage: "Series B",
    focusArea: "Platform for consumer health",
    sector: "Digital Health",
    funds: ["FT3"],
  },
  {
    id: "c126",
    name: "Siren",
    initialInvestmentDate: "2020-08-13",
    stage: "Series B",
    focusArea: "Diabetic ulcers",
    sector: "Medical Device",
    funds: ["AAL", "AAL2"],
  },
  {
    id: "c127",
    name: "Solace Therapeutics",
    initialInvestmentDate: "2020-04-01",
    stage: "Series B",
    focusArea: "Bladder leakage",
    sector: "Medical Device",
    funds: ["FT"],
  },
  {
    id: "c128",
    name: "Toi Labs",
    initialInvestmentDate: "2023-12-15",
    stage: "Seed",
    focusArea: "Smart toilet seats",
    sector: "Medical Device",
    funds: ["AAL2"],
  },
  {
    id: "c129",
    name: "Veana Therapeutics",
    initialInvestmentDate: "2024-02-20",
    stage: "Seed",
    focusArea: "Breast cancer",
    sector: "Therapeutics",
    funds: ["AAL2"],
  },
  {
    id: "c130",
    name: "Wellth",
    initialInvestmentDate: "2020-06-03",
    stage: "Series A",
    focusArea: "Mental health",
    sector: "Digital Health",
    funds: ["AAL"],
  },
  {
    id: "c131",
    name: "Willow",
    initialInvestmentDate: "2022-06-21",
    stage: "Series C",
    focusArea: "Breast pump",
    sector: "Maternal Health",
    funds: ["FT", "FT2", "SPV"],
  },
  {
    id: "c132",
    name: "Xandar Kardian",
    initialInvestmentDate: "2021-09-03",
    stage: "Series A",
    focusArea: "Contactless vital sign monitoring",
    sector: "Medical Device",
    funds: ["AAL", "AAL2"],
  },
  {
    id: "c133",
    name: "xCures",
    initialInvestmentDate: "2021-11-06",
    stage: "Series A",
    focusArea: "Cancer treatment options",
    sector: "Digital Health",
    funds: ["FT2"],
  },
  {
    id: "c134",
    name: "YourChoice Therapeutics",
    initialInvestmentDate: "2022-09-07",
    stage: "Series A",
    focusArea: "Contraceptive",
    sector: "Reproductive",
    funds: ["FT2", "RA2", "FT3", "RA3", "WH4", "SPV2022", "SPV2025"],
  },
  {
    id: "c135",
    name: "X-Therma",
    initialInvestmentDate: "2026-04-09",
    stage: "Series B",
    focusArea: "Regenerative Medicine",
    sector: "Biotech",
    funds: ["WH4"],
  },
] as const;

/** All fund portfolio company names for overlay matching. */
export const fundPortfolio = fundPortfolioCompanies.map((c) =>
  c.name
) as string[];

export const getVerifiedNetworkNodes = staticDerived.getVerifiedNetworkNodes;
export const getVerifiedNetworkLinks = staticDerived.getVerifiedNetworkLinks;
export const getVerifiedTotalDealValue =
  staticDerived.getVerifiedTotalDealValue;
export const getVerifiedDealsByYear = staticDerived.getVerifiedDealsByYear;
