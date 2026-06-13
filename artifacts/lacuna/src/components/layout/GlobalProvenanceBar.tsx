"use client";

import { CURATED_DATASET_PROVENANCE_LINE } from "@/lib/constants/provenance";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

export default function GlobalProvenanceBar() {
  const { verifiedAcquisitions } = useVerifiedDataset();
  const line = CURATED_DATASET_PROVENANCE_LINE.replace(
    "n=58",
    `n=${verifiedAcquisitions.length}`,
  );

  return (
    <div
      role="note"
      aria-label={line}
      className="border-b border-lacuna-lavender/30 bg-lacuna-plum/[0.06] px-4 py-2 text-center text-xs font-medium text-lacuna-plum/75"
    >
      {line}
    </div>
  );
}
