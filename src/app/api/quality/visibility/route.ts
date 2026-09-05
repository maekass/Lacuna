import { NextResponse } from "next/server";
import { getQualityVisibility } from "@/lib/data/qualityVisibilityProvider";

/** Slim measurement-layer census (quality, gated metrics, vintage, display debt). */
export function GET() {
  return NextResponse.json(getQualityVisibility(), {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
