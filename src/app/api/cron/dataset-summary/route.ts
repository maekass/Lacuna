import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { buildDatasetSummary } from "@/lib/data/buildDatasetSummary";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { isCronAuthorized } from "@/lib/infra/cronAuth";
import { loadSummaryPipelines } from "@/lib/ingestion/loadSummaryPipelines";
import { reportError } from "@/lib/observability/reportError";

export const maxDuration = 300;

/** Daily cache refresh + summary snapshot for monitoring (pairs with SEC ingest cron). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("verified-dataset", "max");

    const dataset = await getVerifiedDataset();
    const pipelines = await loadSummaryPipelines();
    const summary = buildDatasetSummary(dataset, pipelines);

    return NextResponse.json({
      ok: true,
      revalidated: true,
      summary,
    });
  } catch (error) {
    // Cron schedulers retry on non-2xx — a swallowed failure looks like success.
    const message = reportError("api.cron.datasetSummary", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
