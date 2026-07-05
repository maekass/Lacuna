import process from "node:process";
import { NextResponse } from "next/server";
import { buildSecIngestStatusPayload } from "@/lib/ingestion/buildSecIngestStatus";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const payload = await buildSecIngestStatusPayload();
    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to load SEC ingest status";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
