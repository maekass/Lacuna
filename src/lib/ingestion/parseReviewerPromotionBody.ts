import type { ReviewerPromotionFields } from "@/lib/ingestion/buildPromotionDraft";

export interface ParsedPromotionRequestBody {
  reviewerFields: ReviewerPromotionFields;
  approveFirst?: boolean;
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Parse promotion preview/promote JSON body. */
export function parseReviewerPromotionBody(
  body: unknown,
): ParsedPromotionRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const rawFields = record.reviewerFields ?? record;
  if (!rawFields || typeof rawFields !== "object") return null;

  const fields = rawFields as Record<string, unknown>;
  const reviewerFields: ReviewerPromotionFields = {};

  const companySector = readOptionalString(fields.companySector);
  if (companySector !== undefined) reviewerFields.companySector = companySector;

  const companyHq = readOptionalString(fields.companyHq);
  if (companyHq !== undefined) reviewerFields.companyHq = companyHq;

  const companyFounded = readOptionalNumber(fields.companyFounded);
  if (companyFounded !== undefined) {
    reviewerFields.companyFounded = companyFounded;
  }

  const companyDescription = readOptionalString(fields.companyDescription);
  if (companyDescription !== undefined) {
    reviewerFields.companyDescription = companyDescription;
  }

  const companyStage = readOptionalString(fields.companyStage);
  if (companyStage !== undefined) reviewerFields.companyStage = companyStage;

  const acquirerSector = readOptionalString(fields.acquirerSector);
  if (acquirerSector !== undefined) {
    reviewerFields.acquirerSector = acquirerSector;
  }

  const acquirerHq = readOptionalString(fields.acquirerHq);
  if (acquirerHq !== undefined) reviewerFields.acquirerHq = acquirerHq;

  const secondarySourceUrl = readOptionalString(fields.secondarySourceUrl);
  if (secondarySourceUrl !== undefined) {
    reviewerFields.secondarySourceUrl = secondarySourceUrl;
  }

  const approveFirst = record.approveFirst === true;

  return { reviewerFields, approveFirst };
}
