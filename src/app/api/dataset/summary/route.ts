import { NextResponse } from "next/server";
import { buildDatasetSummary } from "@/lib/data/buildDatasetSummary";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { loadSummaryPipelines } from "@/lib/ingestion/loadSummaryPipelines";
import { reportError } from "@/lib/observability/reportError";

/** Live headline stats and disclosure metrics from the verified dataset model. */
export async function GET() {
  try {
    const dataset = await getVerifiedDataset();
    const pipelines = await loadSummaryPipelines();
    const summary = buildDatasetSummary(dataset, pipelines);

    return NextResponse.json(summary, {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const message = reportError("api.dataset.summary", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
