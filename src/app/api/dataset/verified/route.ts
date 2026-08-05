import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { parsePageParams } from "@/lib/api/pageParams";
import {
  getVerifiedDataset,
  getVerifiedDatasetPage,
} from "@/lib/data/datasetProvider";
import type { DatasetResource } from "@/lib/data/sliceVerifiedDataset";

const VALID_RESOURCES = new Set<DatasetResource>([
  "companies",
  "acquisitions",
  "acquirers",
  "all",
]);

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "verifiedDataset",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const { limit: pageLimit, offset } = parsePageParams(url.searchParams);
  const resourceParam = url.searchParams.get("resource") ?? "all";
  const resource = VALID_RESOURCES.has(resourceParam as DatasetResource)
    ? (resourceParam as DatasetResource)
    : "all";
  const sector = url.searchParams.get("sector") ?? undefined;
  const genomics = url.searchParams.get("genomics") === "true";
  const paginate = url.searchParams.has("limit") ||
    url.searchParams.has("offset") ||
    url.searchParams.has("resource") ||
    Boolean(sector) ||
    genomics;

  if (paginate) {
    const page = await getVerifiedDatasetPage({
      resource,
      limit: pageLimit,
      offset,
      sector,
      genomics,
    });
    return NextResponse.json(page, {
      headers: {
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  const dataset = await getVerifiedDataset();
  return NextResponse.json(dataset, {
    headers: {
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
