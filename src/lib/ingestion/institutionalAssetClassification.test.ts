import { describe, expect, it } from "vitest";
import { classifyAndScoreAsset } from "@/lib/ingestion/institutionalAssetClassification";

describe("classifyAndScoreAsset", () => {
  it("does not exclude an institutional asset merely because its description contains a consumer signal", () => {
    const result = classifyAndScoreAsset({
      description: "Hospital therapeutic with a wearable companion app.",
      distribution_model: "institutional",
      trial_endpoints_type: "clinical_outcome",
      endpoint_validation_level: "clinical",
      billing_mechanism: "MS-DRG",
      patent_life_years: 10,
      sample_size_n: 1000,
      nursing_workflow_efficiency_delta: 0.25,
    });

    expect(result.eligible).toBe(true);
    expect(result.evidence_flags.consumer_noise_detected).toBe(true);
    expect(result.workspace_routing).toBe("Deals / In-Hospital Therapeutics");
  });

  it("excludes consumer-primary distribution", () => {
    const result = classifyAndScoreAsset({
      description: "Digital wellness subscription.",
      distribution_model: "consumer",
    });

    expect(result.eligible).toBe(false);
    expect(result.evidence_flags.consumer_noise_detected).toBe(true);
    expect(result.reasons[0]).toContain("consumer-oriented");
  });

  it("requires a validated clinical endpoint", () => {
    const result = classifyAndScoreAsset({
      distribution_model: "institutional",
      trial_endpoints_type: "surrogate_biomarker",
      endpoint_validation_level: "exploratory",
      billing_mechanism: "MS-DRG",
    });

    expect(result.eligible).toBe(false);
    expect(result.evidence_flags.validated_endpoint).toBe(false);
  });

  it("requires institutional reimbursement or adoption", () => {
    const result = classifyAndScoreAsset({
      distribution_model: "institutional",
      trial_endpoints_type: "validated_surrogate",
      endpoint_validation_level: "validated",
    });

    expect(result.eligible).toBe(false);
    expect(result.evidence_flags.validated_endpoint).toBe(true);
    expect(result.evidence_flags.institutional_adoption).toBe(false);
  });

  it("normalizes heterogeneous defensibility inputs before weighting", () => {
    const result = classifyAndScoreAsset({
      distribution_model: "institutional",
      trial_endpoints_type: "clinical_outcome",
      endpoint_validation_level: "regulatory",
      billing_mechanism: "NTAP",
      patent_life_years: 10,
      sample_size_n: 1000,
      nursing_workflow_efficiency_delta: 0,
    });

    expect(result.eligible).toBe(true);
    expect(result.component_scores).toEqual({
      ip_protection: 0.5,
      clinical_evidence_scale: 0.5,
      workflow_economics: 0.5,
    });
    expect(result.defensibility_index).toBe(50);
  });
});
