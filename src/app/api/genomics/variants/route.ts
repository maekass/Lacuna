import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import {
  getPatientDataAccessMode,
  requirePatientDataAccess,
} from "@/lib/compliance/patientDataGovernance";
import { parsePageParams } from "@/lib/api/pageParams";
import { listVariants } from "@/lib/genomics/variantQueries";
import { requireVariantStore } from "@/lib/genomics/variantStoreGuard";

export async function GET(request: Request) {
  const disabled = requireVariantStore();
  if (disabled) return disabled;

  const limited = await enforceRateLimit(request, {
    key: "genomics-variants",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const accessDenied = await requirePatientDataAccess(
    request,
    "read_summary",
    "genomics/variants",
  );
  if (accessDenied) return accessDenied;

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

    return NextResponse.json(
      {
        ...page,
        governance: { patientDataMode: getPatientDataAccessMode() },
      },
      {
        headers: { "cache-control": "private, max-age=30" },
      },
    );
  } catch (error) {
    console.error("genomics variants error:", error);
    return NextResponse.json({ error: "Failed to query variants" }, {
      status: 500,
    });
  }
}
