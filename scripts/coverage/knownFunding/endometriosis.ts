import type { CoverageCompanyCategory } from "../../../src/lib/data/therapeuticAreaCoverageTypes";

export interface KnownFundingEntry {
  displayName?: string;
  description?: string;
  crunchbaseRank?: number;
  fundingStatus?: string;
  fundraisingStatus?: string;
  totalFundingM?: number;
  lastFundingType?: string;
  operatingStatus?: string;
  category: CoverageCompanyCategory;
  sources: string[];
}

/** Public or press-verified funding — used when CSV status columns are absent. */
export const ENDOMETRIOSIS_KNOWN_FUNDING: Record<string, KnownFundingEntry> = {
  "context therapeutics": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/context-therapeutics",
      "Company website - contexttx.com",
    ],
  },
  "organon": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/organon",
      "Organon investor relations",
    ],
  },
  "endogene bio": {
    fundingStatus: "Seed",
    lastFundingType: "Seed",
    totalFundingM: 3.1,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Crunchbase - crunchbase.com/organization/endogene-bio",
      "LinkedIn company profile - total funding USD 3.1M",
    ],
  },
  "visana health": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Seed",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/visana-health"],
  },
  "gesynta pharma": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series B",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: [
      "Femtech Insider - SEK 347M Series B",
      "Company website - gesynta.se",
    ],
  },
  "calla lily clinical care": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Grant",
    operatingStatus: "Active",
    category: "medical_device",
    sources: [
      "Crunchbase - crunchbase.com/organization/calla-lily-clinical-care",
    ],
  },
  "opal therapeutics": {
    fundingStatus: "Grant",
    lastFundingType: "Grant",
    totalFundingM: 0.275,
    operatingStatus: "Active",
    category: "platform",
    sources: [
      "NSF SBIR Phase I award 2024 - sbir.gov",
      "Company website - opaltherapeutics.com",
    ],
  },
  "dotlab": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    totalFundingM: 12.65,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "DotLab press release - $10M Series A (2019)",
      "TechCrunch - DotLab Series A coverage",
    ],
  },
  "fimmcyte": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/fimmcyte"],
  },
  "elanza wellness": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/elanza-wellness"],
  },
  "endometrics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endometrics"],
  },
  "scanvio": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/scanvio"],
  },
  "afynia laboratories": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/afynia-laboratories"],
  },
  "aima laboratories": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/aima-laboratories"],
  },
  "femmepharma global healthcare": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/femmepharma"],
  },
  "nura health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/nura-health"],
  },
  "syrona health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/syrona-health"],
  },
  "maipl therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/maipl-therapeutics"],
  },
  "endocure": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endocure"],
  },
  "kranus health": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    operatingStatus: "Active",
    category: "digital_health",
    sources: [
      "Crunchbase - crunchbase.com/organization/kranus-health",
      "NEJM Evidence / Lancet Digital Health - DiGA trials",
    ],
  },
  "sur180 therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/sur180-therapeutics"],
  },
  "endo app": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/endo-app"],
  },
  "temple therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/temple-therapeutics"],
  },
  "endodiag": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endodiag"],
  },
  "medai": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "platform",
    sources: ["Crunchbase - crunchbase.com/organization/medai"],
  },
  "belle health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "medical_device",
    sources: ["Crunchbase - crunchbase.com/organization/belle-health"],
  },
  "neurocrine biosciences": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/neurocrine-biosciences",
      "SEC EDGAR filings",
    ],
  },
  "memmzy health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/memmzy-health"],
  },
  "evestra onkologia": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/evestra-onkologia"],
  },
  "pyrefin": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/pyrefin"],
  },
  "cicero diagnostics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/cicero-diagnostics"],
  },
  "nalu": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/nalu"],
  },
  "meliodays medical": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "medical_device",
    sources: ["Crunchbase - crunchbase.com/organization/meliodays-medical"],
  },
  "diamens": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/diamens"],
  },
  "valeo medical": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Crunchbase - crunchbase.com/organization/valeo-medical",
      "Discovery Life Sciences fund coverage",
    ],
  },
  "viramal": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/viramal"],
  },
  "july health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/july-health"],
  },
  "xella health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/xella-health"],
  },
  "meditrina pharmaceuticals": {
    fundingStatus: "Closed",
    lastFundingType: "Series A",
    totalFundingM: 4.5,
    operatingStatus: "Closed",
    category: "pharma",
    sources: [
      "BioSpace - $4.4M initial funding (2007)",
      "Crunchbase - crunchbase.com/organization/meditrina-pharmaceuticals-inc",
    ],
  },
  "hera biotech": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Endpoints News - endometriosis diagnostics coverage, 2024",
      "Fund portfolio listing",
    ],
  },
  "forendo pharma": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Organon press release - Forendo acquisition, 2021"],
  },
  "myovant sciences": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Sumitovant press release - Myovant take-private, 2022"],
  },
  "femxx health": {
    fundingStatus: "Closed",
    lastFundingType: "Seed",
    totalFundingM: 0.1,
    operatingStatus: "Closed",
    category: "digital_health",
    sources: [
      "CB Insights - $100K seed from Entrepreneur First",
      "LinkedIn - FemXX Health closure announcement, 2023",
    ],
  },
  "endodiagnosis inc": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Debt Financing",
    totalFundingM: 0.15,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "EndoDiagnosis / ENDOSURE - endodiagnosis.com",
      "LinkedIn EndoSure Inc. - $150K debt financing, 2025",
    ],
  },
  "milestone gynomics": {
    fundingStatus: "Seed",
    lastFundingType: "Seed",
    totalFundingM: 0.034,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Tracxn - Milestone Gynomics seed round, Nov 2025",
      "Company website - milestonegx.com",
    ],
  },
  "aeva health ltd": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Seed",
    totalFundingM: 0.13,
    operatingStatus: "Active",
    category: "digital_health",
    sources: [
      "Funding Spotter - £101K early-stage allotment, Apr 2026",
      "Companies House - AEVA HEALTH LTD (15462448)",
    ],
  },
  theramex: {
    fundingStatus: "Private Equity",
    lastFundingType: "M&A",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Carlyle & PAI Partners acquisition from CVC, 2022",
      "CB Insights - Theramex Acq - Fin - II",
    ],
  },
  mabpro: {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Grant",
    totalFundingM: 2.7,
    operatingStatus: "Active",
    category: "therapeutics",
    sources: [
      "Crunchbase / LinkedIn - Mabpro Therapeutics ~$2.7M (seed, angel, grants)",
      "EuroQuity - MABPRO, a.s. immunotherapy platform",
    ],
  },
  "3cpm ltd": {
    fundingStatus: "Grant",
    lastFundingType: "Grant",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "NIH RADx Tech ACT ENDO Challenge midterm award",
      "3CPM / ENDOSURE ENDOSURE TEST development partnership",
    ],
  },
};
