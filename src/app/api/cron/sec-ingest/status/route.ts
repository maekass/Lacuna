import process from "node:process";
import { NextResponse } from "next/server";
import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  const latest = await getLatestIngestRun();
  return NextResponse.json({ ok: true, latest });
}
