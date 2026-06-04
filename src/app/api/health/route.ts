import { NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/infra/healthCheck';

export async function GET() {
  try {
    const payload = await runHealthCheck();
    return NextResponse.json(payload, { status: payload.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'health check failed';
    return NextResponse.json(
      {
        ok: false,
        service: 'lacuna',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
