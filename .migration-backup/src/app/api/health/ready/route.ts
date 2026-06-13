import { NextResponse } from "next/server";
import { runReadinessCheck } from "@/lib/infra/healthCheck";

/**
 * Readiness — dataset counts + optional DB ping (heavier).
 * Do not use for recurring uptime monitors; use GET /api/health instead.
 */
export async function GET() {
  try {
    const payload = await runReadinessCheck();
    return NextResponse.json(payload, {
      status: payload.ok ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "x-lacuna-probe": "ready",
      },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "readiness check failed";
    return NextResponse.json(
      {
        ok: false,
        service: "lacuna",
        probe: "ready",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
