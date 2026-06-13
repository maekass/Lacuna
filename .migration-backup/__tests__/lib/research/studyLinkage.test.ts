import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOMESTIC_RESEARCH_STUDIES,
  STUDY_TRIAL_NCT_LINKS,
} from "@/lib/research/domesticStudyCatalog";

const mockQuery = vi.fn();

vi.mock("@/lib/data/dbClient", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

describe("studyLinkage", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("lists research study rows from Postgres (success)", async () => {
    mockQuery.mockResolvedValueOnce([
      {
        study_id: "nih-whi",
        institution: "nih",
        sample_size: 161_808,
        source: "NIH WHI",
        marker_genes: ["BRCA1", "BRCA2"],
      },
    ]);

    const { listResearchStudiesFromDb } = await import(
      "@/lib/research/studyLinkage"
    );
    const rows = await listResearchStudiesFromDb();
    expect(rows[0]?.studyId).toBe("nih-whi");
    expect(rows[0]?.markerGenes).toEqual(["BRCA1", "BRCA2"]);
  });

  it("loads trial and callset links into a map (success)", async () => {
    mockQuery
      .mockResolvedValueOnce([
        { study_id: "nih-whi", nct_id: "NCT00000611" },
      ])
      .mockResolvedValueOnce([
        { study_id: "nih-tcga-breast", callset_id: "demo-brca-panel-grch38" },
      ]);

    const { getStudyLinkageMap } = await import("@/lib/research/studyLinkage");
    const map = await getStudyLinkageMap(["nih-whi", "nih-tcga-breast"]);

    expect(map.get("nih-whi")?.nctIds).toEqual(["NCT00000611"]);
    expect(map.get("nih-tcga-breast")?.callsetIds).toEqual([
      "demo-brca-panel-grch38",
    ]);
  });

  it("STUDY_TRIAL_NCT_LINKS keys exist in domestic catalog (edge)", () => {
    const studyIds = new Set(DOMESTIC_RESEARCH_STUDIES.map((s) => s.studyId));
    for (const studyId of Object.keys(STUDY_TRIAL_NCT_LINKS)) {
      expect(studyIds.has(studyId)).toBe(true);
    }
  });
});
