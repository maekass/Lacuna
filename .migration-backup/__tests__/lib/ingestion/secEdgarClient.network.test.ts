import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("secEdgarClient (mocked fetch)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEC_EDGAR_USER_AGENT", "Lacuna Research test@example.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

    const { loadSecTickerMap, resolveTicker } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    const map = await loadSecTickerMap();
    expect(map.size).toBe(1);

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

    const { resolveTicker } = await import("@/lib/ingestion/secEdgarClient");
    expect(await resolveTicker("ZZZZ")).toBeUndefined();
  });

  it("throws when SEC_EDGAR_USER_AGENT is missing (error)", async () => {
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", vi.fn());

    const { loadSecTickerMap } = await import("@/lib/ingestion/secEdgarClient");
    await expect(loadSecTickerMap()).rejects.toThrow(/SEC_EDGAR_USER_AGENT/);
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
  });

  it("scanAcquisitionFilings skips unknown tickers (edge)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const { scanAcquisitionFilings } = await import(
      "@/lib/ingestion/secEdgarClient"
    );
    const hits = await scanAcquisitionFilings(["UNKNOWN"], {
      limitPerTicker: 1,
    });
    expect(hits).toEqual([]);
  });
});
