import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import reviewJson from "@/data/foundingYearReview.json";
import verifiedJson from "@/data/dataset.verified.json";
import { COMPANY_YEAR_PANEL_LIMIT } from "@/lib/data/foundingYearPolicy";
import {
  acceptedRowFromAttestation,
  findAmbiguousFoundingEntities,
  formatFoundingYearStatsBlock,
  type FoundingYearReviewRow,
  listFoundingYearAttestationGaps,
  parseFoundingYearReview,
  summarizeFoundedYears,
  validateFoundingYearReview,
} from "@/lib/data/foundingYearReview";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";

const dataset = parseStaticVerifiedDatasetJson(verifiedJson);
const review = parseFoundingYearReview(reviewJson);

function companyRefs() {
  return dataset.companies.map((company) => ({
    id: company.id,
    name: company.name,
    sector: company.sector,
    ...(company.founded !== undefined ? { founded: company.founded } : {}),
  }));
}

function rowFor(companyId: string): FoundingYearReviewRow {
  const row = review.rows.find((candidate) =>
    candidate.companyId === companyId
  );
  if (!row) throw new Error(`missing row ${companyId}`);
  return row;
}

describe("founding year review ledger", () => {
  it("matches the catalog and leaves every missing year blank", () => {
    expect(validateFoundingYearReview(companyRefs(), review)).toEqual([]);
    const stats = summarizeFoundedYears(dataset.companies, review);
    expect(stats).toMatchObject({
      companiesTotal: 150,
      withFoundedYear: 103,
      missingFoundedYear: 47,
      minFoundedYear: 1948,
      maxFoundedYear: 2022,
      backlogRows: 47,
      acceptedRows: 0,
    });
    const missingIds = dataset.companies
      .filter((company) => company.founded === undefined)
      .map((company) => company.id)
      .sort();
    const backlogIds = review.rows.map((row) => row.companyId).sort();
    expect(backlogIds).toEqual(missingIds);
    expect(review.rows.every((row) => row.foundedYear === null)).toBe(true);
  });

  it("blocks the two catalog name collisions instead of copying a stored year", () => {
    const ambiguous = findAmbiguousFoundingEntities(dataset.companies);
    expect(ambiguous.map((entity) => [
      entity.companyId,
      entity.canonicalCompanyId,
    ])).toEqual([
      ["c114", "c4"],
      ["c121", "c11"],
    ]);
    expect(rowFor("c114").reviewStatus).toBe("blocked_entity_resolution");
    expect(rowFor("c114").foundedYear).toBeNull();
    expect(rowFor("c121").canonicalCompanyId).toBe("c11");
    expect(rowFor("c44").reviewStatus).toBe("unresolved");
    expect(rowFor("c44").notes).toContain("deal27");
  });

  it("rejects a catalog year that is neither grandfathered nor accepted", () => {
    const companies = companyRefs().map((company) =>
      company.id === "c90" ? { ...company, founded: 2015 } : company
    );
    const issues = validateFoundingYearReview(companies, review);
    expect(
      issues.some((issue) => issue.code === "foundingYear.uncertifiedYear"),
    )
      .toBe(true);
    expect(issues.some((issue) => issue.code === "foundingYear.openRowHasYear"))
      .toBe(true);
  });

  it("accepts a year only when the ledger row and the catalog agree", () => {
    const accepted: FoundingYearReviewRow = {
      ...rowFor("c90"),
      foundedYear: 2014,
      sourceUrl: "https://example.com/apollo-about",
      sourceName: "Apollo Neuroscience about page",
      sourceType: "official_company",
      sourceAccessDate: "2026-10-05",
      evidenceLocator: "About page states the company was founded in 2014.",
      confidence: "stated",
      reviewStatus: "accepted",
      reviewer: "Case Reviewer",
      notInferred: true,
      notes: null,
    };
    const nextReview = {
      ...review,
      rows: review.rows.map((row) => row.companyId === "c90" ? accepted : row),
    };
    const parsed = parseFoundingYearReview(nextReview);
    const companies = companyRefs().map((company) =>
      company.id === "c90" ? { ...company, founded: 2014 } : company
    );
    expect(validateFoundingYearReview(companies, parsed)).toEqual([]);
  });

  it("rejects an accepted year without provenance or an inference attestation", () => {
    const bare = {
      ...review,
      rows: review.rows.map((row) =>
        row.companyId === "c90"
          ? { ...row, reviewStatus: "accepted", foundedYear: 2014 }
          : row
      ),
    };
    expect(() => parseFoundingYearReview(bare)).toThrow();

    const inferred = {
      ...review,
      rows: review.rows.map((row) =>
        row.companyId === "c90"
          ? {
            ...row,
            foundedYear: 2014,
            sourceUrl: "https://example.com/apollo-about",
            sourceName: "Apollo Neuroscience about page",
            sourceType: "official_company",
            sourceAccessDate: "2026-10-05",
            evidenceLocator:
              "About page states the company was founded in 2014.",
            confidence: "stated",
            reviewStatus: "accepted",
            reviewer: "Case Reviewer",
            notInferred: false,
          }
          : row
      ),
    };
    expect(() => parseFoundingYearReview(inferred)).toThrow(/notInferred/);
  });

  it("requires a second URL before a database year can be accepted", () => {
    const databaseOnly = {
      ...review,
      rows: review.rows.map((row) =>
        row.companyId === "c90"
          ? {
            ...row,
            foundedYear: 2014,
            sourceUrl: "https://www.crunchbase.com/organization/apollo",
            sourceName: "Crunchbase",
            sourceType: "corroborated_database",
            sourceAccessDate: "2026-10-05",
            evidenceLocator: "Crunchbase profile lists founded 2014.",
            confidence: "stated",
            reviewStatus: "accepted",
            reviewer: "Case Reviewer",
            notInferred: true,
          }
          : row
      ),
    };
    expect(() => parseFoundingYearReview(databaseOnly)).toThrow(
      /second http/,
    );
  });

  it("pins the governance doc and the panel limit to the live catalog", () => {
    const stats = summarizeFoundedYears(dataset.companies, review);
    const doc = readFileSync(
      path.join(process.cwd(), "docs/FOUNDING_YEAR_PROVENANCE.md"),
      "utf8",
    );
    const begin = doc.indexOf("<!-- FOUNDING_YEAR_STATS_BEGIN -->");
    const end = doc.indexOf("<!-- FOUNDING_YEAR_STATS_END -->");
    expect(begin).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(begin);
    expect(doc.slice(begin, end)).toContain(
      formatFoundingYearStatsBlock(stats),
    );
    expect(doc).toContain("company age");
    expect(doc).toContain("funding date");
    expect(doc).toContain("product launch");
    expect(doc).toContain("domain-registration date");
    expect(doc).toContain("model output");
    expect(doc).toContain("not analysis-ready");
    for (const entity of stats.ambiguousEntities) {
      expect(doc).toContain(entity.companyId);
      expect(doc).toContain(entity.canonicalCompanyId);
    }

    const modelCard = readFileSync(
      path.join(process.cwd(), "docs/MODEL_CARD.md"),
      "utf8",
    );
    expect(modelCard).toContain(
      `${stats.missingFoundedYear}/${stats.companiesTotal}`,
    );
    expect(modelCard).toContain("not constructible");
    expect(modelCard).toContain(String(stats.minFoundedYear));
    expect(modelCard).toContain(String(stats.maxFoundedYear));

    const dealsPage = readFileSync(
      path.join(process.cwd(), "src/app/sections/DealsPage.tsx"),
      "utf8",
    );
    const survival = readFileSync(
      path.join(process.cwd(), "src/components/SurvivalCurve.tsx"),
      "utf8",
    );
    expect(dealsPage).toContain("COMPANY_YEAR_PANEL_LIMIT");
    expect(survival).toContain("COMPANY_YEAR_PANEL_LIMIT");
    expect(COMPANY_YEAR_PANEL_LIMIT).toContain("not constructible");
  });
});

describe("founding year attestation gaps", () => {
  it("does not treat a bare integer as an accepted year", () => {
    expect(listFoundingYearAttestationGaps({ foundedYear: 2018 })).toContain(
      "company.founded.sourceUrl",
    );
    expect(listFoundingYearAttestationGaps({})).toContain("company.founded");
    expect(acceptedRowFromAttestation({
      companyId: "c90",
      companyName: "Apollo Neuroscience",
      sector: "Consumer",
      foundedYear: 2018,
    })).toBeNull();
  });

  it("builds an accepted row when the citation is complete", () => {
    const row = acceptedRowFromAttestation({
      companyId: "c90",
      companyName: "Apollo Neuroscience",
      sector: "Consumer",
      foundedYear: 2018,
      sourceUrl: "https://example.com/about",
      sourceName: "Company about page",
      sourceType: "official_company",
      sourceAccessDate: "2026-10-05",
      evidenceLocator: "About page: founded in 2018.",
      reviewer: "Case Reviewer",
      notInferred: true,
    });
    expect(row?.reviewStatus).toBe("accepted");
    expect(row?.foundedYear).toBe(2018);
    expect(row?.notInferred).toBe(true);
  });
});
