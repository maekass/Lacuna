import { NextRequest, NextResponse } from "next/server";
import { enrichCompanyFromPublicApis } from "@/lib/ingestion/companyEnrichment";

/** GET /api/enrichment/company?name=Hologic — CT.gov + openFDA + NIH RePORTER */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Query param 'name' is required" },
      { status: 400 },
    );
  }

  try {
    const result = await enrichCompanyFromPublicApis(name);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
