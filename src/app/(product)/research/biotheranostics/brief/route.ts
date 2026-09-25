import { NextResponse } from "next/server";
import { biotheranosticsBrief } from "@/lib/research/biotheranosticsBrief";

export const dynamic = "force-static";

/** Download a portable copy without dropping caveats or source dates. */
export function GET() {
  try {
    return new NextResponse(biotheranosticsBrief(), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="biotheranostics-evidence-dossier.md"',
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dossier export unavailable" }, {
      status: 500,
    });
  }
}
