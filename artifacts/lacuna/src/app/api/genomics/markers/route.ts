import { NextResponse } from "next/server";
import { DISEASE_MARKER_PANELS } from "@/lib/genomics/diseaseMarkers";

/** Static catalog of disease-linked genetic markers (no PHI). */
export function GET() {
  return NextResponse.json(
    {
      panels: DISEASE_MARKER_PANELS,
      disclaimer:
        "Educational reference only — not clinical variant interpretation. See docs/PATIENT_DATA_GOVERNANCE.md.",
    },
    {
      headers: { "cache-control": "public, max-age=3600" },
    },
  );
}
