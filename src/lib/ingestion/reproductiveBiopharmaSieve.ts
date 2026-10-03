/**
 * Reproductive-biopharma curation layer for Lacuna.
 *
 * Applies a narrow institutional sieve to mixed fertility/reproductive deal
 * data before assets enter the broader SBBT workflow.
 */

export const REPRODUCTIVE_CONSUMER_FLAGS = [
  "app",
  "subscription",
  "boutique",
  "lifestyle",
  "clinic expansion",
  "consumer-facing",
] as const;

export const SBBT_REPRODUCTIVE_SECTOR =
  "Sex-Based Biology & Targeted Therapeutics (SBBT)";

export const SBBT_REPRODUCTIVE_SUB_SPECIALTY =
  "Reproductive Biopharma / Critical Neonatal Infrastructure";

export interface ReproductiveBiopharmaDeal {
  deal_id: string;
  target_name: string;
  type: string;
  description: string;
  disclosed_value_usd?: number;
  is_inpatient_hospital_node: boolean;
  has_surrogate_biomarkers: boolean;
  [key: string]: unknown;
}

export interface CuratedReproductiveBiopharmaDeal
  extends ReproductiveBiopharmaDeal {
  broad_sector: typeof SBBT_REPRODUCTIVE_SECTOR;
  sub_specialty: typeof SBBT_REPRODUCTIVE_SUB_SPECIALTY;
  investment_thesis: string;
  evidence_flags: {
    consumer_noise_detected: boolean;
    inpatient_hospital_node: boolean;
    surrogate_biomarker_evidence: boolean;
  };
}

export function runInstitutionalFertilitySieve(
  db: ReproductiveBiopharmaDeal[],
): CuratedReproductiveBiopharmaDeal[] {
  return db.flatMap((deal) => {
    const description = deal.description.toLowerCase();
    const consumerNoiseDetected = REPRODUCTIVE_CONSUMER_FLAGS.some((flag) =>
      description.includes(flag),
    );
    const consumerType = ["Retail Clinics", "Consumer App"].includes(
      deal.type,
    );

    if (consumerNoiseDetected || consumerType) {
      return [];
    }

    if (
      !deal.is_inpatient_hospital_node ||
      !deal.has_surrogate_biomarkers
    ) {
      return [];
    }

    return [
      {
        ...deal,
        broad_sector: SBBT_REPRODUCTIVE_SECTOR,
        sub_specialty: SBBT_REPRODUCTIVE_SUB_SPECIALTY,
        investment_thesis:
          "High-science asset with defensive intellectual property and structured inpatient billing paths.",
        evidence_flags: {
          consumer_noise_detected: consumerNoiseDetected,
          inpatient_hospital_node: deal.is_inpatient_hospital_node,
          surrogate_biomarker_evidence: deal.has_surrogate_biomarkers,
        },
      },
    ];
  });
}
