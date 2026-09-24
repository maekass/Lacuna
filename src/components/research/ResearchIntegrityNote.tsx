import { RESEARCH_INTEGRITY_PROHIBITIONS } from "@/lib/research/evidenceBoundaries";

/** Compact statement of what research context is not allowed to become. */
export default function ResearchIntegrityNote() {
  return (
    <details className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-lacuna-plum">
        Research integrity: context on this panel is not a score, a valuation,
        an acquisition prediction, or a market census.
      </summary>
      <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-lacuna-blue">
        {RESEARCH_INTEGRITY_PROHIBITIONS.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </details>
  );
}
