import { NextResponse } from "next/server";
import { runLivenessCheck } from "@/lib/infra/healthCheck";

/** Liveness — constant-time. Point all uptime monitors here (not /api/health/ready). */
export function GET() {
  const payload = runLivenessCheck();
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "x-lacuna-probe": "live",
    },
  });
}
