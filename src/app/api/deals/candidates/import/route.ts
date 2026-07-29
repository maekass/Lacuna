import { NextResponse } from "next/server";
import { auditReviewRequest } from "@/lib/api/reviewAudit";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { importCandidatesCsv } from "@/lib/ingestion/importCandidatesCsv";

interface ImportBody {
  csv?: string;
}

const MAX_CSV_CHARS = 2_000_000;

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

  if (csv.length > MAX_CSV_CHARS) {
    return NextResponse.json(
      { ok: false, error: `csv exceeds ${MAX_CSV_CHARS} characters` },
      { status: 413 },
    );
  }

  try {
    const result = await importCandidatesCsv(csv);
    await auditReviewRequest(request, {
      action: "import",
      metadata: {
        parsed: result.parsed,
        skipped: result.skipped,
        errorCount: result.errors.length,
      },
    });
    return NextResponse.json({
      ok: true,
      probe: "candidates-import",
      parsed: result.parsed,
      skipped: result.skipped,
      sync: result.sync,
      errors: result.errors,
    });
  } catch (error) {
    console.error("deals/candidates/import:", error);
    const message = "CSV import failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
