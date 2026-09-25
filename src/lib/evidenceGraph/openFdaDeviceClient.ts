const OPENFDA_BASE = "https://api.fda.gov/device";

export type OpenFdaDeviceEndpoint =
  | "510k"
  | "pma"
  | "event"
  | "recall"
  | "udi"
  | "classification";

export interface OpenFdaDeviceQuery {
  search?: string;
  count?: string;
  limit?: number;
  skip?: number;
}

export interface OpenFdaDeviceSnapshot {
  endpoint: OpenFdaDeviceEndpoint;
  url: string;
  fetchedAt: string;
  data: unknown;
}

const endpointPath: Record<OpenFdaDeviceEndpoint, string> = {
  "510k": "510k",
  pma: "pma",
  event: "event",
  recall: "recall",
  udi: "udi",
  classification: "classification",
};

function validatedLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("openFDA limit must be an integer from 1 to 1000");
  }
  return limit;
}

function validatedSkip(skip: number | undefined): number | undefined {
  if (skip === undefined) return undefined;
  if (!Number.isInteger(skip) || skip < 0) {
    throw new Error("openFDA skip must be a non-negative integer");
  }
  return skip;
}

/** Build an openFDA device URL without interpolating unescaped query text. */
export function buildOpenFdaDeviceUrl(
  endpoint: OpenFdaDeviceEndpoint,
  query: OpenFdaDeviceQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.count?.trim()) params.set("count", query.count.trim());

  const limit = validatedLimit(query.limit);
  if (limit !== undefined) params.set("limit", String(limit));

  const skip = validatedSkip(query.skip);
  if (skip !== undefined) params.set("skip", String(skip));

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `${OPENFDA_BASE}/${endpointPath[endpoint]}.json${suffix}`;
}

/**
 * Fetch a raw openFDA device snapshot for later source-specific normalization.
 *
 * This function intentionally does not convert API records directly into
 * EvidenceObservation values. A normalizer must preserve endpoint-specific
 * identifiers, semantics, and limitations before promotion to the graph.
 */
export async function fetchOpenFdaDeviceSnapshot(
  endpoint: OpenFdaDeviceEndpoint,
  query: OpenFdaDeviceQuery = {},
): Promise<OpenFdaDeviceSnapshot> {
  const url = buildOpenFdaDeviceUrl(endpoint, query);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `openFDA ${endpoint} request failed with HTTP ${response.status}`,
    );
  }

  return {
    endpoint,
    url,
    fetchedAt: new Date().toISOString(),
    data: await response.json(),
  };
}
