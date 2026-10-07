/** Human labels for `listPromotionMissingFields` keys. */
export const PROMOTION_MISSING_FIELD_LABELS: Record<string, string> = {
  targetName: "Target company name",
  acquirerName: "Acquirer name",
  announcedDate: "Announcement date",
  duplicateSource: "Filing already in verified dataset",
  "company.sector": "Target sector (reviewer attested)",
  "company.hq": "Target HQ (reviewer attested)",
  "company.founded": "Target founded year (reviewer attested)",
  "company.founded.sourceUrl": "Founding-year source URL",
  "company.founded.sourceName": "Founding-year source name",
  "company.founded.sourceType": "Founding-year source type",
  "company.founded.sourceAccessDate": "Founding-year source access date",
  "company.founded.evidenceLocator": "Founding-year evidence quote or locator",
  "company.founded.corroboratingSourceUrl":
    "Second source URL corroborating a database founding year",
  "company.founded.reviewer": "Founding-year reviewer",
  "company.founded.notInferred":
    "Attestation that the founding year was not inferred",
  "company.founded.confidence": "Founding-year confidence",
  "company.founded.reviewStatus": "Founding-year review status",
  "company.founded.entityResolution": "Founding-year entity resolution",
  "company.description": "Target description or filing excerpt",
  "company.sources.secondary":
    "Secondary source URL (independent corroboration)",
  "acquirer.sector": "Acquirer sector (reviewer attested)",
  "acquirer.hq": "Acquirer HQ (reviewer attested)",
  "acquisition.strategicRationale":
    "Strategic rationale (curated copy from primary source language)",
};

export function labelPromotionMissingField(field: string): string {
  return PROMOTION_MISSING_FIELD_LABELS[field] ?? field;
}
