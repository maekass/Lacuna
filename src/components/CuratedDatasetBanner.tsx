"use client";

import { CURATED_DATASET_PROVENANCE_LINE } from "@/lib/constants/provenance";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

interface CuratedDatasetBannerProps {
  className?: string;
}

/**
 * Standard provenance strip for analytical panels — curated static dataset, not live market feeds.
 */
export default function CuratedDatasetBanner(
  { className = "" }: CuratedDatasetBannerProps,
) {
  const { verifiedAcquisitions } = useVerifiedDataset();
  const dealCount = verifiedAcquisitions.length;
  const line = CURATED_DATASET_PROVENANCE_LINE.replace(
    "n=58",
    `n=${dealCount}`,
  );

  return (
    <p
      role="note"
      aria-label={line}
      className={`rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-900 leading-relaxed ${className}`}
    >
      {line}
    </p>
  );
}
