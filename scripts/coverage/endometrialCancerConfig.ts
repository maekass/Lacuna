import type { KnownFundingEntry } from "./types";
import {
  BASE_CLINICAL_SERVICE_PATTERNS,
  BASE_NONPROFIT_PATTERNS,
  BASE_PRODUCT_SIGNAL_PATTERNS,
  ONCOLOGY_CLINICAL_EXTRA_PATTERNS,
} from "./sharedPatterns";
import type { CoverageAreaConfig } from "./types";

/** Public or press-verified funding for endometrial cancer ecosystem companies. */
export const ENDOMETRIAL_CANCER_KNOWN_FUNDING: Record<string, KnownFundingEntry> =
  {
    mimark: {
      displayName: "MiMARK",
      description:
        "MiMARK develops in vitro diagnostic solutions using gynecological fluids, with WomEC for endometrial cancer diagnosis.",
      crunchbaseRank: 12168,
      fundingStatus: "Early Stage Venture",
      lastFundingType: "Seed",
      totalFundingM: 4.5,
      operatingStatus: "Active",
      category: "diagnostics",
      sources: [
        "Vall d'Hebron / PCB — €4.22M seed round (Nov 2023)",
        "LinkedIn — MiMARK Diagnostics total funding ~$7.6M",
      ],
    },
    "sola diagnostics": {
      displayName: "Sola Diagnostics",
      description:
        "Sola Diagnostics WID-easy is a non-invasive epigenetic vaginal swab test for endometrial cancer in women with abnormal uterine bleeding.",
      crunchbaseRank: 36304,
      fundingStatus: "Private Equity",
      lastFundingType: "Private Equity",
      totalFundingM: 3.7,
      operatingStatus: "Active",
      category: "diagnostics",
      sources: [
        "Company profile — €3.4M private equity investments",
        "NIHR — £2.2M market access study grant",
      ],
    },
    "mirflow ltd": {
      displayName: "MIRFLOW LTD",
      description:
        "MIRFLOW develops a rapid blood-based liquid biopsy platform for early detection and recurrence monitoring of endometrial cancer.",
      crunchbaseRank: 3544284,
      fundingStatus: "Grant",
      lastFundingType: "Grant",
      operatingStatus: "Active",
      category: "diagnostics",
      sources: ["EQT Foundation Women's Health Grant — prototype validation"],
    },
    "madera therapeutics": {
      displayName: "Madera Therapeutics",
      description:
        "Madera Therapeutics develops ClpP-activating TR compounds with activity in endometrial cancer and other solid tumors.",
      crunchbaseRank: 474183,
      fundingStatus: "Early Stage Venture",
      lastFundingType: "Grant",
      operatingStatus: "Active",
      category: "therapeutics",
      sources: [
        "NCI / CancerX — Madera Therapeutics platform (public listings)",
        "Company website — maderatherapeutics.com",
      ],
    },
    xoft: {
      displayName: "Xoft",
      description:
        "Xoft develops electronic brachytherapy systems including vaginal applicators for endometrial and gynecologic cancer treatment.",
      crunchbaseRank: 548264,
      fundingStatus: "M&A",
      lastFundingType: "M&A",
      operatingStatus: "Active",
      category: "medical_device",
      sources: [
        "iCAD acquisition of Xoft (2017)",
        "Crunchbase — crunchbase.com/organization/xoft",
      ],
    },
    theoreo: {
      displayName: "Theoreo",
      description:
        "Theoreo develops the Medea Test, a blood-based metabolomic screening test for early detection of endometrial cancer.",
      crunchbaseRank: 4528974,
      fundingStatus: "Grant",
      lastFundingType: "Grant",
      operatingStatus: "Active",
      category: "diagnostics",
      sources: [
        "LILT research grant — JAMA Network Open validation study",
        "Campania Region — Campania Oncoterapie / tech transfer support",
      ],
    },
    "foundation medicine": {
      displayName: "Foundation Medicine",
      description:
        "Foundation Medicine provides comprehensive genomic profiling guiding precision oncology including endometrial and gynecologic cancers.",
      fundingStatus: "M&A",
      lastFundingType: "M&A",
      operatingStatus: "Active",
      category: "diagnostics",
      sources: [
        "Roche acquisition of Foundation Medicine (2018)",
        "src/data/dataset.verified.json",
      ],
    },
    "context therapeutics": {
      displayName: "Context Therapeutics",
      description:
        "Context Therapeutics develops progesterone receptor antagonists for hormone-responsive cancers including endometrial and ovarian cancer.",
      fundingStatus: "IPO",
      lastFundingType: "Post-IPO Equity",
      operatingStatus: "Active",
      category: "pharma",
      sources: [
        "Crunchbase - crunchbase.com/organization/context-therapeutics",
        "Company website - contexttx.com",
      ],
    },
    immunomedics: {
      displayName: "Immunomedics",
      description:
        "Immunomedics (Gilead) ADC oncology platform — Trodelvy and broader precision oncology portfolio.",
      fundingStatus: "M&A",
      lastFundingType: "M&A",
      totalFundingM: 21000,
      operatingStatus: "Active",
      category: "pharma",
      sources: [
        "Gilead Sciences — Immunomedics acquisition (2020)",
        "src/data/dataset.verified.json",
      ],
    },
    seagen: {
      displayName: "Seagen",
      description:
        "Seagen ADC oncology platform including Tukysa and Tivdak for women's cancers.",
      fundingStatus: "M&A",
      lastFundingType: "M&A",
      operatingStatus: "Active",
      category: "pharma",
      sources: [
        "Pfizer — Seagen acquisition (2023)",
        "src/data/dataset.verified.json",
      ],
    },
    "corcept therapeutics": {
      displayName: "Corcept Therapeutics",
      description:
        "Corcept develops relacorilant, a selective glucocorticoid receptor modulator in Phase 3 for endometrial cancer.",
      fundingStatus: "IPO",
      lastFundingType: "Post-IPO Equity",
      operatingStatus: "Active",
      category: "pharma",
      sources: [
        "Corcept investor relations — relacorilant endometrial cancer program",
        "Crunchbase - crunchbase.com/organization/corcept-therapeutics",
      ],
    },
    natera: {
      displayName: "Natera",
      description:
        "Natera provides cfDNA diagnostics including Signatera MRD and women's health oncology applications.",
      fundingStatus: "IPO",
      lastFundingType: "Post-IPO Equity",
      operatingStatus: "Active",
      category: "diagnostics",
      sources: ["Crunchbase - crunchbase.com/organization/natera"],
    },
    "guardant health": {
      displayName: "Guardant Health",
      description:
        "Guardant Health liquid biopsy platform for oncology treatment selection and monitoring.",
      fundingStatus: "IPO",
      lastFundingType: "Post-IPO Equity",
      operatingStatus: "Active",
      category: "diagnostics",
      sources: ["Crunchbase - crunchbase.com/organization/guardant-health"],
    },
  };

