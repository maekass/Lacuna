import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import {
  extractSourceQuote,
  hasAdjacentTargetMatch,
  normalizeCompanyName,
  runSourceBackfill,
  sourceBackfillCoverageText,
  summarizeSourceBackfill,
} from "@/lib/ingestion/sourceBackfill";

describe("source backfill acceptance helpers", () => {
  it("normalizes punctuation, whitespace, and corporate suffixes", () => {
    expect(normalizeCompanyName("Example, Inc.")).toBe("example");
    expect(normalizeCompanyName("Example LLC")).toBe("example");
    expect(normalizeCompanyName("Example S.A.")).toBe("example");
  });

  it("keeps adjacent target words and rejects fuzzy partial matching", () => {
    expect(normalizeCompanyName("Modern Fertility")).toBe("modern fertility");
    expect(
      hasAdjacentTargetMatch(
        "The filing describes Modern Fertility and its acquisition.",
        "Modern Fertility",
      ),
    ).toBe(true);
    expect(
      hasAdjacentTargetMatch(
        "The filing describes Modern Fertilitycare services.",
        "Modern Fertility",
      ),
    ).toBe(false);
    const quote = extractSourceQuote(
      "The filing describes Modern Fertility and its acquisition.",
      "Modern Fertility",
    );
    expect(quote).toBeDefined();
    expect(normalizeCompanyName(quote ?? "")).toContain("modern fertility");
  });

  it("counts accepted, rejected reasons, and transport errors separately", () => {
    const report = {
      generatedAt: "deterministic-from-cache",
      source: "SEC EDGAR full-text search" as const,
      records: [
        {
          dealId: "a",
          status: "accepted" as const,
          reason: null,
          ref: {
            kind: "sec_filing" as const,
            url: "https://example.test",
            accession: "0000000-00-000000",
            form: "8-K",
            filedAt: "2020-01-01",
            filerCik: "0000000000",
            publisher: "SEC EDGAR" as const,
            retrievedAt: "2026-01-01T00:00:00.000Z",
            quote: "Example acquisition",
            dateUnverified: false,
          },
          otherAcceptedCandidates: 0,
        },
        {
          dealId: "b",
          status: "rejected" as const,
          reason: "target_name_not_matched" as const,
          ref: null,
          otherAcceptedCandidates: 0 as const,
        },
        {
          dealId: "c",
          status: "error" as const,
          reason: null,
          ref: null,
          otherAcceptedCandidates: 0 as const,
          errorCode: "transport_error" as const,
          error: "network",
        },
      ],
    };
    const coverage = summarizeSourceBackfill(report);
    expect(coverage.accepted).toBe(1);
    expect(coverage.rejected).toBe(1);
    expect(coverage.errors).toBe(1);
    expect(coverage.transportErrors).toBe(1);
    expect(coverage.oversizedDocuments).toBe(0);
    expect(coverage.byReason.target_name_not_matched).toBe(1);
    expect(sourceBackfillCoverageText(coverage)).toContain(
      "Accepted: 1 / 3",
    );
  });

  it("round-trips an accepted record and is byte-stable over a fixed cache", async () => {
    const cacheDir = join(
      "/home/ubuntu",
      `source-backfill-test-${process.pid}`,
    );
    rmSync(cacheDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });
    const tickerUrl = "https://www.sec.gov/files/company_tickers.json";
    const searchUrl = (() => {
      const params = new URLSearchParams({
        q: '"Example Target"',
        dateRange: "custom",
        startdt: "2001-01-01",
        enddt: "2099-12-31",
        ciks: "0000000001",
        from: "0",
        size: "100",
      });
      return `https://efts.sec.gov/LATEST/search-index?${params.toString()}`;
    })();
    const fullTextUrl =
      "https://www.sec.gov/Archives/edgar/data/1/000000000100000001/example-8k.htm";
    function cache(url: string, body: string): void {
      const key = createHash("sha256").update(url).digest("hex");
      writeFileSync(
        join(cacheDir, `${key}.json`),
        `${
          JSON.stringify(
            {
              url,
              status: 200,
              headers: { "content-type": "application/json" },
              body,
              retrievedAt: "2026-08-15T00:00:00.000Z",
            },
            null,
            2,
          )
        }\n`,
      );
    }
    cache(
      tickerUrl,
      JSON.stringify({
        "0": { cik_str: 1, ticker: "EXMP", title: "Example Acquirer" },
      }),
    );
    cache(
      searchUrl,
      JSON.stringify({
        hits: {
          total: { value: 1 },
          hits: [{
            _id: "0000000001-00-000001:example-8k.htm",
            _source: {
              ciks: ["0000000001"],
              adsh: "0000000001-00-000001",
              form: "8-K",
              file_date: "2021-06-01",
            },
          }],
        },
      }),
    );
    cache(
      fullTextUrl,
      "<html><body>The company completed its acquisition of Example Target on June 1.</body></html>",
    );
    const dataset = parseVerifiedDataset({
      provenance: {
        lastUpdated: "2026-01-01",
        sources: [],
        notes: [],
        purpose: "test",
        disclaimer: "test",
      },
      companies: [],
      acquirers: [{
        id: "a1",
        name: "Example Acquirer",
        ticker: "EXMP",
        hq: "Test",
      }],
      acquisitions: [{
        id: "deal1",
        targetId: "target1",
        acquirerId: "a1",
        targetName: "Example Target",
        acquirerName: "Example Acquirer",
        announcedDate: "2021-05-20",
        dealType: "Acquisition",
        source: "test",
        strategicRationale: "test",
      }],
    });
    const first = await runSourceBackfill(dataset, {
      cacheDir,
      userAgent: "Lacuna Source Backfill mps5cy@virginia.edu",
      offline: true,
    });
    const second = await runSourceBackfill(dataset, {
      cacheDir,
      userAgent: "Lacuna Source Backfill mps5cy@virginia.edu",
      offline: true,
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const record = first.records[0];
    expect(record?.status).toBe("accepted");
    if (record?.status === "accepted") {
      expect(record.ref.url).toContain("sec.gov/Archives");
      expect(record.ref.accession).toBe("0000000001-00-000001");
      expect(record.ref.form).toBe("8-K");
      expect(record.ref.filedAt).toBe("2021-06-01");
      expect(record.ref.publisher).toBe("SEC EDGAR");
      expect(record.ref.retrievedAt).toBe("2026-08-15T00:00:00.000Z");
      expect(record.ref.quote.length).toBeLessThanOrEqual(300);
    }
    const cachedOutput = readFileSync(
      join(
        cacheDir,
        `${createHash("sha256").update(tickerUrl).digest("hex")}.json`,
      ),
      "utf8",
    );
    expect(cachedOutput).toContain("retrievedAt");
    rmSync(cacheDir, { recursive: true, force: true });
  });
});
