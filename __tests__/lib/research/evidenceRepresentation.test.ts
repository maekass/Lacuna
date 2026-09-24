import { describe, expect, it } from "vitest";
import { WHAM_BUSINESS_CASE_SOURCE } from "@/lib/research/womensHealthScope";
import {
  CONTEXT_SOURCES_ARE_NOT_VALIDATION,
  describeEvidenceRepresentation,
  dimensionOmitsNumericFields,
  EVIDENCE_CONTEXT_SOURCES,
  EVIDENCE_DISCLOSURE_STATUS_ORDER,
  EVIDENCE_REPRESENTATION_DIMENSION_ORDER,
  EVIDENCE_REPRESENTATION_SCOPE,
  EVIDENCE_REPRESENTATION_USE_BOUNDARY,
  getEvidenceContextSource,
  getEvidenceDisclosureStatusMeaning,
  getEvidenceRepresentationDimension,
  isContextualEvidenceSource,
  listEvidenceRepresentationDimensions,
  LUX_AI_WOMENS_HEALTH_SOURCE,
  NOT_APPLICABLE_MEANS_OUT_OF_SCOPE,
  NOT_REPORTED_MEANS_DOCUMENTATION_GAP,
  REPORTED_MEANS_DISCLOSURE_ONLY,
  UNKNOWN_MEANS_NOT_REVIEWED,
  WHAM_EVIDENCE_CONTEXT_SOURCE,
} from "@/lib/research/evidenceRepresentation";
import type {
  EvidenceDisclosureStatus,
  EvidenceRepresentationDimensionId,
} from "@/lib/research/evidenceRepresentation";

const PROHIBITED_READINGS = [
  "clinical recommendation",
  "regulatory determination",
  "investment recommendation",
  "model-performance guarantee",
  "patient-level decision support",
] as const;

