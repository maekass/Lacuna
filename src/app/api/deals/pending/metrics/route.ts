import process from "node:process";
import { NextResponse } from "next/server";
import { buildPendingQueueMetrics } from "@/lib/ingestion/pendingQueueMetrics";

/** Public aggregate staging queue metrics (counts only — no candidate PII). */
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

  try {
    const metrics = await buildPendingQueueMetrics();
    return NextResponse.json(metrics, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to load pending queue metrics";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
