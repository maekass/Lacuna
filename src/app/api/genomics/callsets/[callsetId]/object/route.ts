import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import {
  getPatientDataAccessMode,
  requirePatientDataAccess,
} from "@/lib/compliance/patientDataGovernance";
import { resolveObjectUri } from "@/lib/genomics/objectStorage";
import { presignS3GetObject } from "@/lib/genomics/s3Storage";
import { getCallsetById } from "@/lib/genomics/variantQueries";
import { requireVariantStore } from "@/lib/genomics/variantStoreGuard";

interface RouteContext {
  params: Promise<{ callsetId: string }>;
}

/** Resolve object-storage location for a callset VCF blob (metadata only — no file streaming). */
export async function GET(request: Request, context: RouteContext) {
  const disabled = requireVariantStore();
  if (disabled) return disabled;

  const accessDenied = requirePatientDataAccess(
    request,
    "download_raw",
    "genomics/callsets/object",
  );
  if (accessDenied) return accessDenied;

  const ip = getClientIp(request);
  const bucket = rateLimit({
    key: `genomics-object:${ip}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  try {
    const { callsetId } = await context.params;
    const callset = await getCallsetById(callsetId);
    if (!callset) {
      return NextResponse.json({ error: "Callset not found" }, { status: 404 });
    }

    const resolved = resolveObjectUri(callset.objectUri);
    const presignedUrl = await presignS3GetObject(resolved.uri);

    return NextResponse.json({
      callsetId: callset.callsetId,
      bytes: callset.bytes,
      checksum: callset.checksum,
      object: resolved,
      presignedUrl,
      presignedExpiresSec: presignedUrl ? 3600 : null,
      governance: { patientDataMode: getPatientDataAccessMode() },
      note: presignedUrl
        ? "Use presignedUrl for HTTPS download; blobs are not streamed through Next.js."
        : "Raw VCF blobs are accessed via object storage — use accessHint for local/S3 CLI.",
    });
  } catch (error) {
    console.error("genomics object resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve object URI" }, {
      status: 500,
    });
  }
}
