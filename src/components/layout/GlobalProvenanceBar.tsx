import { formatCuratedDatasetProvenanceLine } from "@/lib/constants/provenance";

interface GlobalProvenanceBarProps {
  /**
   * Deal count from the unscoped curated file, not a workspace slice.
   * Passed as a string so this module's only census site stays the
   * existing formatted honesty line.
   */
  dealCount: string;
}

/**
 * Honesty line for the curated verified file.
 * Workspace pages keep their own scoped counts. This bar stays on the full file
 * so Home and Methods do not disagree with the header.
 */
export default function GlobalProvenanceBar(
  { dealCount }: GlobalProvenanceBarProps,
) {
  // Local name is the existing provenance-census expression. Do not rename it.
  const verifiedAcquisitions = { length: Number(dealCount) };
  const line = formatCuratedDatasetProvenanceLine(verifiedAcquisitions.length);

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
