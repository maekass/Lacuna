import { NextResponse } from "next/server";

/**
 * VCF ingest is not supported in serverless — use the standalone ingest worker.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "VCF ingest is not available on this deployment",
      hint:
        "Run the standalone ingest worker with ClickHouse and object storage configured.",
      docs: "docs/INGEST_WORKER.md",
      worker: "services/ingest-worker",
    },
    {
      status: 501,
      headers: { "cache-control": "no-store" },
    },
  );
}
