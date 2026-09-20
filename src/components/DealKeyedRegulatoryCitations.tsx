import MotionSection from "@/components/ui/MotionSection";
import type { KeyedRegulatoryCitation } from "@/lib/deals";

/**
 * Deal-dossier panel for reviewer-keyed NCT/CPT URLs.
 * Must not fetch or search by company name.
 */
export default function DealKeyedRegulatoryCitations({
  citations,
}: {
  citations: readonly KeyedRegulatoryCitation[];
}) {
  if (citations.length === 0) return null;

  return (
    <MotionSection delay={0.06} className="mb-10">
      <h2 className="text-lg font-semibold text-lacuna-plum">
        Keyed registry citations
      </h2>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-lacuna-blue/70">
        Public NCT or CPT URLs attached to this target — not a live name search
      </p>
      <ul className="mt-3 space-y-2">
        {citations.map((row) => (
          <li
            key={`${row.codeKind}-${row.code}`}
            className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2 text-sm"
          >
            <a
              href={row.citationUrl}
              className="font-medium text-lacuna-plum underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {row.code}
            </a>
            {row.label
              ? (
                <span className="mt-0.5 block text-xs text-lacuna-blue/80">
                  {row.label}
                </span>
              )
              : null}
          </li>
        ))}
      </ul>
    </MotionSection>
  );
}
