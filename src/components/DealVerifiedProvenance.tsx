/** Static verified-dataset provenance for public deal dossiers. */

interface DealVerifiedProvenanceProps {
  line: string;
}

export default function DealVerifiedProvenance({
  line,
}: DealVerifiedProvenanceProps) {
  return (
    <p
      role="note"
      className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900"
    >
      {line}
    </p>
  );
}
