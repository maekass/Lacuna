import { NextResponse } from 'next/server';
import { isVariantStoreEnabled } from './variantStoreConfig';

/** Return 503 when variant store is not configured (default on Vercel demo). */
export function variantStoreDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Variant store disabled',
      hint: 'Enable locally: docker compose up -d clickhouse, npm run clickhouse:migrate, set LACUNA_VARIANT_STORE=clickhouse and CLICKHOUSE_URL in .env.local',
      docs: 'docs/GENOMICS_VARIANT_STORE.md',
    },
    { status: 503 },
  );
}

export function requireVariantStore(): NextResponse | null {
  if (!isVariantStoreEnabled()) {
    return variantStoreDisabledResponse();
  }
  return null;
}
