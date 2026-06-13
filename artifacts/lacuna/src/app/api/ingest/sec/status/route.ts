import process from "node:process";
import { NextResponse } from "next/server";
import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";

/** Latest SEC EDGAR ingest run (Postgres). Alias of `/api/cron/sec-ingest/status`. */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL is not configured",
        docs: "/docs/SEC_INGESTION.md",
      },
      { status: 503 },
    );
  }

  const latest = await getLatestIngestRun();
  return NextResponse.json({
    ok: true,
    latest,
    cronPath: "/api/cron/sec-ingest",
    cli: "npm run sec:ingest",
  });
}
