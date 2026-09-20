"use client";

import { getCmsUtilizationProvenance } from "@/lib/data/cmsUtilizationProvider";

/** Visible disclosure when CMS utilization is withheld or in-repo fallback. */
export default function CmsUtilizationFallbackNotice() {
  const provenance = getCmsUtilizationProvenance();
  if (
    !provenance.withheld &&
    !provenance.allHardcodedFallback &&
    provenance.fallbackRowCount === 0
  ) {
    return null;
  }

  if (provenance.withheld && provenance.fallbackRowCount === 0) {
    return (
      <p
        role="status"
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
      >
        <strong>CMS utilization withheld.</strong>{" "}
        No verified aggregate PUF input is committed (
        <code>staging/cms-utilization-verified.json</code>{" "}
        is absent). Sector reimbursement totals are not published — they are not
        a data.cms.gov pull and must not be used for valuation or market-size
        conclusions.
      </p>
    );
  }

  return (
    <p
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      <strong>Research-only utilization context — not decision-grade.</strong>
      {" "}
      These CMS utilization figures are an in-repo hardcoded fallback
      ({provenance.fallbackRowCount} of {provenance.rowCount}{" "}
      CPT rows), not a reproducible data.cms.gov aggregate. PUF data year is
      unknown, so these values must not be used for investment valuation,
      market-size, or reimbursement conclusions. Intended source:{" "}
      {provenance.intendedSource ?? "CMS PUF"}.
    </p>
  );
}
