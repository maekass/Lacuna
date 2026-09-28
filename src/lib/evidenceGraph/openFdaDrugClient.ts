const OPENFDA_DRUG_BASE = "https://api.fda.gov/drug";

export type OpenFdaDrugEndpoint = "drugsfda" | "label";

export interface OpenFdaDrugQuery {
  search?: string;
  count?: string;
  limit?: number;
  skip?: number;
}

export interface OpenFdaDrugSnapshot {
  endpoint: OpenFdaDrugEndpoint;
  url: string;
  fetchedAt: string;
  data: unknown;
}

const endpointPath: Record<OpenFdaDrugEndpoint, string> = {
  drugsfda: "drugsfda",
  label: "label",
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

/** Build an openFDA drug URL without interpolating unescaped query text. */
export function buildOpenFdaDrugUrl(
  endpoint: OpenFdaDrugEndpoint,
  query: OpenFdaDrugQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.count?.trim()) params.set("count", query.count.trim());

  const limit = validatedLimit(query.limit);
  if (limit !== undefined) params.set("limit", String(limit));

  const skip = validatedSkip(query.skip);
  if (skip !== undefined) params.set("skip", String(skip));

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `${OPENFDA_DRUG_BASE}/${endpointPath[endpoint]}.json${suffix}`;
}

/**
 * Fetch a raw openFDA drug snapshot for later source-specific normalization.
 *
 * This function does not treat the API payload as historically knowable.
 * `submission_status_date` is an event date. The snapshot's publication date
 * is unknown unless a normalizer finds a separate document date.
 */
export async function fetchOpenFdaDrugSnapshot(
  endpoint: OpenFdaDrugEndpoint,
  query: OpenFdaDrugQuery = {},
): Promise<OpenFdaDrugSnapshot> {
  const url = buildOpenFdaDrugUrl(endpoint, query);
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
