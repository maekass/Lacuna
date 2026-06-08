import { NextResponse } from 'next/server';
import { getVerifiedDataset } from '@/lib/data/datasetProvider';
import { getClientIp, rateLimit } from '@/lib/api/rateLimit';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({ key: `verifiedDataset:${ip}`, limit: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Rate limited', retryAt: limit.resetAtMs },
      { status: 429 },
    );
  }

  const dataset = await getVerifiedDataset();
  return NextResponse.json(dataset, {
    headers: {
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

