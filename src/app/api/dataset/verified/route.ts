import { NextResponse } from 'next/server';
import { getVerifiedDataset } from '@/lib/data/datasetProvider';

export async function GET() {
  const dataset = await getVerifiedDataset();
  return NextResponse.json(dataset);
}

