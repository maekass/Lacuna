import { EvidenceContextCard } from "@/components/research/EvidenceContextCard";
import {
  BURDEN_CAPITAL_OPPORTUNITY_DISCLOSURE,
  WEF_BCG_SOURCE,
} from "@/lib/research/evidenceBoundaries";

interface BurdenCapitalOpportunityNoteProps {
  methodologyNote: string;
  className?: string;
}

/**
 * Shared disclosure plus WEF/BCG source context for burden–capital views.
 * Does not change numerical calculations.
 */
export function BurdenCapitalOpportunityNote({
  methodologyNote,
  className = "mb-4",
}: BurdenCapitalOpportunityNoteProps) {
  return (
    <div className={className}>
      <p
        className="mb-3 text-xs leading-relaxed text-lacuna-blue/80"
        role="note"
      >
        {BURDEN_CAPITAL_OPPORTUNITY_DISCLOSURE}
      </p>
      <EvidenceContextCard
        {...WEF_BCG_SOURCE}
        methodologyNote={methodologyNote}
      />
    </div>
  );
}
