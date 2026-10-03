import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executeOpenAlexOql,
  getOpenAlexRateLimit,
  getOpenAlexWork,
  searchOpenAlexWorks,
  validateOpenAlexOql,
} from "./openAlexClient";

const originalKey = process.env.OPENALEX_API_KEY;

const response = (body: unknown, status = 200, statusText = "OK") =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

const lastUrl = (mock: ReturnType<typeof vi.spyOn>) => {
  const call = mock.mock.calls.at(-1);
  if (!call) throw new Error("Expected fetch to be called.");
  return new URL(String(call[0]));
};

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.OPENALEX_API_KEY;
  else process.env.OPENALEX_API_KEY = originalKey;
});

describe("OpenAlex client integrity contract", () => {
  it("fails closed without a key and does not call the network", async () => {
    delete process.env.OPENALEX_API_KEY;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(searchOpenAlexWorks({ search: "endometriosis" }))
      .rejects.toThrow("OPENALEX_API_KEY is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("constructs the authenticated request exactly and never puts the key in the URL", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ meta: { count: 1 }, results: [] }),
    );
    await searchOpenAlexWorks({
      search: "endometriosis",
      filter: "publication_year:2025",
      sort: "cited_by_count:desc",
      select: "id,title",
      perPage: 10,
      page: 2,
      cursor: "cursor-2",
    });
    const url = lastUrl(fetchMock);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(url.origin).toBe("https://api.openalex.org");
    expect(url.pathname).toBe("/works");
    expect(url.searchParams.get("search")).toBe("endometriosis");
    expect(url.searchParams.get("filter")).toBe("publication_year:2025");
    expect(url.searchParams.get("per-page")).toBe("10");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("cursor")).toBe("cursor-2");
    expect(url.searchParams.has("api_key")).toBe(false);
    expect(headers.get("authorization")).toBe("Bearer test-secret");
    expect(String(url)).not.toContain("test-secret");
  });

  it("preserves real response data and cursor metadata without synthesizing records", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const payload = {
      meta: { count: 2, page: 1, per_page: 2, next_cursor: "next" },
      results: [
        { id: "https://openalex.org/W1", title: "A", publication_year: 2025 },
        { id: "https://openalex.org/W2", title: "B", publication_year: 2024 },
      ],
      group_by: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(payload));
    const result = await searchOpenAlexWorks({ search: "reproductive health" });
    expect(result).toEqual(payload);
    expect(result.results).toHaveLength(2);
    expect(result.meta?.next_cursor).toBe("next");
  });

  it("rejects ambiguous modes before any network request", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(searchOpenAlexWorks({ search: "a", exact: "b" }))
      .rejects.toThrow("only one of search, exact, or semantic");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([[401, "Unauthorized"], [403, "Forbidden"], [429, "Too Many Requests"], [500, "Internal Server Error"]])
    ("fails explicitly on HTTP %s and redacts the API key", async (status, statusText) => {
      process.env.OPENALEX_API_KEY = "test-secret";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("upstream failure: test-secret", { status, statusText }),
      );
      await expect(searchOpenAlexWorks({ search: "endometriosis" }))
        .rejects.toThrow(/OpenAlex request failed: HTTP/);
      await expect(searchOpenAlexWorks({ search: "endometriosis" }))
        .rejects.not.toThrow("test-secret");
    });

  it("fails on malformed JSON rather than returning false success", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{not-json", { status: 200 }),
    );
    await expect(searchOpenAlexWorks({ search: "endometriosis" })).rejects.toThrow();
  });

  it("propagates abort signals", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ meta: { count: 0 }, results: [] }),
    );
    const controller = new AbortController();
    await searchOpenAlexWorks(
      { search: "endometriosis" },
      { signal: controller.signal },
    );
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("normalizes singleton IDs to the canonical works endpoint", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ id: "https://openalex.org/W123", title: "A" }),
    );
    expect(await getOpenAlexWork("https://openalex.org/W123")).toEqual({
      id: "https://openalex.org/W123",
      title: "A",
    });
    const url = lastUrl(fetchMock);
    expect(url.pathname).toBe("/works/W123");
    expect(url.search).toBe("");
  });

  it("routes OQL to the API root with independent view parameters", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ meta: { count: 2 }, results: [] }),
    );
    await executeOpenAlexOql("works where year is (2025)", {
      perPage: 5,
      sort: "cited_by_count:desc",
      select: "id,title",
      cursor: "*",
    });
    const url = lastUrl(fetchMock);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("oql")).toBe("works where year is (2025)");
    expect(url.searchParams.get("per-page")).toBe("5");
    expect(url.searchParams.get("sort")).toBe("cited_by_count:desc");
    expect(url.searchParams.get("cursor")).toBe("*");
  });

  it("covers validation and rate-limit endpoints", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ valid: true }),
    );
    await validateOpenAlexOql("works where year is (2025)");
    await getOpenAlexRateLimit();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/validate");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/rate-limit");
  });

  it("rejects empty inputs without network access", async () => {
    process.env.OPENALEX_API_KEY = "test-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(validateOpenAlexOql(" ")).rejects.toThrow("OQL query is required");
    await expect(getOpenAlexWork(" ")).rejects.toThrow("work ID is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
