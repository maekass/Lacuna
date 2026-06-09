import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { parsePageParams } from "@/lib/api/pageParams";
import { listVariants } from "@/lib/genomics/variantQueries";
import { requireVariantStore } from "@/lib/genomics/variantStoreGuard";

export async function GET(request: Request) {
  const disabled = requireVariantStore();
  if (disabled) return disabled;

  const ip = getClientIp(request);
  const bucket = rateLimit({
    key: `genomics-variants:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePageParams(url.searchParams, {
      defaultLimit: 100,
      maxLimit: 1000,
    });
    const callsetId = url.searchParams.get("callsetId") ?? undefined;
    const chrom = url.searchParams.get("chrom") ?? undefined;
    const gene = url.searchParams.get("gene") ?? undefined;
    const pathogenicOnly = url.searchParams.get("pathogenic") === "true";

    if (!callsetId && !gene) {
      return NextResponse.json(
        {
          error:
            "Provide callsetId or gene to avoid full-table scans on large catalogs",
        },
        { status: 400 },
      );
    }

    const page = await listVariants({
      limit,
      offset,
      callsetId,
      chrom,
      gene,
      pathogenicOnly,
    });

    return NextResponse.json(page, {
      headers: { "cache-control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("genomics variants error:", error);
    return NextResponse.json({ error: "Failed to query variants" }, {
      status: 500,
    });
  }
}
