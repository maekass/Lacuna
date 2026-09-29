import type { EvidenceObservation } from "./schema";

export type TemporalEvidenceStatus =
  | "admissible"
  | "future"
  | "publication_date_unknown";

export interface TemporalEvidenceAssessment {
  status: TemporalEvidenceStatus;
  reason: string;
}

/**
 * Determine whether a source was publicly knowable at a snapshot date.
 *
 * An unknown publication date is not historical evidence. Event dates are not
 * an input: callers must pass the source publication date, not the event date.
 */
export function assessPublicationAt(
  publishedAt: string | undefined,
  snapshotDate: string,
): TemporalEvidenceAssessment {
  if (!publishedAt) {
    return {
      status: "publication_date_unknown",
      reason:
        "Source publication date is unknown; historical admissibility cannot be established.",
    };
  }

  if (publishedAt > snapshotDate) {
    return {
      status: "future",
      reason:
        `Source was published on ${publishedAt}, after snapshot ${snapshotDate}.`,
    };
  }

  return {
    status: "admissible",
    reason:
      `Source was published on ${publishedAt}, on or before snapshot ${snapshotDate}.`,
  };
}

/**
 * Determine whether an observation was publicly knowable at a snapshot date.
 *
 * Event dates do not make evidence historically admissible: a source published
 * after the snapshot remains future information even when it describes an
 * earlier event.
 */
export function assessEvidenceAt(
  observation: EvidenceObservation,
  snapshotDate: string,
): TemporalEvidenceAssessment {
  return assessPublicationAt(observation.source.publishedAt, snapshotDate);
}

export function evidenceAvailableAt(
  observations: readonly EvidenceObservation[],
  snapshotDate: string,
): EvidenceObservation[] {
  return observations.filter(
    (observation) =>
      assessEvidenceAt(observation, snapshotDate).status ===
        "admissible",
  );
}
