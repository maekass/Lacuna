import { afterEach, beforeEach, vi } from "vitest";

const nativeFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (process.env.ALLOW_MSW_HTTP === "1") {
        return nativeFetch(input, init);
      }
      throw new Error(
        "Outbound HTTP is disabled in unit tests; mock fetch explicitly.",
      );
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
