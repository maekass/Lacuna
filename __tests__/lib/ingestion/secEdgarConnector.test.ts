import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDealId,
  extractItem201Section,
  filingContainsItem201,
  isHealthcareSic,
  parseItem201,
} from "@/lib/ingestion/secEdgarConnector";

describe("secEdgarConnector", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isHealthcareSic matches 283 and 384 prefixes (success)", () => {
    expect(isHealthcareSic("2834")).toBe(true);
    expect(isHealthcareSic("3841")).toBe(true);
    expect(isHealthcareSic("7372")).toBe(false);
  });

  it("buildDealId is stable from accession + cik (success)", () => {
    expect(buildDealId("0001193125-20-178123", "1477449")).toBe(
      "sec-1477449-000119312520178123",
    );
  });

  it("filingContainsItem201 detects acquisition item (success)", () => {
    const text =
      "Item 2.01 Completion of Acquisition or Disposition of Assets. On January 1, 2024 the Company completed the acquisition.";
    expect(filingContainsItem201(text)).toBe(true);
  });

  it("extractItem201Section captures section text (success)", () => {
    const text = `
      Item 1.01 Entry into Material Agreement.
      Item 2.01 Completion of Acquisition or Disposition of Assets.
      The Company acquired Example Target Inc. for $50 million in cash.
      Item 2.02 Results of Operations.
    `;
    const section = extractItem201Section(text);
    expect(section).toBeDefined();
    expect(section).toContain("Example Target");
    expect(section).not.toContain("Item 2.02");
  });

  it("parseItem201 extracts target and value when present (success)", () => {
    const text = `
      Item 2.01 Completion of Acquisition or Disposition of Assets.
      On March 15, 2024 the Company consummated the merger pursuant to the Merger Agreement
      and acquired all outstanding shares of FemHealth Labs, a women's fertility platform,
      for aggregate consideration of $125 million in cash.
      Item 2.02 Results of Operations.
    `;
    const parsed = parseItem201({
      text,
      accession: "0001193125-24-000001",
      filingUrl: "https://www.sec.gov/example",
      filingDate: "2024-03-16",
      acquirerName: "Acquirer Inc",
      acquirerTicker: "ACQ",
      acquirerCik: "1234567",
      sicCode: "2834",
    });

    expect(parsed).toBeDefined();
    expect(parsed?.parseQuality).toBe("full");
    expect(parsed?.dealValueMillions).toBe(125);
    expect(parsed?.dealStructure).toBe("Merger");
    expect(parsed?.targetName).toBeTruthy();
  });

  it("parseItem201 returns undefined when Item 2.01 absent (edge)", () => {
    const parsed = parseItem201({
      text: "Item 7.01 Regulation FD Disclosure only.",
      accession: "0001",
      filingUrl: "https://example.com",
      filingDate: "2024-01-01",
      acquirerName: "Co",
      acquirerCik: "1",
    });
    expect(parsed).toBeUndefined();
  });
});

describe("secEdgarConnector fetch (mocked)", () => {
  it("fetchSubmissions parses SIC from JSON (success)", async () => {
    vi.stubEnv("SEC_EDGAR_USER_AGENT", "Lacuna Test test@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "Test Pharma Inc",
            cik: "0000123456",
            sic: "2834",
            sicDescription: "Pharmaceutical Preparations",
            filings: {
              recent: {
                accessionNumber: [],
                filingDate: [],
                form: [],
                primaryDocument: [],
                primaryDocDescription: [],
              },
            },
          }),
      }),
    );

    const { fetchSubmissions } = await import(
      "@/lib/ingestion/secEdgarConnector"
    );
    const meta = await fetchSubmissions(123456);
    expect(meta.sic).toBe("2834");
    expect(meta.name).toBe("Test Pharma Inc");
  });
});
