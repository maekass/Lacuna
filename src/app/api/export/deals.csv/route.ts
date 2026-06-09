import { NextResponse } from "next/server";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";

function csvEscape(value: string) {
  const raw = value ?? "";
  // CSV injection hardening for spreadsheet apps (Excel/Sheets).
  const needsNeutralize = /^[=+\-@]/.test(raw);
  const safe = needsNeutralize ? `'${raw}` : raw;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `exportCsv:${ip}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: limit.resetAtMs },
      { status: 429 },
    );
  }

  const dataset = await getVerifiedDataset();
  const { acquisitions } = dataset;

  const header = [
    "id",
    "announcedDate",
    "closedDate",
    "dealType",
    "targetName",
    "acquirerName",
    "dealValue_millions",
    "dealValueNote",
    "source",
    "strategicRationale",
  ];

  const rows = acquisitions.map((d) => [
    d.id,
    d.announcedDate,
    d.closedDate ?? "",
    d.dealType,
    d.targetName,
    d.acquirerName,
    typeof d.dealValue === "number" ? String(d.dealValue) : "",
    d.dealValueNote ?? "",
    d.source ?? "",
    d.strategicRationale,
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => csvEscape(v)).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="lacuna-deals.csv"',
      "cache-control": "public, max-age=60",
    },
  });
}
