import { describe, expect, it } from "vitest";
import { getStagePosition } from "@/lib/network/strategicPositioningHelpers";
import { getVerifiedCompaniesForAnalysis } from "@/lib/data/verifiedDatasetAdapters";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { minimalVerifiedDataset } from "../../helpers/fixtures";

describe("stage position", () => {
  it("does not place outcome-only or unrecognized stages at a midpoint", () => {
    expect(getStagePosition("Acquired by Hologic (2021)")).toBeNull();
    expect(getStagePosition("Private")).toBeNull();
    expect(getStagePosition("Student Startup (JHU)")).toBeNull();
    expect(getStagePosition("Private (Series A)")).toBe(0.34);
    expect(getStagePosition("Private (Series G)")).toBe(0.76);
  });

  it("does not relabel an acquisition outcome as Late Stage", () => {
    const companies = getVerifiedCompaniesForAnalysis(
      buildVerifiedDerivedData(minimalVerifiedDataset),
    );
    expect(companies.find((company) => company.id === "c24")?.stage).toBe(
      "Unspecified",
    );
  });
});
