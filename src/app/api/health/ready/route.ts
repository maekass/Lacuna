import { NextResponse } from 'next/server';
import { runReadinessCheck } from '@/lib/infra/healthCheck';

/** Readiness — dataset counts + optional DB ping (heavier; use sparingly). */
export async function GET() {
  try {
    const payload = await runReadinessCheck();
    return NextResponse.json(payload, { status: payload.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'readiness check failed';
    return NextResponse.json(
      {
        ok: false,
        service: 'lacuna',
        probe: 'ready',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
