import { describe, expect, it } from "vitest";
import { parseFormDXml } from "@/lib/ingestion/secFormDConnector";
import { buildWhEftsQuery } from "@/lib/ingestion/publicRecords/whSearchTerms";

const SAMPLE_FORM_D_XML = `<?xml version="1.0"?>
<edgarSubmission>
  <issuerName>FemHealth Therapeutics Inc</issuerName>
  <industryGroupType>Biotechnology</industryGroupType>
  <jurisdictionOfInc>DE</jurisdictionOfInc>
  <totalOfferingAmount>5000000</totalOfferingAmount>
  <totalAmountSold>3200000</totalAmountSold>
  <dateOfFirstSale>2024-03-15</dateOfFirstSale>
  <federalExemptionsExclusions>06b</federalExemptionsExclusions>
</edgarSubmission>`;

describe("secFormDConnector", () => {
  it("parses issuer and offering fields from Form D XML", () => {
    const parsed = parseFormDXml(SAMPLE_FORM_D_XML, {
      cik: "1234567",
      accession: "0001234567-24-000001",
      filingDate: "2024-06-01",
      filingUrl: "https://example.com/formd.xml",
    });

    expect(parsed.issuerName).toBe("FemHealth Therapeutics Inc");
    expect(parsed.totalOfferingAmount).toBe(5_000_000);
    expect(parsed.totalAmountSold).toBe(3_200_000);
    expect(parsed.firstSaleDate).toBe("2024-03-15");
    expect(parsed.isHealthcareIndustry).toBe(true);
    expect(parsed.eventId).toBe("formd-0001234567-24-000001");
  });
});

describe("whSearchTerms", () => {
  it("builds OR-joined EFTS query", () => {
    const q = buildWhEftsQuery();
    expect(q).toContain('"fertility"');
    expect(q).toContain(" OR ");
  });
});
