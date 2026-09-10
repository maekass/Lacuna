"use client";

import { getCmsUtilizationProvenance } from "@/lib/data/cmsUtilizationProvider";

/** Visible disclosure when CMS utilization rows are the in-repo fallback table. */
export default function CmsUtilizationFallbackNotice() {
  const provenance = getCmsUtilizationProvenance();
  if (!provenance.allHardcodedFallback && provenance.fallbackRowCount === 0) {
    return null;
  }

  return (
    <p
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      CMS utilization figures are an in-repo hardcoded fallback ({provenance
        .fallbackRowCount} of {provenance.rowCount}{" "}
      CPT rows), not a live data.cms.gov pull. PUF data year is unknown.
      Intended source: {provenance.intendedSource ?? "CMS PUF"}.
    </p>
  );
}
