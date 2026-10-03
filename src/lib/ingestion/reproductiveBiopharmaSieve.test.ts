import { describe, expect, it } from "vitest";
import { runInstitutionalFertilitySieve } from "@/lib/ingestion/reproductiveBiopharmaSieve";

const dataset = [
  {
    deal_id: "FERT-001",
    target_name: "Kindbody / Boutique Clinic Rollup",
    type: "Retail Clinics",
    description:
      "Brick-and-mortar outpatient fertility clinic expansion using point-solution consumer apps.",
    disclosed_value_usd: 100000000,
    is_inpatient_hospital_node: false,
    has_surrogate_biomarkers: false,
  },
  {
    deal_id: "FERT-002",
    target_name: "Gameto / Fertilo Platform",
    type: "Biotech / Therapeutics",
    description:
      "Induced pluripotent stem cell platform to mature eggs outside the body, replacing intensive hormonal injections.",
    disclosed_value_usd: 73000000,
    is_inpatient_hospital_node: true,
    has_surrogate_biomarkers: true,
  },
  {
    deal_id: "FERT-003",
    target_name: "ReproNovo Therapeutics",
    type: "Biotech / Therapeutics",
    description:
      "Small-molecule pipeline for acute inpatient reproductive conditions and adjunctive ART therapies.",
    disclosed_value_usd: 65000000,
    is_inpatient_hospital_node: true,
    has_surrogate_biomarkers: true,
  },
  {
    deal_id: "FERT-004",
    target_name: "Myna Mira Lifestyle App",
    type: "Consumer App",
    description:
      "Direct-to-consumer mobile application for cycle tracking and natural hormone health mapping via subscriptions.",
    disclosed_value_usd: 12000000,
    is_inpatient_hospital_node: false,
    has_surrogate_biomarkers: false,
  },
];

describe("runInstitutionalFertilitySieve", () => {
  it("curates inpatient reproductive assets with surrogate-biomarker evidence", () => {
    const result = runInstitutionalFertilitySieve(dataset);
    expect(result.map((deal) => deal.deal_id)).toEqual([
      "FERT-002",
      "FERT-003",
    ]);
    expect(
      result.every(
        (deal) =>
          deal.broad_sector === "Sex-Based Biology & Targeted Therapeutics (SBBT)",
      ),
    ).toBe(true);
    expect(
      result.every(
        (deal) =>
          deal.sub_specialty ===
          "Reproductive Biopharma / Critical Neonatal Infrastructure",
      ),
    ).toBe(true);
  });

  it("does not mutate the source records", () => {
    const source = [{ ...dataset[1] }];
    const result = runInstitutionalFertilitySieve(source);
    expect(source[0]).not.toHaveProperty("broad_sector");
    expect(result[0]).toHaveProperty("investment_thesis");
  });

  it("excludes consumer and retail-clinic noise", () => {
    expect(
      runInstitutionalFertilitySieve([dataset[0], dataset[3]]),
    ).toEqual([]);
  });
});
