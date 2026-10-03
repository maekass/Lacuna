import process from "node:process";

const OPENALEX_API_BASE = "https://api.openalex.org";

export interface OpenAlexQueryOptions {
  search?: string;
  exact?: string;
  semantic?: string;
  filter?: string;
  sort?: string;
  select?: string;
  perPage?: number;
  page?: number;
  cursor?: string;
}

export interface OpenAlexResponse<T = unknown> {
  meta?: Record<string, unknown>;
  results?: T[];
  group_by?: unknown[];
}

export interface OpenAlexRequestOptions {
  signal?: AbortSignal;
}

function apiKey(): string {
  const key = process.env.OPENALEX_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENALEX_API_KEY is required for OpenAlex provider requests. " +
        "Add it to .env.local (never commit the key).",
    );
  }
  return key;
}

function buildUrl(
  path: string,
  params: Record<string, string | undefined>,
): URL {
  const url = new URL(path, OPENALEX_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  return url;
}

async function request<T>(url: URL, init?: RequestInit): Promise<T> {
  const key = apiKey();
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + key,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.text()).replaceAll(
      key,
      "[REDACTED_OPENALEX_API_KEY]",
    );
    throw new Error(
      "OpenAlex request failed: HTTP " + response.status + " " +
        response.statusText + (body ? " — " + body.slice(0, 500) : ""),
    );
  }

  return await response.json() as T;
}

export async function searchOpenAlexWorks(
  options: OpenAlexQueryOptions,
  requestOptions?: OpenAlexRequestOptions,
): Promise<OpenAlexResponse> {
  const searchModes = [options.search, options.exact, options.semantic]
    .filter(Boolean).length;
  if (searchModes > 1) {
    throw new Error("OpenAlex accepts only one of search, exact, or semantic.");
  }
  const url = buildUrl("/works", {
    search: options.search,
    "search.exact": options.exact,
    "search.semantic": options.semantic,
    filter: options.filter,
    sort: options.sort,
    select: options.select,
    "per-page": options.perPage?.toString(),
    page: options.page?.toString(),
    cursor: options.cursor,
  });
  return await request<OpenAlexResponse>(url, {
    signal: requestOptions?.signal,
  });
}

export async function getOpenAlexWork(
  id: string,
  requestOptions?: OpenAlexRequestOptions,
): Promise<unknown> {
  const normalized = id.trim();
  if (!normalized) throw new Error("OpenAlex work ID is required.");
  const path = normalized.startsWith("http")
    ? normalized
    : "/works/" +
      encodeURIComponent(normalized.replace(/^https?:\/\/openalex.org\//, ""));
  return await request<unknown>(new URL(path, OPENALEX_API_BASE), {
    signal: requestOptions?.signal,
  });
}

export async function executeOpenAlexOql(
  oql: string,
  options?: Pick<
    OpenAlexQueryOptions,
    "sort" | "select" | "perPage" | "page" | "cursor"
  >,
  requestOptions?: OpenAlexRequestOptions,
): Promise<OpenAlexResponse> {
  const query = oql.trim();
  if (!query) throw new Error("OpenAlex OQL query is required.");
  const url = buildUrl("/", {
    oql: query,
    sort: options?.sort,
    select: options?.select,
    "per-page": options?.perPage?.toString(),
    page: options?.page?.toString(),
    cursor: options?.cursor,
  });
  return await request<OpenAlexResponse>(url, {
    signal: requestOptions?.signal,
  });
}

export async function validateOpenAlexOql(
  oql: string,
  requestOptions?: OpenAlexRequestOptions,
): Promise<unknown> {
  const query = oql.trim();
  if (!query) throw new Error("OpenAlex OQL query is required.");
  return await request<unknown>(
    buildUrl("/validate", { q: query }),
    { signal: requestOptions?.signal },
  );
}

export async function getOpenAlexRateLimit(
  requestOptions?: OpenAlexRequestOptions,
): Promise<unknown> {
  return await request<unknown>(
    buildUrl("/rate-limit", {}),
    { signal: requestOptions?.signal },
  );
}
