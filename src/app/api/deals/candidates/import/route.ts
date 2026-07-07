import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { importCandidatesCsv } from "@/lib/ingestion/importCandidatesCsv";

interface ImportBody {
  csv?: string;
}

/**
 * Import manual / press deal candidates from CSV into `lacuna_deals` staging.
 * Template: `staging/deals_candidates.template.csv`
 */
export async function POST(request: Request) {
  const denied = guardDealReviewRequest(request);
  if (denied) return denied;

  let body: ImportBody;
  try {
    body = await request.json() as ImportBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const csv = body.csv?.trim();
  if (!csv) {
    return NextResponse.json(
      { ok: false, error: "Missing csv field in request body" },
      { status: 400 },
    );
  }

  try {
    const result = await importCandidatesCsv(csv);
    return NextResponse.json({
      ok: true,
      probe: "candidates-import",
      parsed: result.parsed,
      skipped: result.skipped,
      sync: result.sync,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "CSV import failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
