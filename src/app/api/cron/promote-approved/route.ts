import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/infra/cronAuth";
import { getDataMode } from "@/lib/data/datasetProvider";
import { promoteApprovedDeals } from "@/lib/ingestion/promoteApprovedDeals";

export const maxDuration = 300;

/**
 * Weekly promotion of human-approved SEC candidates into verified dataset.
 * Vercel: use target=db with LACUNA_DATA_MODE=db. JSON updates run via GitHub Action.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const mode = getDataMode();
    if (mode !== "db") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          "LACUNA_DATA_MODE=static — verified JSON updates run via GitHub Actions (promote-approved-deals.yml).",
        promoted: [],
      });
    }

    const result = await promoteApprovedDeals({ target: "db" });

    return NextResponse.json({
      ok: true,
      dataMode: mode,
      target: "db",
      promoted: result.promoted,
      validationErrors: result.validationErrors,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Promotion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
