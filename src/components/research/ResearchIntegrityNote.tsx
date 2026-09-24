import { RESEARCH_INTEGRITY_PROHIBITIONS } from "@/lib/research/evidenceBoundaries";

/** Compact statement of what research context is not allowed to become. */
export default function ResearchIntegrityNote() {
  return (
    <div
      role="note"
      className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-3 py-2"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-lacuna-text-secondary">
        Research integrity
      </p>
      <ul className="mt-1 space-y-0.5 text-xs leading-relaxed text-lacuna-blue">
        {RESEARCH_INTEGRITY_PROHIBITIONS.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
