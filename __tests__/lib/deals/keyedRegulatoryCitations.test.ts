import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  getDealDetailView,
  isKeyedRegulatoryCitation,
  isPublicCptCitation,
  isPublicNctCitation,
  KEYED_REGULATORY_CITATIONS,
  keyedRegulatoryCitationsForTarget,
  type KeyedRegulatoryCitation,
} from "@/lib/deals";

const VALID_NCT: KeyedRegulatoryCitation = {
  targetId: "c24",
  source: "clinicaltrials.gov",
  codeKind: "nct",
  code: "NCT01234567",
  citationUrl: "https://clinicaltrials.gov/study/NCT01234567",
  label: "Example keyed trial",
};

const VALID_CPT: KeyedRegulatoryCitation = {
  targetId: "c24",
  source: "cms",
  codeKind: "cpt",
  code: "77067",
  citationUrl:
    "https://www.cms.gov/medicare/payment/fee-schedules/physician",
};

describe("keyed regulatory citations", () => {
  it("accepts a public NCT study page keyed to a targetId", () => {
    expect(isPublicNctCitation(VALID_NCT.code, VALID_NCT.citationUrl)).toBe(
      true,
    );
    expect(isKeyedRegulatoryCitation(VALID_NCT)).toBe(true);
  });

  it("accepts a public CMS CPT citation keyed to a targetId", () => {
    expect(isPublicCptCitation(VALID_CPT.code, VALID_CPT.citationUrl)).toBe(
      true,
    );
    expect(isKeyedRegulatoryCitation(VALID_CPT)).toBe(true);
  });

  it("rejects a live API search on the company name", () => {
    const nameSearch: KeyedRegulatoryCitation = {
      targetId: "c24",
      source: "clinicaltrials.gov",
      codeKind: "nct",
      code: "NCT01234567",
      citationUrl:
        "https://clinicaltrials.gov/api/v2/studies?query.term=Hologic",
    };
    expect(isKeyedRegulatoryCitation(nameSearch)).toBe(false);
    expect(
      isPublicNctCitation(
        "NCT01234567",
        "https://clinicaltrials.gov/api/v2/studies?query.term=Biotheranostics",
      ),
    ).toBe(false);
  });

  it("rejects enrichment that has no targetId or public NCT/CPT code", () => {
    expect(isKeyedRegulatoryCitation({
      targetId: "",
      source: "openfda",
      codeKind: "nct",
      code: "NCT01234567",
      citationUrl: VALID_NCT.citationUrl,
    })).toBe(false);
    expect(isPublicNctCitation("Hologic", VALID_NCT.citationUrl)).toBe(false);
    expect(isPublicCptCitation("mammography", VALID_CPT.citationUrl)).toBe(
      false,
    );
  });

  it("does not attach name-search enrichment to verified deal dossiers", () => {
    const dataset = getStaticVerifiedDataset();
    expect(KEYED_REGULATORY_CITATIONS).toEqual([]);
    for (const row of dataset.acquisitions) {
      const view = getDealDetailView(dataset, row.id);
      expect(view?.regulatoryCitations).toEqual([]);
      expect(keyedRegulatoryCitationsForTarget(row.targetId)).toEqual([]);
    }
  });
});
