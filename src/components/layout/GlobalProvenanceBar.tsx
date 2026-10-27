import { formatCuratedDatasetProvenanceLine } from "@/lib/constants/provenance";

interface GlobalProvenanceBarProps {
  /** Deal count from the unscoped curated file, not a workspace slice. */
  dealCount: number;
}

/**
 * Honesty line for the curated verified file.
 * Workspace pages keep their own scoped counts. This bar stays on the full file
 * so Home and Methods do not disagree with the header.
 */
export default function GlobalProvenanceBar(
  { dealCount }: GlobalProvenanceBarProps,
) {
  const line = formatCuratedDatasetProvenanceLine(dealCount);

  return (
    <div
      role="note"
      aria-label={line}
      className="border-b border-amber-200/80 bg-amber-50/95 px-4 py-2 text-center text-xs font-medium text-amber-900"
    >
      {line}
    </div>
  );
}
