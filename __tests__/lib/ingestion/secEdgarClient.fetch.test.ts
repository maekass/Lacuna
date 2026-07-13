import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LIVE_FETCH_FORBIDDEN =
  "secEdgarClient tests must mock fetch — live SEC calls are forbidden";

function stubBlockedFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error(LIVE_FETCH_FORBIDDEN))),
  );
}

describe("secEdgarClient (mocked fetch)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEC_EDGAR_USER_AGENT", "Lacuna Research test@example.com");
    stubBlockedFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loadSecTickerMap resolves tickers from SEC JSON (success)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            "0": {
              cik_str: 1477449,
              ticker: "TDOC",
              title: "Teladoc Health Inc",
            },
          }),
      }),
    );

    const {
      loadSecTickerMap,
      resolveTicker,
      resetSecEdgarTickerCacheForTests,
    } = await import("@/lib/ingestion/secEdgarClient");
    resetSecEdgarTickerCacheForTests();

    const map = await loadSecTickerMap();
    expect(map.size).toBe(1);
    expect(fetch).toHaveBeenCalled();

    const entry = await resolveTicker("tdoc");
    expect(entry?.cik).toBe(1477449);
    expect(entry?.ticker).toBe("TDOC");
  });

  it("resolveTicker returns undefined for unknown ticker (edge)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const { resolveTicker, resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();

    expect(await resolveTicker("ZZZZ")).toBeUndefined();
    expect(fetch).toHaveBeenCalled();
  });

  it("resolveTicker uses built-in CIK override when ticker JSON omits symbol (success)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const { resolveTicker, resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();

    const holx = await resolveTicker("HOLX");
    expect(holx?.cik).toBe(859737);
    expect(holx?.ticker).toBe("HOLX");

    const exas = await resolveTicker("EXAS");
    expect(exas?.cik).toBe(1124140);
  });

  it("resolveTicker honors SEC_TICKER_CIK_OVERRIDES env (success)", async () => {
    vi.stubEnv("SEC_TICKER_CIK_OVERRIDES", "CUSTOM:999");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const { resolveTicker, resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();

    const entry = await resolveTicker("CUSTOM");
    expect(entry?.cik).toBe(999);
  });

  it("throws when SEC_EDGAR_USER_AGENT is missing (error)", async () => {
    vi.unstubAllEnvs();
    delete process.env.SEC_EDGAR_USER_AGENT;
    delete process.env.SEC_TICKER_CIK_OVERRIDES;
    vi.stubGlobal("fetch", vi.fn());

    const { loadSecTickerMap, resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();

    await expect(loadSecTickerMap()).rejects.toThrow(/SEC_EDGAR_USER_AGENT/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetchRecentFilings filters by keyword and sinceDate (success)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "Teladoc Health Inc",
            cik: "0001477449",
            filings: {
              recent: {
                accessionNumber: [
                  "0001193125-20-178123",
                  "0001193125-20-100000",
                ],
                filingDate: ["2020-07-01", "2020-06-01"],
                form: ["8-K", "8-K"],
                primaryDocument: ["d8k.htm", "other.htm"],
                primaryDocDescription: [
                  "Entry into Material Definitive Agreement - Merger",
                  "Results of Operations",
                ],
              },
            },
          }),
      }),
    );

    const { fetchRecentFilings } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    const hits = await fetchRecentFilings(1477449, {
      sinceDate: "2020-06-15",
      limit: 10,
    });

    expect(hits).toHaveLength(1);
    expect(hits[0].matchedKeywords).toContain("merger");
    expect(hits[0].filingUrl).toContain("1477449");
    expect(fetch).toHaveBeenCalled();
  });

  it("fetchRecentFilings throws on HTTP error (error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    const { fetchRecentFilings } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    await expect(fetchRecentFilings(1477449)).rejects.toThrow(
      /submissions failed/,
    );
    expect(fetch).toHaveBeenCalled();
  });

  it("scanAcquisitionFilings skips unknown tickers (edge)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const { scanAcquisitionFilings, resetSecEdgarTickerCacheForTests } =
      await import("@/lib/ingestion/secEdgarClient");
    resetSecEdgarTickerCacheForTests();

    const hits = await scanAcquisitionFilings(["UNKNOWN"], {
      limitPerTicker: 1,
    });
    expect(hits).toEqual([]);
    expect(fetch).toHaveBeenCalled();
  });

  it("rejects accidental live fetch when mock is not applied", async () => {
    const { loadSecTickerMap, resetSecEdgarTickerCacheForTests } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    resetSecEdgarTickerCacheForTests();

    await expect(loadSecTickerMap()).rejects.toThrow(LIVE_FETCH_FORBIDDEN);
  });
});
