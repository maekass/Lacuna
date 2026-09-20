import { describe, expect, it } from "vitest";
import artifactJson from "@/data/ml/hazard/acquisition-time-v1.json";
import {
  encodeHazardFeatures,
  HAZARD_ARTIFACT,
  HAZARD_DISCLAIMER,
  type HazardArtifact,
  lookupBaseline,
  scoreHazard,
  scoreVerifiedCompanyHazard,
} from "@/lib/scoring/hazard";

const artifact = artifactJson as HazardArtifact;

describe("hazard scoring consumer", () => {
  it("loads a descriptive Cox artifact", () => {
    expect(HAZARD_ARTIFACT.claimClass).toBe("descriptive");
    expect(HAZARD_ARTIFACT.modelType).toBe("cox_ph_breslow");
    expect(HAZARD_ARTIFACT.id).toBe("acquisition-time-v1");
    expect(HAZARD_DISCLAIMER).toContain("Not a forecast");
    expect(artifact.coefficients).toHaveLength(
      artifact.keptFeatureNames.length,
    );
    expect(artifact.sufficiency.fits).toBe(true);
  });

  it("encodes sector dummies against the reference group", () => {
    expect(
      encodeHazardFeatures("Fertility", [
        "sector_fertility",
        "sector_diagnostics",
      ]),
    )
      .toEqual([1, 0]);
    expect(
      encodeHazardFeatures("Diagnostics", [
        "sector_fertility",
        "sector_diagnostics",
      ]),
    ).toEqual([0, 1]);
    expect(
      encodeHazardFeatures("Menopause", [
        "sector_fertility",
        "sector_diagnostics",
      ]),
    )
      .toEqual([0, 0]);
  });

  it("scores relative hazard as exp(xβ) for kept features", () => {
    const fert = scoreHazard({ sector: "Fertility" });
    const dx = scoreHazard({ sector: "Diagnostics" });
    const other = scoreHazard({ sector: "Menopause" });
    expect(fert.status).toBe("ok");
    expect(dx.status).toBe("ok");
    expect(other.status).toBe("ok");
    if (fert.status !== "ok" || dx.status !== "ok" || other.status !== "ok") {
      return;
    }
    expect(other.relativeHazard).toBeCloseTo(1, 10);
    expect(other.linearPredictor).toBeCloseTo(0, 10);
    const fertIdx = artifact.keptFeatureNames.indexOf("sector_fertility");
    if (fertIdx >= 0) {
      expect(fert.relativeHazard).toBeCloseTo(
        Math.exp(artifact.coefficients[fertIdx]),
        10,
      );
    }
    expect(fert.disclaimer).toBe(HAZARD_DISCLAIMER);
  });

  it("returns insufficient_disclosed_data when sector is missing", () => {
    const result = scoreHazard({});
    expect(result.status).toBe("insufficient_disclosed_data");
    if (result.status === "insufficient_disclosed_data") {
      expect(result.reason).toMatch(/sector/i);
    }
  });

  it("excludes companies without a founded year", () => {
    const result = scoreVerifiedCompanyHazard({ sector: "Fertility" });
    expect(result.status).toBe("insufficient_disclosed_data");
    if (result.status === "insufficient_disclosed_data") {
      expect(result.reason).toMatch(/founded year/);
    }
  });

  it("looks up Breslow baseline as a step function", () => {
    const times = artifact.baseline.times;
    expect(times.length).toBeGreaterThan(0);
    const first = lookupBaseline(times[0] - 0.01);
    expect(first?.survival).toBe(1);
    expect(first?.cumulativeHazard).toBe(0);
    const at = lookupBaseline(times[0]);
    expect(at?.survival).toBe(artifact.baseline.survival[0]);
  });

  it("does not invent a score when the fit is insufficient", () => {
    const broken: HazardArtifact = {
      ...artifact,
      sufficiency: {
        ...artifact.sufficiency,
        fits: false,
        reason: "Only 3 events; need at least 20 to report relative hazards.",
      },
    };
    const result = scoreHazard({ sector: "Fertility" }, broken);
    expect(result.status).toBe("insufficient_disclosed_data");
  });
});
