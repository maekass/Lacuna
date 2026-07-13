import process from "node:process";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedAcquisition } from "@/lib/ingestion/secEdgarConnector";
import { buildSecDealNaturalKey } from "@/lib/ingestion/secDealNaturalKey";

const mockScan = vi.fn();
const mockSync = vi.fn();
const mockLogIngestComplete = vi.fn();
const mockResolveTicker = vi.fn();

vi.mock("@/lib/ingestion/secEdgarClient", () => ({
  resolveTicker: (...args: unknown[]) => mockResolveTicker(...args),
}));

vi.mock("@/lib/ingestion/secEdgarConnector", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/ingestion/secEdgarConnector")
  >();
  return {
    ...actual,
    scanItem201Acquisitions: (...args: unknown[]) => mockScan(...args),
  };
});

vi.mock("@/lib/ingestion/databaseSync", () => ({
  syncDealsToDatabase: (...args: unknown[]) => mockSync(...args),
}));

vi.mock("@/lib/ingestion/monitoringAlerts", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/ingestion/monitoringAlerts")
  >();
  return {
    ...actual,
    logIngestComplete: (...args: unknown[]) => mockLogIngestComplete(...args),
  };
});

function sampleParsed(
  overrides: Partial<ParsedAcquisition> = {},
): ParsedAcquisition {
  return {
    dealId: "sec-0001193125-24-000001",
    secAccession: "0001193125-24-000001",
    naturalKey: buildSecDealNaturalKey(
      "0001193125-24-000001",
      "1234567",
      "8-K",
    ),
    formType: "8-K",
    acquirerName: "Acquirer Inc",
    acquirerTicker: "ACQ",
    acquirerCik: "1234567",
    targetName: "FemHealth Co",
    announcedDate: "2024-03-16",
    filingUrl: "https://www.sec.gov/example",
    filingDate: "2024-03-16",
    parseQuality: "full",
    filingTextSample: "Acquisition of a fertility platform for women's health.",
    item201Excerpt: "women's health fertility telehealth",
    ...overrides,
  };
}

describe("runSecIngest", () => {
  const datasetPath = join(process.cwd(), "src/data/dataset.verified.json");

  beforeEach(() => {
    vi.resetModules();
    mockScan.mockReset();
    mockSync.mockReset();
    mockLogIngestComplete.mockReset();
    mockResolveTicker.mockReset();

    mockResolveTicker.mockImplementation(async (ticker: string) => {
      const upper = String(ticker).toUpperCase();
      if (upper === "ZZZZ") return undefined;
      return { cik: 1, ticker: upper, title: upper };
    });

    mockScan.mockResolvedValue([sampleParsed()]);
    mockSync.mockResolvedValue({
      inserted: 1,
      updated: 0,
      skipped: 0,
      deduped: 0,
    });

    vi.stubEnv("SEC_EXTRA_TICKERS", "");
    vi.stubEnv("SEC_SCAN_SINCE", "2024-01-01");
    vi.stubEnv("SEC_LIMIT_PER_TICKER", "5");
    vi.stubEnv("SEC_HEALTHCARE_SIC_ONLY", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("LACUNA_INGEST_RUN_TRACKING", "");
    vi.stubEnv("SEC_USE_DB_CURSOR", "");
  });

  it("scans dataset tickers and classifies filings in dry run (success)", async () => {
    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    const result = await runSecIngest({ dryRun: true, datasetPath });

    expect(result.scannedTickers).toBeGreaterThan(0);
    expect(result.parsedFilings).toHaveLength(1);
    expect(result.classified).toHaveLength(1);
    expect(result.classified[0].womensHealthRelevant).toBe(true);
    expect(result.classified[0].classificationConfidence).toBe("high");
    expect(result.sync).toBeNull();
    expect(mockScan).toHaveBeenCalledOnce();
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("merges extraTickers with dataset tickers (edge)", async () => {
    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    const result = await runSecIngest({
      dryRun: true,
      datasetPath,
      extraTickers: ["ZZZZ"],
    });

    const [tickers] = mockScan.mock.calls[0];
    expect(tickers).toContain("ZZZZ");
    expect(tickers.length).toBeGreaterThan(1);
    expect(result.unresolvedTickers).toContain("ZZZZ");
  });

  it("syncs classified deals when DATABASE_URL is set (success)", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    const result = await runSecIngest({ datasetPath });

    expect(mockSync).toHaveBeenCalledOnce();
    expect(result.sync).toEqual({
      inserted: 1,
      updated: 0,
      skipped: 0,
      deduped: 0,
    });
    expect(mockLogIngestComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        scanned: expect.any(Number),
        parsed: 1,
        inserted: 1,
      }),
    );
  });

  it("logs ingest summary without DB sync when DATABASE_URL is missing (edge)", async () => {
    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    await runSecIngest({
      datasetPath,
      dryRun: false,
    });

    expect(mockSync).not.toHaveBeenCalled();
    expect(mockLogIngestComplete).toHaveBeenCalledWith(
      expect.objectContaining({ inserted: 0, updated: 0 }),
    );
  });

  it("marks low-confidence deals as pending_review (edge)", async () => {
    mockScan.mockResolvedValue([
      sampleParsed({
        filingTextSample: "Acquisition of a logistics software company.",
        item201Excerpt: "logistics software company",
        targetName: "LogiSoft",
      }),
    ]);

    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    const result = await runSecIngest({ dryRun: true, datasetPath });

    expect(result.classified[0].womensHealthRelevant).toBe(false);
    expect(result.classified[0].status).toBe("pending_review");
  });

  it("throws when no tickers are available (error)", async () => {
    const { runSecIngest } = await import("@/lib/ingestion/secIngestPipeline");
    await expect(
      runSecIngest({
        dryRun: true,
        datasetPath: join(
          process.cwd(),
          "__tests__/helpers/empty-acquirers.fixture.json",
        ),
      }),
    ).rejects.toThrow(/No tickers to scan/);
  });
});

describe("secIngestPipeline re-exports", () => {
  it("re-exports connector and classification symbols (success)", async () => {
    const pipeline = await import("@/lib/ingestion/secIngestPipeline");
    expect(typeof pipeline.scanItem201Acquisitions).toBe("function");
    expect(typeof pipeline.classifyDeal).toBe("function");
    expect(typeof pipeline.syncDealsToDatabase).toBe("function");
    expect(typeof pipeline.getIngestEvents).toBe("function");
  });
});
