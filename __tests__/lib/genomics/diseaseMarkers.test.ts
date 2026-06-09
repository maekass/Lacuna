import { describe, expect, it } from "vitest";
import {
  allDiseaseMarkerGenes,
  DISEASE_MARKER_PANELS,
  getDiseaseMarkerPanel,
} from "@/lib/genomics/diseaseMarkers";

describe("DISEASE_MARKER_PANELS", () => {
  it("covers PCOS, breast cancer, sickle cell, and lupus (success)", () => {
    const ids = DISEASE_MARKER_PANELS.map((p) => p.id);
    expect(ids).toContain("pcos");
    expect(ids).toContain("breast_cancer");
    expect(ids).toContain("sickle_cell");
    expect(ids).toContain("lupus");
  });

  it("includes BRCA1 and HBB query genes (success)", () => {
    const genes = allDiseaseMarkerGenes();
    expect(genes).toContain("BRCA1");
    expect(genes).toContain("HBB");
    expect(genes).toContain("DENND1A");
  });

  it("getDiseaseMarkerPanel returns sickle cell panel (edge)", () => {
    const panel = getDiseaseMarkerPanel("sickle_cell");
    expect(panel?.queryGenes).toContain("HBB");
    expect(panel?.disparityNote.toLowerCase()).toContain("black");
  });
});
