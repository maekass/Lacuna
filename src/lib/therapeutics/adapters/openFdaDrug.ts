import { z } from "zod";
import type { RegulatoryEvent } from "../schema";
import { regulatoryEventSchema } from "../schema";
import { observed } from "../primitives";

const submissionSchema = z.object({
  submission_type: z.string().optional(),
  submission_number: z.string().optional(),
  submission_status: z.string().optional(),
  submission_status_date: z.string().optional(),
  submission_class_code: z.string().optional(),
  submission_class_code_description: z.string().optional(),
});

const applicationSchema = z.object({
  application_number: z.string().optional(),
  sponsor_name: z.string().optional(),
  openfda: z.object({
    brand_name: z.array(z.string()).optional(),
    generic_name: z.array(z.string()).optional(),
  }).optional(),
  submissions: z.array(submissionSchema).optional(),
});

export interface OpenFdaDrugNormalizationInput {
  record: unknown;
  sourceId: string;
  /** Retrieval day of this API payload. Not used as a publication date. */
  retrievedAt: string;
  assetId: string;
  /**
   * Reviewer-supplied link from this application number to an asset.
   * The normalizer does not match brand names on its own.
   */
  reviewedApplicationNumber: string;
}

export interface OpenFdaNormalizationSuccess {
  ok: true;
  events: RegulatoryEvent[];
}

export interface OpenFdaNormalizationFailure {
  ok: false;
  errors: string[];
}

function compactDate(value: string | undefined): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  if (!z.iso.date().safeParse(iso).success) return null;
  return iso;
}

/**
 * Map openFDA Drugs@FDA submissions into regulatory-event drafts.
 *
 * `submission_status_date` is stored as an event date. The API snapshot has
 * no publication date, so sourced fields leave `publishedAt` to the caller-
 * supplied source record. Callers that do not know when the payload became
 * public must omit `publishedAt`.
 */
export function normalizeOpenFdaDrugApplication(
  input: OpenFdaDrugNormalizationInput,
): OpenFdaNormalizationSuccess | OpenFdaNormalizationFailure {
  const parsed = applicationSchema.safeParse(input.record);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const applicationNumber = parsed.data.application_number?.trim() ?? "";
  if (!applicationNumber) {
    return { ok: false, errors: ["application_number is required"] };
  }
  if (applicationNumber !== input.reviewedApplicationNumber) {
    return {
      ok: false,
      errors: [
        `Application ${applicationNumber} does not match reviewed mapping ${input.reviewedApplicationNumber}`,
      ],
    };
  }

  const events: RegulatoryEvent[] = [];
  const errors: string[] = [];

  for (const submission of parsed.data.submissions ?? []) {
    const type = submission.submission_type?.trim() || "UNKNOWN";
    const number = submission.submission_number?.trim() || "unknown";
    const status = submission.submission_status?.trim() || "";
    const eventDate = compactDate(submission.submission_status_date);
    const classDescription =
      submission.submission_class_code_description?.trim() || "";
    const id = `openfda-${applicationNumber}-${type}-${number}-${
      status || "none"
    }`;

    let eventType: RegulatoryEvent["eventType"]["value"] = "other";
    let outcome: RegulatoryEvent["outcome"]["value"] = "other";
    if (status === "AP" && type === "ORIG") {
      eventType = "approval";
      outcome = "approval";
    } else if (status === "AP" && type === "SUPPL") {
      eventType = /label/i.test(classDescription)
        ? "label_change"
        : "supplement_approval";
      outcome = "approval";
    } else if (status && status !== "AP") {
      eventType = "other";
      outcome = "other";
    }

    const limitations = [
      "openFDA submission_status_date is an event date. This API snapshot does not establish when the status became publicly knowable.",
      "Indication text, mechanism, and label wording are not inferred from submission status.",
    ];

    const base = {
      sourceId: input.sourceId,
      asOf: input.retrievedAt,
      limitations,
    };

    const candidate = {
      id,
      assetId: input.assetId,
      jurisdiction: "US",
      regulator: "FDA",
      eventType: observed({
        ...base,
        claimId: `${id}:eventType`,
        field: "regulatory.eventType",
        value: eventType,
        eventDate: eventDate ?? undefined,
      }),
      applicationType: observed({
        ...base,
        claimId: `${id}:applicationType`,
        field: "regulatory.applicationType",
        value: type,
      }),
      applicationNumber: observed({
        ...base,
        claimId: `${id}:applicationNumber`,
        field: "regulatory.applicationNumber",
        value: applicationNumber,
      }),
      decisionDate: eventDate
        ? observed({
          ...base,
          claimId: `${id}:decisionDate`,
          field: "regulatory.decisionDate",
          value: eventDate,
          eventDate,
        })
        : undefined,
      outcome: observed({
        ...base,
        claimId: `${id}:outcome`,
        field: "regulatory.outcome",
        value: outcome,
        eventDate: eventDate ?? undefined,
      }),
      limitations,
    };

    const validated = regulatoryEventSchema.safeParse(candidate);
    if (!validated.success) {
      errors.push(
        ...validated.error.issues.map((issue) =>
          `${id}: ${issue.path.join(".")}: ${issue.message}`
        ),
      );
      continue;
    }
    events.push(validated.data);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, events };
}
