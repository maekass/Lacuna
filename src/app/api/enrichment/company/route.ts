import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { enrichCompanyFromPublicApis } from "@/lib/ingestion/companyEnrichment";

const MAX_NAME_CHARS = 120;

/** GET /api/enrichment/company?name=Hologic — CT.gov + openFDA + NIH RePORTER */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Query param 'name' is required" },
      { status: 400 },
    );
  }

  if (name.length > MAX_NAME_CHARS) {
    return NextResponse.json(
      { error: `Query param 'name' exceeds ${MAX_NAME_CHARS} characters` },
      { status: 400 },
    );
  }

  const bucket = await rateLimit({
    key: `enrichCompany:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  try {
    const result = await enrichCompanyFromPublicApis(name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("company enrichment error:", err);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
