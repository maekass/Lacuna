"use client";

import { CURATED_DATASET_PROVENANCE_LINE } from "@/lib/constants/provenance";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { useProvenanceContext } from "@/lib/provenance/ProvenanceContext";

interface CuratedDatasetBannerProps {
  className?: string;
  /** Show even when the global provenance bar is active (e.g. live API panels). */
  forceShow?: boolean;
}

/**
 * Standard provenance strip for analytical panels — curated static dataset, not live market feeds.
 */
export default function CuratedDatasetBanner(
  { className = "", forceShow = false }: CuratedDatasetBannerProps,
) {
  const { globalBarActive } = useProvenanceContext();
  const { verifiedAcquisitions } = useVerifiedDataset();

  if (globalBarActive && !forceShow) {
    return null;
  }
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
