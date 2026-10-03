import { describe, expect, it } from "vitest";
import {
  classifyAndScoreAsset,
  processInstitutionalPipeline,
} from "@/lib/ingestion/institutionalAssetClassification";

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

  it("maps the four-deal prototype to the two institutional candidates", () => {
    const dataset = [
      {
        deal_id: "DEAL-001",
        target_name: "Precision Therapeutics Inc",
        sector: "Precision Medicine",
        description:
          "In-hospital targeted biological therapeutic treating chromosomal-driven acute complications.",
        disclosed_value_usd: 720_000_000,
        trial_endpoints_type: "surrogate_biomarker",
        endpoint_validation_level: "clinical",
        billing_mechanism: "MS-DRG",
        patent_life_years: 14,
        nursing_workflow_efficiency_delta: 8,
      },
      {
        deal_id: "DEAL-002",
        target_name: "FemmeWear App",
        sector: "Consumer Health",
        description:
          "Consumer wearable application tracking lifestyle metrics and menstrual cycles via subscription models.",
        disclosed_value_usd: 15_000_000,
        trial_endpoints_type: "patient_reported_surveys",
        billing_mechanism: "Out_of_Pocket_Cash",
        patent_life_years: 2,
        nursing_workflow_efficiency_delta: -2,
      },
      {
        deal_id: "DEAL-003",
        target_name: "Neonatal BioSolutions",
        sector: "Maternal & Child Health",
        description:
          "Acute ICU/NICU biological drug addressing sex-based cell-count variance in premature infants.",
        disclosed_value_usd: 450_000_000,
        trial_endpoints_type: "surrogate_biomarker",
        endpoint_validation_level: "clinical",
        billing_mechanism: "NTAP",
        patent_life_years: 11,
        nursing_workflow_efficiency_delta: 9,
      },
      {
        deal_id: "DEAL-004",
        target_name: "Fertility Clinic Chain Network",
        sector: "Consumer Health / Clinics",
        description:
          "Brick-and-mortar D2C fertility clinics utilizing app-based booking and lifestyle wellness packaging.",
        disclosed_value_usd: 120_000_000,
        trial_endpoints_type: "patient_reported_surveys",
        billing_mechanism: "Employer_Benefits",
        patent_life_years: 0,
        nursing_workflow_efficiency_delta: 0,
      },
    ];

    const filtered = processInstitutionalPipeline(dataset);

    expect(filtered.map((deal) => deal.deal_id)).toEqual([
      "DEAL-001",
      "DEAL-003",
    ]);
    expect(
      filtered.every(
        (deal) =>
          deal.category === "Sex-Based Biology & Targeted Therapeutics (SBBT)",
      ),
    ).toBe(true);
    expect(
      filtered.every(
        (deal) => deal.workspace_routing === "Deals / In-Hospital Therapeutics",
      ),
    ).toBe(true);
  });
});
