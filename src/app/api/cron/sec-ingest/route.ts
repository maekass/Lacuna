import process from "node:process";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/infra/cronAuth";
import { runHandsOffPipeline } from "@/lib/ingestion/runHandsOffPipeline";
import { runSecIngest } from "@/lib/ingestion/secIngestPipeline";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    return NextResponse.json(
      { error: "SEC_EDGAR_USER_AGENT is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await runSecIngest();
    const handsOff = await runHandsOffPipeline();

    return NextResponse.json({
      ok: true,
      scannedTickers: result.scannedTickers,
      parsed: result.parsedFilings.length,
      womensHealthCandidates: result.classified.filter((c) =>
        c.womensHealthRelevant
      ).length,
      sync: result.sync,
      runId: result.runId ?? null,
      sinceDateUsed: result.sinceDateUsed ?? null,
      handsOff,
    });
  } catch (error) {
    console.error("cron/sec-ingest:", error);
    const message = "SEC ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