export const ENDOMETRIAL_CANCER_COVERAGE_CONFIG: CoverageAreaConfig = {
  therapeuticArea: "Endometrial cancer",
  therapeuticAreaId: "endometrial-cancer",
  pasteFileName: "endometrial-cancer-coverage-paste.txt",
  csvPrefix: "endometrial-cancer-coverage",
  outFileName: "computed-endometrial-cancer-coverage.json",
  crunchbaseSearchTotal: 13,
  knownFunding: ENDOMETRIAL_CANCER_KNOWN_FUNDING,
  knownFundingAliases: {
    "mimark diagnostics": "mimark",
    "guzip biomarkers corporation": "guzip biomarkers corporation",
    "mirflow": "mirflow ltd",
  },
  nonprofitPatterns: BASE_NONPROFIT_PATTERNS,
  clinicalServicePatterns: [
    ...BASE_CLINICAL_SERVICE_PATTERNS,
    ...ONCOLOGY_CLINICAL_EXTRA_PATTERNS,
  ],
  productSignalPatterns: BASE_PRODUCT_SIGNAL_PATTERNS,
  seedKnownRegistry: true,
  pasteOptional: false,
  methodology:
    "Crunchbase Pro text search paste plus verified funding registry. Included only for-profit product companies (diagnostics, therapeutics, devices, digital health) with Crunchbase fundingStatus, fundraisingStatus, totalFunding, or lastFundingType. Gynecologic oncology clinics, hospitals, and nonprofits excluded.",
  sources: [
    "Crunchbase Pro endometrial cancer search paste (initial batch)",
    "src/data/dataset.verified.json overlap check",
  ],
};
