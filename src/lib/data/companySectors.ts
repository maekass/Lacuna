/** Sectors allowed in `dataset.verified.json` per DATA_CURATION_CHECKLIST. */
export const VERIFIED_COMPANY_SECTORS = [
  "Fertility",
  "Mental Health",
  "General Wellness",
  "Wearables",
  "Pelvic Health",
] as const;

export type VerifiedCompanySector = (typeof VERIFIED_COMPANY_SECTORS)[number];
