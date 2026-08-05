import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  type LacunaDealsPgMem,
  seedLacunaDealsPgMem,
} from "../../helpers/seedLacunaDealsPgMem";
import type { ClassifiedDeal } from "@/lib/ingestion/databaseSync";

const fixturesDir = join(__dirname, "../../fixtures/edgar");
const tickersJson = readFileSync(
  join(fixturesDir, "company-tickers.json"),
  "utf8",
);
const submissionsJson = readFileSync(
  join(fixturesDir, "submissions-tdoc.json"),
  "utf8",
);
const filingText = readFileSync(
  join(fixturesDir, "filing-8k-item201.txt"),
  "utf8",
);

const server = setupServer(
  http.get(
    "https://www.sec.gov/files/company_tickers.json",
    () =>
      HttpResponse.text(tickersJson, {
        headers: { "Content-Type": "application/json" },
      }),
  ),
  http.get(
    "https://data.sec.gov/submissions/CIK0001477449.json",
    () =>
      HttpResponse.text(submissionsJson, {
        headers: { "Content-Type": "application/json" },
      }),
  ),
  http.get(
    "https://www.sec.gov/Archives/edgar/data/1477449/000110465924012345/tm20240316_8k.htm",
    () =>
      HttpResponse.text(filingText, {
        headers: { "Content-Type": "text/html" },
      }),
  ),
  http.get(
    "https://www.sec.gov/Archives/edgar/data/1477449/000110465924012345/tm20240316_8k.txt",
    () =>
      HttpResponse.text(filingText, {
        headers: { "Content-Type": "text/plain" },
      }),
  ),
);

vi.mock("@/lib/ingestion/monitoringAlerts", () => ({
  alertApiFailure: vi.fn(),
  alertPartialParse: vi.fn(),
  alertNewDeal: vi.fn(),
  logIngestComplete: vi.fn(),
  logRateLimitPause: vi.fn(),
}));

function toClassified(
  parsed: Awaited<
    ReturnType<
      typeof import("@/lib/ingestion/secEdgarConnector")[
        "scanItem201Acquisitions"
      ]
    >
  >[number],
): ClassifiedDeal {
  return {
    ...parsed,
    classificationConfidence: "high",
    classificationKeywords: ["fertility"],
    womensHealthRelevant: true,
    status: "pending",
  };
}

describe("SEC ingest contract (msw fixtures)", () => {
  let seeded: LacunaDealsPgMem;

  beforeAll(async () => {
    vi.doUnmock("pg");
    server.listen({ onUnhandledRequest: "error" });
    seeded = await seedLacunaDealsPgMem();
  });

  afterAll(async () => {
    server.close();
    await seeded.teardown();
  });

  beforeEach(async () => {
    vi.stubEnv("ALLOW_MSW_HTTP", "1");
    vi.unstubAllGlobals();
    vi.stubEnv("SEC_EDGAR_USER_AGENT", "Lacuna Contract Test test@example.com");
    vi.stubEnv("SEC_SCAN_SINCE", "2024-01-01");
    vi.stubEnv("SEC_LIMIT_PER_TICKER", "5");

    const { resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();
    const { resetSecTokenBucketForTests } = await import(
      "@/lib/ingestion/secFairAccess"
    );
    resetSecTokenBucketForTests();

    await seeded.pool.query("DELETE FROM lacuna_deals");
    await seeded.pool.query(
      `UPDATE lacuna_ingest_state
       SET last_processed_accession = NULL,
           last_processed_natural_key = NULL,
           last_processed_filing_date = NULL
       WHERE id = 1`,
    );
  });

  it("duplicate replay keeps pending queue count invariant", async () => {
    const { scanItem201Acquisitions } = await import(
      "@/lib/ingestion/secEdgarConnector"
    );

    const parsed = await scanItem201Acquisitions(["TDOC"], {
      sinceDate: "2024-01-01",
      limitPerTicker: 5,
    });
    expect(parsed.length).toBeGreaterThan(0);

    const classified = parsed.map(toClassified);

    async function reviewableCount(): Promise<number> {
      const result = await seeded.pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM lacuna_deals
         WHERE status IN ('pending', 'pending_review')`,
      );
      return result.rows[0]?.count ?? 0;
    }

    vi.resetModules();
    const { setPoolForTests } = await import("@/lib/data/dbClient");
    setPoolForTests(seeded.pool);
    const { syncDealsToDatabase } = await import(
      "@/lib/ingestion/databaseSync"
    );

    const first = await syncDealsToDatabase(classified);
    expect(first).toEqual({
      inserted: classified.length,
      updated: 0,
      skipped: 0,
      deduped: 0,
    });
    const afterFirst = await reviewableCount();
    expect(afterFirst).toBe(classified.length);

    const totalRows = await seeded.pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM lacuna_deals",
    );
    expect(totalRows.rows[0]?.count).toBe(classified.length);

    const second = await syncDealsToDatabase(classified);
    const afterSecond = await reviewableCount();
    expect(afterSecond).toBe(afterFirst);

    const totalAfterReplay = await seeded.pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM lacuna_deals",
    );
    expect(totalAfterReplay.rows[0]?.count).toBe(classified.length);
  });
});
