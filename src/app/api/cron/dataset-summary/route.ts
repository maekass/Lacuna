import process from "node:process";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { buildDatasetSummary } from "@/lib/data/buildDatasetSummary";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { isCronAuthorized } from "@/lib/infra/cronAuth";
import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";

export const maxDuration = 300;

/** Daily cache refresh + summary snapshot for monitoring (pairs with SEC ingest cron). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("verified-dataset", "max");

  const dataset = await getVerifiedDataset();

  let pipelines = {
    secIngestLastRunAt: null as string | null,
    secIngestStatus: null as "running" | "success" | "failed" | null,
  };

  if (process.env.DATABASE_URL?.trim()) {
    const latest = await getLatestIngestRun();
    if (latest) {
      pipelines = {
        secIngestLastRunAt: latest.ended_at ?? latest.started_at,
        secIngestStatus: latest.status,
      };
    }
  }

  const summary = buildDatasetSummary(dataset, pipelines);

  return NextResponse.json({
    ok: true,
    revalidated: true,
    summary,
  });
}