describe("evidenceRepresentation", () => {
  it("lists every dimension once and keeps source ids contextual", () => {
    const listed = listEvidenceRepresentationDimensions();
    expect(listed.map((dimension) => dimension.id)).toEqual([
      ...EVIDENCE_REPRESENTATION_DIMENSION_ORDER,
    ]);
    expect(new Set(listed.map((dimension) => dimension.id)).size).toBe(12);

    for (const id of EVIDENCE_REPRESENTATION_DIMENSION_ORDER) {
      const dimension = getEvidenceRepresentationDimension(id);
      expect(dimension.label.length).toBeGreaterThan(0);
      expect(dimension.question.endsWith("?")).toBe(true);
      expect(dimension.meaningOfReported.length).toBeGreaterThan(0);
      expect(dimension.meaningOfUnknown.toLowerCase()).toContain("unknown");
      expect(dimension.notEvidenceOf).toEqual(
        expect.arrayContaining([
          "adequate quality",
          "clinical validity",
          "equity",
          "efficacy",
          "safety",
          "clinical utility",
          "fairness",
        ]),
      );
      expect(dimension.sourceIds).toEqual([
        WHAM_EVIDENCE_CONTEXT_SOURCE.id,
        LUX_AI_WOMENS_HEALTH_SOURCE.id,
      ]);
      expect(dimensionOmitsNumericFields(dimension)).toBe(true);
    }
  });

  it("treats reported as disclosure and unknown as not yet reviewed", () => {
    expect(REPORTED_MEANS_DISCLOSURE_ONLY).toMatch(
      /disclosure or documentation/,
    );
    expect(REPORTED_MEANS_DISCLOSURE_ONLY).toMatch(
      /does not mean adequate quality, clinical validity, equity, or efficacy/,
    );
    expect(UNKNOWN_MEANS_NOT_REVIEWED).toMatch(
      /has not reviewed or located suitable evidence/,
    );
    expect(UNKNOWN_MEANS_NOT_REVIEWED).toMatch(/does not prove absence/);
    expect(NOT_REPORTED_MEANS_DOCUMENTATION_GAP).toMatch(/does not prove/);
    expect(NOT_APPLICABLE_MEANS_OUT_OF_SCOPE).toMatch(/does not apply/);

    for (const status of EVIDENCE_DISCLOSURE_STATUS_ORDER) {
      const meaning = getEvidenceDisclosureStatusMeaning(status);
      expect(meaning.status).toBe(status);
      expect(meaning.doesNotMean.length).toBeGreaterThan(0);
    }
  });

  it("blocks clinical, regulatory, investment, model, and patient-level readings", () => {
    for (const phrase of PROHIBITED_READINGS) {
      expect(EVIDENCE_REPRESENTATION_USE_BOUNDARY).toContain(phrase);
    }
    expect(EVIDENCE_REPRESENTATION_SCOPE).toMatch(
      /Not linked to Lacuna companies/,
    );
    expect(EVIDENCE_REPRESENTATION_SCOPE).toMatch(
      /not a numeric completeness score/,
    );
  });

  it("keeps WHAM and Lux as context, not clinical validation", () => {
    expect(WHAM_EVIDENCE_CONTEXT_SOURCE.label).toBe(
      WHAM_BUSINESS_CASE_SOURCE.label,
    );
    expect(WHAM_EVIDENCE_CONTEXT_SOURCE.url).toBe(
      WHAM_BUSINESS_CASE_SOURCE.url,
    );
    expect(WHAM_EVIDENCE_CONTEXT_SOURCE.url).toContain("whamnow.org");
    expect(LUX_AI_WOMENS_HEALTH_SOURCE.url).toContain("luxcapital.com");
    expect(LUX_AI_WOMENS_HEALTH_SOURCE.published).toBe("January 8, 2025");
    expect(CONTEXT_SOURCES_ARE_NOT_VALIDATION).toMatch(
      /not clinical validation/,
    );

    expect(EVIDENCE_CONTEXT_SOURCES).toHaveLength(2);
    for (const source of EVIDENCE_CONTEXT_SOURCES) {
      expect(source.role).toBe("contextual");
      expect(isContextualEvidenceSource(source)).toBe(true);
      expect(source.notASourceOf).toEqual(
        expect.arrayContaining([
          "clinical validation",
          "efficacy",
          "safety",
          "clinical utility",
          "fairness",
          "regulatory determination",
        ]),
      );
      expect(getEvidenceContextSource(source.id)).toBe(source);
    }
    expect(getEvidenceContextSource("missing-source")).toBeUndefined();
  });

  it("describes a status without emitting a score", () => {
    const cases: Array<
      [EvidenceRepresentationDimensionId, EvidenceDisclosureStatus]
    > = [
      ["sex_disaggregated_enrollment", "reported"],
      ["external_validation", "unknown"],
      ["regulatory_status", "not-reported"],
      ["reimbursement_evidence", "not-applicable"],
    ];

    for (const [dimensionId, status] of cases) {
      const reading = describeEvidenceRepresentation(dimensionId, status);
      expect(reading.dimension.id).toBe(dimensionId);
      expect(reading.status.status).toBe(status);
      expect(reading.statement.length).toBeGreaterThan(0);
      expect(reading.useBoundary).toBe(EVIDENCE_REPRESENTATION_USE_BOUNDARY);
      expect(reading).not.toHaveProperty("score");
      expect(reading).not.toHaveProperty("completeness");
      expect(JSON.stringify(reading)).not.toMatch(/\d+(\.\d+)?%/);
    }

    const reported = describeEvidenceRepresentation(
      "sex_disaggregated_efficacy",
      "reported",
    );
    expect(reported.statement).toContain(
      getEvidenceRepresentationDimension("sex_disaggregated_efficacy")
        .meaningOfReported,
    );
    expect(reported.statement).toContain(REPORTED_MEANS_DISCLOSURE_ONLY);

    const unknown = describeEvidenceRepresentation(
      "data_provenance",
      "unknown",
    );
    expect(unknown.statement).toContain(
      getEvidenceRepresentationDimension("data_provenance").meaningOfUnknown,
    );
    expect(unknown.statement).toContain(UNKNOWN_MEANS_NOT_REVIEWED);
  });
});
