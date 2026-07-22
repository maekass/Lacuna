import { describe, expect, it } from "vitest";
import {
  buildSecDealNaturalKey,
  normalizeSecAccession,
  normalizeSecCik,
  normalizeSecFormType,
  shouldSkipFilingOnResume,
} from "@/lib/ingestion/secDealNaturalKey";

describe("secDealNaturalKey", () => {
  it("builds stable natural keys from accession + cik + form type", () => {
    expect(
      buildSecDealNaturalKey("0001193125-24-000001", "1477449", "8-K"),
    ).toBe("0001477449|000119312524000001|8K");
  });

  it("normalizes form variants consistently", () => {
    expect(normalizeSecFormType("8-K/A")).toBe("8KA");
    expect(normalizeSecAccession("0001193125-24-000001")).toBe(
      "000119312524000001",
    );
    expect(normalizeSecCik("1477449")).toBe("0001477449");
  });

  it("skips filings newer than checkpoint when resuming newest-first", () => {
    const checkpoint = {
      filingDate: "2024-03-16",
      naturalKey: "0001477449|000110465924012345|8K",
    };
    expect(
      shouldSkipFilingOnResume(
        "2024-04-01",
        "0001477449|000999|8K",
        checkpoint,
      ),
    ).toBe(true);
    expect(
      shouldSkipFilingOnResume(
        "2024-03-16",
        "0001477449|000110465924012345|8K",
        checkpoint,
      ),
    ).toBe(false);
    expect(
      shouldSkipFilingOnResume(
        "2024-03-01",
        "0001477449|000110465924012345|8K",
        checkpoint,
      ),
    ).toBe(false);
  });
});
