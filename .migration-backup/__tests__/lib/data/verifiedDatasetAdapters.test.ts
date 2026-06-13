import { describe, expect, it } from "vitest";
import {
  getVerifiedAcquisitionsForAnalysis,
  getVerifiedCompaniesForAnalysis,
  getVerifiedCompetitiveAnalysisData,
  getVerifiedNetworkGraph,
} from "@/lib/data/verifiedDatasetAdapters";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";
import { minimalVerifiedDataset } from "../../helpers/fixtures";

const derived = buildVerifiedDerivedData(minimalVerifiedDataset);

describe("verifiedDatasetAdapters", () => {
  it("getVerifiedCompaniesForAnalysis maps company fields (success)", () => {
    const companies = getVerifiedCompaniesForAnalysis(derived);
    expect(companies[0].id).toBe("c1");
    expect(companies[0].employees).toBe(0);
    expect(companies[0].valuation).toBe(225);
  });

  it("getVerifiedAcquisitionsForAnalysis normalizes deal types (success)", () => {
    const acquisitions = getVerifiedAcquisitionsForAnalysis(derived);
    expect(acquisitions[0].dealType).toBe("Acquisition");
  });

  it("getVerifiedCompetitiveAnalysisData builds acquirer graph inputs (success)", () => {
    const { acquirers, companies, acquisitions } =
      getVerifiedCompetitiveAnalysisData(derived);
    expect(acquirers.some((a) => a.id === "c2")).toBe(true);
    expect(companies.some((c) => c.id === "c1")).toBe(true);
    expect(acquisitions).toHaveLength(1);
  });

  it("getVerifiedNetworkGraph returns nodes and edges (success)", () => {
    const { nodes, edges } = getVerifiedNetworkGraph(derived);
    expect(nodes.length).toBeGreaterThan(0);
    expect(edges[0].source).toBe("c2");
    expect(edges[0].target).toBe("c1");
  });

  it("handles empty dataset without throwing (edge)", () => {
    const empty = buildVerifiedDerivedData({
      ...minimalVerifiedDataset,
      companies: [],
      acquirers: [],
      acquisitions: [],
    });
    expect(getVerifiedCompaniesForAnalysis(empty)).toEqual([]);
    expect(getVerifiedNetworkGraph(empty).edges).toEqual([]);
  });
});
