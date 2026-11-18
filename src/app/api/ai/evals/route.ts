import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import {
  listOnlineTraces,
  spotCheckTrace,
  summarizeOnlineTraces,
} from "@/lib/ai/evals/onlineEvalStore";
import { isServerInferenceConfigured } from "@/lib/ai/inference";

/** GET — online traces for this server process. */
export function GET() {
  return NextResponse.json({
    inferenceConfigured: isServerInferenceConfigured(),
    logPathConfigured: Boolean(process.env.LACUNA_EVAL_LOG?.trim()),
    summary: summarizeOnlineTraces(),
    traces: listOnlineTraces(),
  });
}

/** POST — human spot-check of one in-process trace. */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, {
    key: "aiEvals",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const record = body as { id?: unknown; verdict?: unknown; note?: unknown };
  const id = typeof record.id === "string" ? record.id : "";
  const verdict = record.verdict === "pass" || record.verdict === "fail"
    ? record.verdict
    : null;
  const note = typeof record.note === "string" ? record.note : "";
  if (!id || !verdict) {
    return NextResponse.json(
      { error: "id and verdict (pass or fail) are required" },
      { status: 400 },
    );
  }

  const updated = spotCheckTrace(id, verdict, note);
  if (!updated) {
    return NextResponse.json(
      { error: "Trace not found in this server process" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    trace: updated,
    summary: summarizeOnlineTraces(),
  });
}
