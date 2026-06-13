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
      className="glass-layer-tint border-b border-lacuna-plum/12 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-lacuna-plum/80"
    >
      {line}
    </div>
  );
}
