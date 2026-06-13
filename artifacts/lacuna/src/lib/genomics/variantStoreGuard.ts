// @ts-ignore — server-side only via Express
import { isVariantStoreEnabled } from "./variantStoreConfig";

/** Return 503 when variant store is not configured (default on demo). */
export function variantStoreDisabledResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Variant store disabled",
      hint: "Enable locally: docker compose up -d clickhouse",
      docs: "docs/GENOMICS_VARIANT_STORE.md",
    }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

export function requireVariantStore(): Response | null {
  if (!isVariantStoreEnabled()) {
    return variantStoreDisabledResponse();
  }
  return null;
}
