import { NextResponse } from 'next/server';
import { runLivenessCheck } from '@/lib/infra/healthCheck';

/** Liveness — constant-time; point synthetics here. */
export async function GET() {
  const payload = runLivenessCheck();
  return NextResponse.json(payload, { status: 200 });
}
