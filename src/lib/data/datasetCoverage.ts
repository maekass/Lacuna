/**
 * Tier-aligned coverage labels — mirrors docs/DATA_BOUNDARIES.md three-tier model.
 * Tier 1 (verified JSON) vs Tier 2 (staging Postgres) must never be conflated in UI.
 */

export interface TierCoverageCounts {
  /** Tier 1 — human-promoted rows in dataset.verified.json */
  verifiedDealCount: number;
  /**
   * Tier 2 — lacuna_deals rows awaiting promote (pending + approved).
   * Excludes rejected (terminal) and merged (already in Tier 1).
   */
  stagingCandidateCount: number | null;
}

export interface DatasetChangelog {
  currentDealCount: number;
  priorDealCount: number;
  dealsAddedSinceSnapshot: number;
  currentLastUpdated: string;
  priorLastUpdated: string;
  hasNewDeals: boolean;
  label: string;
  /** Tier 2 staging rows — null until Postgres metrics load. */
  candidateCount: number | null;
  coverageLabel: string;
}

/** Singular/plural without external deps. */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

/** Compact hub/methods headline: "N verified deals · M staging candidates". */
export function formatTierCoverageLabel(counts: TierCoverageCounts): string {
  const verified = `${counts.verifiedDealCount} verified ${
    pluralize(counts.verifiedDealCount, "deal")
  }`;
  if (counts.stagingCandidateCount === null) return verified;
  const staging = `${counts.stagingCandidateCount} staging ${
    pluralize(counts.stagingCandidateCount, "candidate")
  }`;
  return `${verified} · ${staging}`;
}

/**
 * Attach Tier 2 candidate count to a verified-only changelog snapshot.
 * Lives here (not getDatasetChangelog) so client footnotes can merge live
 * queue metrics without importing computed-dataset-summary.json.
 */
export function mergeChangelogWithCandidates<
  T extends {
    currentDealCount: number;
    candidateCount: number | null;
    coverageLabel: string;
  },
>(
  changelog: T,
  candidateCount: number | null,
): T {
  const counts: TierCoverageCounts = {
    verifiedDealCount: changelog.currentDealCount,
    stagingCandidateCount: candidateCount,
  };
  return {
    ...changelog,
    candidateCount,
    coverageLabel: formatTierCoverageLabel(counts),
  };
}

export interface VerifiedGrowthDelta {
  added: number;
  priorSnapshotDate: string;
  currentLastUpdated: string;
  currentDealCount: number;
}

/** Verified-only growth note vs last computed snapshot. */
export function formatVerifiedGrowthLabel(delta: VerifiedGrowthDelta): string {
  if (delta.added > 0) {
    return `+${delta.added} verified ${
      pluralize(delta.added, "deal")
    } since ${delta.priorSnapshotDate}`;
  }
  return `${delta.currentDealCount} verified deals · last updated ${delta.currentLastUpdated}`;
}

/** Methods footnote — explicit tier definitions for portfolio reviewers. */
export function formatTierCoverageDefinition(
  counts: TierCoverageCounts,
  options: { metricsUnavailable?: boolean } = {},
): string {
  const unavailable = options.metricsUnavailable
    ? " (Tier 2 counts unavailable without Postgres)"
    : "";
  return `${
    formatTierCoverageLabel(counts)
  } — Tier 1 lives in dataset.verified.json; Tier 2 staging rows remain in Postgres until a reviewer promotes them${unavailable}.`;
}
