import process from "node:process";
import { NextResponse } from "next/server";
import { readLatestFreeApiExport } from "@/lib/ingestion/freeApi/readLatestExport";

/** Latest on-disk free-API batch export. */
export function GET() {
  const latest = readLatestFreeApiExport();

  if (!latest) {
    return NextResponse.json({
      ok: true,
      latest: null,
      message: "No export yet.",
      cli: "download-free-apis",
      docs: "/docs/FREE_API_DOWNLOADS.md",
    });
  }

  return NextResponse.json({
    ok: true,
    latest: {
      directory: latest.directory.replace(`${process.cwd()}/`, ""),
      downloadedAt: latest.manifest.downloadedAt,
      entityCount: latest.manifest.entityCount,
      entityFileCount: latest.entityFileCount,
      sourcesRequested: latest.manifest.sourcesRequested,
      secUserAgentConfigured: latest.manifest.secUserAgentConfigured,
      patentsViewConfigured: latest.manifest.patentsViewConfigured,
      notes: latest.manifest.notes,
    },
    cli: "download-free-apis",
    docs: "/docs/FREE_API_DOWNLOADS.md",
  });
}
