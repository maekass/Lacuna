import type { CoverageAreaConfig } from "./types";
import { ENDOMETRIOSIS_KNOWN_FUNDING } from "./knownFunding/endometriosis";
import {
  BASE_CLINICAL_SERVICE_PATTERNS,
  BASE_NONPROFIT_PATTERNS,
  BASE_PRODUCT_SIGNAL_PATTERNS,
} from "./sharedPatterns";

export const ENDOMETRIOSIS_COVERAGE_CONFIG: CoverageAreaConfig = {
  therapeuticArea: "Endometriosis",
  therapeuticAreaId: "endometriosis",
  pasteFileName: "endometriosis-coverage-paste.txt",
  csvPrefix: "endometriosis-coverage",
  outFileName: "computed-endometriosis-coverage.json",
  crunchbaseSearchTotal: 409,
  knownFunding: ENDOMETRIOSIS_KNOWN_FUNDING,
  knownFundingAliases: {
    "endogene bio": "endogene bio",
    endometriosis: "endometrics",
    "afynia laboratories": "afynia laboratories",
    "maipl therapeutics inc": "maipl therapeutics",
    "femmepharma global healthcare inc": "femmepharma global healthcare",
    "meditrina pharmaceuticals inc": "meditrina pharmaceuticals",
    "the endometriosis network canada": "",
    "endo app": "endo app",
    "endodiagnosis inc": "endodiagnosis inc",
    endodiagnosis: "endodiagnosis inc",
    "femxx health": "femxx health",
    "milestone gynomics": "milestone gynomics",
    "aeva health ltd": "aeva health ltd",
    "aeva health": "aeva health ltd",
    "theramex deutschland": "theramex",
    theramex: "theramex",
    "mabpro a s": "mabpro",
    mabpro: "mabpro",
    "3cpm ltd": "3cpm ltd",
    "3cpm company": "3cpm ltd",
  },
  nonprofitPatterns: BASE_NONPROFIT_PATTERNS,
  clinicalServicePatterns: BASE_CLINICAL_SERVICE_PATTERNS,
  productSignalPatterns: BASE_PRODUCT_SIGNAL_PATTERNS,
  methodology:
    "Crunchbase Pro text search paste parsed with ingest-crunchbase-text format. Included only for-profit product companies with Crunchbase fundingStatus, fundraisingStatus, totalFunding, or lastFundingType (CSV or verified registry). Clinical service providers, hospitals, and nonprofits excluded.",
  sources: [
    "Crunchbase Pro endometriosis search export (409 results)",
    "src/data/dataset.verified.json overlap check",
  ],
};
