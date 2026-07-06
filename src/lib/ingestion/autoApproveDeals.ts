import { query } from "@/lib/data/dbClient";
import type { ClassificationConfidence } from "@/lib/ingestion/dealClassificationEngine";

export type AutoApproveConfidence = "high" | "medium";

const CONFIDENCE_RANK: Record<ClassificationConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function resolveMinConfidence(): AutoApproveConfidence {
  const raw = process.env.LACUNA_AUTO_APPROVE_CONFIDENCE?.trim().toLowerCase();
  return raw === "medium" ? "medium" : "high";
}

/** True when ingest cron should auto-approve + promote without human review. */
export function isHandsOffIngestEnabled(): boolean {
  return process.env.LACUNA_HANDS_OFF_INGEST === "true";
}

/**
 * Auto-approve women's health candidates at or above the confidence threshold.
 * SEC filing remains primary source; optional secondary URL in review_notes.
 */
export async function autoApproveHighConfidenceDeals(): Promise<number> {
  const minConfidence = resolveMinConfidence();
  const minRank = CONFIDENCE_RANK[minConfidence];
  const eligible = (Object.entries(CONFIDENCE_RANK) as Array<
    [ClassificationConfidence, number]
  >)
    .filter(([, rank]) => rank >= minRank)
    .map(([confidence]) => confidence);

  const rows = await query<{ deal_id: string }>(
    `UPDATE lacuna_deals
     SET status = 'approved',
         review_notes = COALESCE(
           review_notes,
           'Auto-approved: SEC high-confidence women''s health classification (hands-off pipeline).'
         ),
         updated_at = NOW()
     WHERE status IN ('pending', 'pending_review')
       AND womens_health_relevant = TRUE
       AND classification_confidence = ANY($1::text[])
     RETURNING deal_id`,
    [eligible],
  );

  return rows.length;
}
