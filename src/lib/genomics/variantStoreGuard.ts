import { NextResponse } from "next/server";
import { isVariantStoreEnabled } from "./variantStoreConfig";

/** Return 503 when variant store is not configured (default on Vercel demo). */
export function variantStoreDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Variant store disabled",
      hint:
        "Variant catalog is off in this deployment. See GENOMICS_VARIANT_STORE.md for the local ClickHouse setup.",
      docs: "docs/GENOMICS_VARIANT_STORE.md",
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
