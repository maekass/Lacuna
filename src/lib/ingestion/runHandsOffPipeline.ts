import { autoApproveHighConfidenceDeals, isHandsOffIngestEnabled } from "@/lib/ingestion/autoApproveDeals";
import {
  promoteApprovedDeals,
  resolvePromoteTarget,
  type PromoteApprovedDealsResult,
} from "@/lib/ingestion/promoteApprovedDeals";

export interface HandsOffPipelineResult {
  enabled: boolean;
  autoApproved: number;
  promotion: PromoteApprovedDealsResult | null;
  skippedReason?: string;
}

/**
 * Unattended path: auto-approve confident WH candidates → promote to verified dataset.
 * Enabled with LACUNA_HANDS_OFF_INGEST=true (Vercel cron or GitHub Actions).
 */
export async function runHandsOffPipeline(): Promise<HandsOffPipelineResult> {
  if (!isHandsOffIngestEnabled()) {
    return {
      enabled: false,
      autoApproved: 0,
      promotion: null,
      skippedReason: "LACUNA_HANDS_OFF_INGEST is not true",
    };
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      enabled: true,
      autoApproved: 0,
      promotion: null,
      skippedReason: "DATABASE_URL is not configured",
    };
  }

  const autoApproved = await autoApproveHighConfidenceDeals();
  const promotion = await promoteApprovedDeals({
    target: resolvePromoteTarget(),
  });

  return {
    enabled: true,
    autoApproved,
    promotion,
  };
}
