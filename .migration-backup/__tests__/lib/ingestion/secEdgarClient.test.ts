import { describe, expect, it } from "vitest";
import { formatHitsAsCsvRows } from "@/lib/ingestion/secEdgarClient";

function matchesAcquisitionKeyword(text: string): string[] {
  const keywords = [
    "acquisition",
    "acquire",
    "merger",
    "merge",
    "purchase agreement",
    "definitive agreement",
    "asset purchase",
    "business combination",
  ];
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

describe("secEdgarClient CSV formatting", () => {
  it("formats hits as staging CSV rows (success)", () => {
    const rows = formatHitsAsCsvRows([
      {
        ticker: "TDOC",
        cik: "1477449",
        companyName: "Teladoc Health Inc",
        form: "8-K",
        filingDate: "2020-07-01",
        accessionNumber: "0001193125-20-178123",
        primaryDocument: "d8k.htm",
        description: "Entry into Material Definitive Agreement - Merger",
        filingUrl: "https://www.sec.gov/example",
        matchedKeywords: ["merger"],
      },
    ]);

    expect(rows[0]).toContain("status,target_name");
    expect(rows[1]).toContain("pending");
    expect(rows[1]).toContain("TDOC");
    expect(rows[1]).toContain("https://www.sec.gov/example");
  });
});

describe("acquisition keyword matching", () => {
  it("matches merger language (success)", () => {
    expect(matchesAcquisitionKeyword("Agreement and Plan of Merger")).toContain(
      "merger",
    );
  });

  it("returns empty for unrelated filings (edge)", () => {
    expect(matchesAcquisitionKeyword("Results of Operations")).toHaveLength(0);
  });
});
