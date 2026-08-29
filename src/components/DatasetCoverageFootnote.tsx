"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  type DatasetChangelog,
  formatTierCoverageDefinition,
  mergeChangelogWithCandidates,
} from "@/lib/data/datasetCoverage";
import { usePendingQueueMetrics } from "@/lib/hooks/usePendingQueueMetrics";

interface DatasetCoverageFootnoteProps {
  /** Mode-aware changelog from getVerifiedDataset() on the server. */
  changelog: DatasetChangelog;
  className?: string;
  /** Methods page: full Tier 1 / Tier 2 definitions. Hub: compact counts only. */
  variant?: "compact" | "methods";
  reviewHref?: string;
}

/** Honest Tier 1 vs Tier 2 counts for hub and methods footnotes. */
export default function DatasetCoverageFootnote({
  changelog: baseChangelog,
  className = "",
  variant = "methods",
  reviewHref = "/deals#review",
}: DatasetCoverageFootnoteProps) {
  const { metrics, unavailable } = usePendingQueueMetrics();
  const candidateCount = metrics?.stagingCandidateCount ?? null;

  const changelog = useMemo(
    () => mergeChangelogWithCandidates(baseChangelog, candidateCount),
    [baseChangelog, candidateCount],
  );

  if (variant === "compact") {
    return (
      <span className={className} role="note">
        {changelog.coverageLabel}
      </span>
    );
  }

  return (
    <p className={className} role="note">
      {formatTierCoverageDefinition(
        {
          verifiedDealCount: changelog.currentDealCount,
          stagingCandidateCount: candidateCount,
        },
        { metricsUnavailable: unavailable },
      )} See{" "}
      <Link href={reviewHref} className="underline underline-offset-2">
        review console
      </Link>
      . {changelog.label}.
    </p>
  );
}
