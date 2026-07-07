import { describe, expect, it } from "vitest";
import { eftsHitToClassifiedDeal } from "@/lib/ingestion/eftsMaIngestPipeline";
import {
  parseCandidatesCsv,
  type CsvCandidateRow,
} from "@/lib/ingestion/importCandidatesCsv";

describe("parseCandidatesCsv", () => {
  it("parses valid rows and skips comments", () => {
    const csv = `# template
status,target_name,acquirer_name,acquirer_ticker,announced_date,closed_date,deal_type,deal_value_millions,deal_value_note,primary_source_url,secondary_source_url,strategic_rationale,inclusion_notes
pending,Target Co,Buyer Inc,BUY,2024-06-01,,Acquisition,120,per press,https://example.com/pr,https://example.com/sec,,notes here
`;
    const { rows, errors } = parseCandidatesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.targetName).toBe("Target Co");
    expect(rows[0]?.dealValueMillions).toBe(120);
  });

  it("reports invalid rows missing required fields", () => {
    const { rows, errors } = parseCandidatesCsv("pending,,Buyer,,,,,,,,,,");
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("eftsHitToClassifiedDeal", () => {
  it("maps EFTS hit to WH staging row with SEC index URL", () => {
    const deal = eftsHitToClassifiedDeal({
      cik: "1234567",
      companyName: "Acquirer Health Co",
      form: "8-K",
      filingDate: "2024-05-10",
      accession: "0001234567-24-000099",
    });
    expect(deal.womensHealthRelevant).toBe(true);
    expect(deal.acquirerName).toBe("Acquirer Health Co");
    expect(deal.filingUrl).toContain("1234567");
    expect(deal.filingUrl).toContain("index.htm");
    expect(deal.dealId).toMatch(/^sec-/);
  });
});

describe("csvRow shape", () => {
  it("accepts minimal manual candidate", () => {
    const row: CsvCandidateRow = {
      targetName: "FemTech Inc",
      acquirerName: "Big Pharma",
      primarySourceUrl: "https://sec.gov/example",
    };
    expect(row.targetName).toBe("FemTech Inc");
  });
});
