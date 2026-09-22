import { LACUNA_SAMPLE_BOUNDARY_NOTE } from "@/lib/data/lacunaDataset/samplingFrame";

interface SampleBoundaryNoteProps {
  className?: string;
}

/**
 * One-line sampling-frame boundary for a principal deal or exit interpretation.
 */
export default function SampleBoundaryNote(
  { className = "" }: SampleBoundaryNoteProps,
) {
  return (
    <p
      role="note"
      className={`rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900 ${className}`}
    >
      {LACUNA_SAMPLE_BOUNDARY_NOTE}
    </p>
  );
}
