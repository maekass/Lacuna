import { NextResponse } from "next/server";
import { parsePageParams } from "@/lib/api/pageParams";
import {
  computeStudySampleStats,
  filterDomesticStudies,
  type DomesticInstitution,
} from "@/lib/research/domesticStudyCatalog";

const VALID_INSTITUTIONS = new Set<DomesticInstitution>([
  "nih",
  "harvard",
  "mit",
  "harvard_mit_collab",
]);

/** Curated domestic study catalog with published sample sizes (NIH, Harvard, MIT). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePageParams(url.searchParams, {
      defaultLimit: 25,
      maxLimit: 100,
    });
    const institutionRaw = url.searchParams.get("institution")?.trim()
      .toLowerCase();
    const condition = url.searchParams.get("condition")?.trim() ?? undefined;

    const institution = institutionRaw &&
        VALID_INSTITUTIONS.has(institutionRaw as DomesticInstitution)
      ? (institutionRaw as DomesticInstitution)
      : undefined;

    const page = filterDomesticStudies({
      institution,
      condition,
      limit,
      offset,
    });
    const stats = computeStudySampleStats();

    return NextResponse.json(
      {
        ...page,
        stats,
        disclaimer:
          "Static cited catalog — not live enrollment. See source field per study.",
      },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  } catch (error) {
    console.error("research studies error:", error);
    return NextResponse.json({ error: "Failed to load study catalog" }, {
      status: 500,
    });
  }
}
