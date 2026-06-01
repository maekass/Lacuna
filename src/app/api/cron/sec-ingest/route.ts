import process from 'node:process';
import { NextResponse } from 'next/server';
import { runSecIngest } from '@/lib/ingestion/secIngestPipeline';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    return NextResponse.json(
      { error: 'SEC_EDGAR_USER_AGENT is not configured' },
      { status: 503 },
    );
  }

  try {
    const result = await runSecIngest();
    return NextResponse.json({
      ok: true,
      scannedTickers: result.scannedTickers,
      parsed: result.parsedFilings.length,
      womensHealthCandidates: result.classified.filter((c) => c.womensHealthRelevant).length,
      sync: result.sync,
      runId: result.runId ?? null,
      sinceDateUsed: result.sinceDateUsed ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEC ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
