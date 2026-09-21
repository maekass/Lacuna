import { describe, expect, it } from "vitest";
import artifactJson from "@/data/ml/hazard/acquisition-time-v1.json";
import {
  HAZARD_ARTIFACT,
  HAZARD_DISCLAIMER,
  type HazardArtifact,
  lookupBaseline,
  scoreHazard,
  scoreVerifiedCompanyHazard,
} from "@/lib/scoring/hazard";

const artifact = artifactJson as HazardArtifact;

describe("hazard scoring consumer", () => {
  it("loads a descriptive baseline-only Cox artifact", () => {
    expect(HAZARD_ARTIFACT.claimClass).toBe("descriptive");
    expect(HAZARD_ARTIFACT.modelType).toBe("cox_ph_breslow");
    expect(HAZARD_ARTIFACT.id).toBe("acquisition-time-v1");
    expect(HAZARD_DISCLAIMER).toContain("Not a forecast");
    expect(artifact.featureNames).toEqual([]);
    expect(artifact.keptFeatureNames).toEqual([]);
    expect(artifact.coefficients).toEqual([]);
    expect(artifact.hazardRatios).toEqual([]);
    expect(artifact.sufficiency.fits).toBe(true);
    expect(artifact.metrics.logPartialLikelihood).toBeLessThan(0);
  });

  it("scores every company at relative hazard 1", () => {
    const fert = scoreHazard({ sector: "Fertility" });
    const dx = scoreHazard({ sector: "Diagnostics" });
    const other = scoreHazard({ sector: "Menopause" });
    const noSector = scoreHazard({});
    expect(fert.status).toBe("ok");
    expect(dx.status).toBe("ok");
    expect(other.status).toBe("ok");
    expect(noSector.status).toBe("ok");
    if (
      fert.status !== "ok" ||
      dx.status !== "ok" ||
      other.status !== "ok" ||
      noSector.status !== "ok"
    ) {
      return;
    }
    expect(fert.relativeHazard).toBe(1);
    expect(dx.relativeHazard).toBe(1);
    expect(other.relativeHazard).toBe(1);
    expect(noSector.relativeHazard).toBe(1);
    expect(fert.linearPredictor).toBe(0);
    expect(noSector.sector).toBeNull();
    expect(fert.disclaimer).toBe(HAZARD_DISCLAIMER);
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
        reason: "Only 3 events; need at least 20 to report a baseline hazard.",
      },
    };
    const result = scoreHazard({ sector: "Fertility" }, broken);
    expect(result.status).toBe("insufficient_disclosed_data");
  });

  it("rejects artifacts that still list dummy covariates", () => {
    const broken: HazardArtifact = {
      ...artifact,
      featureNames: ["sector_fertility"],
      keptFeatureNames: ["sector_fertility"],
      coefficients: [-0.3],
      hazardRatios: [0.74],
    };
    const result = scoreHazard({}, broken);
    expect(result.status).toBe("insufficient_disclosed_data");
    if (result.status === "insufficient_disclosed_data") {
      expect(result.reason).toMatch(/dummy/i);
    }
  });
});
