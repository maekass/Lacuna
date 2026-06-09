import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import {
  getPatientDataAccessMode,
  redactCallsetFields,
  requirePatientDataAccess,
} from "@/lib/compliance/patientDataGovernance";
import { parsePageParams } from "@/lib/api/pageParams";
import { listCallsets } from "@/lib/genomics/variantQueries";
import { requireVariantStore } from "@/lib/genomics/variantStoreGuard";

export async function GET(request: Request) {
  const disabled = requireVariantStore();
  if (disabled) return disabled;

  const accessDenied = requirePatientDataAccess(
    request,
    "read_summary",
    "genomics/callsets",
  );
  if (accessDenied) return accessDenied;

  const ip = getClientIp(request);
  const bucket = rateLimit({
    key: `genomics-callsets:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePageParams(url.searchParams, {
      defaultLimit: 25,
      maxLimit: 200,
    });
    const studyId = url.searchParams.get("studyId") ?? undefined;

    const page = await listCallsets({ limit, offset, studyId });
    const mode = getPatientDataAccessMode();
    return NextResponse.json(
      {
        ...page,
        callsets: page.callsets.map((c) => redactCallsetFields(c, mode)),
        governance: { patientDataMode: mode },
      },
      {
        headers: { "cache-control": "private, max-age=60" },
      },
    );
  } catch (error) {
    console.error("genomics callsets error:", error);
    return NextResponse.json({ error: "Failed to list callsets" }, {
      status: 500,
    });
  }
}
