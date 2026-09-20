/**
 * Shared point-and-interval composition for the acquisition index.
 * The sector adjustment must be applied to the point and both bounds.
 */

import { missingInput, sufficient } from "./estimators";
import type { QuantValue } from "./types";

/**
 * Undocumented heuristic scaling factor pending derivation.
 * `sectorShare * SECTOR_SHARE_SCALE` is clamped to [0.8, 1.2].
 * Do not change this value without a documented derivation.
 */
export const SECTOR_SHARE_SCALE = 5;

/**
 * Values below one index point are not reported as numbers.
 * The catalog exit share Wilson interval is ±7.7pp; a 5% manufactured
 * floor would hide that resolution.
 */
export const REPORTABLE_RESOLUTION = 0.01;

export interface AcquisitionIndexInput {
  weightedScore: number;
  baseRate: number;
  confidenceInterval: [number, number];
  sectorAdjustment: number;
  sampleSize: number;
  disclosedFraction?: number;
  selectionCaveat?: string;
}

/**
 * Map a sector's share of catalog deals onto the [0.8, 1.2] adjustment.
 */
export function sectorShareAdjustment(sectorShare: number): number {
  return Math.min(1.2, Math.max(0.8, sectorShare * SECTOR_SHARE_SCALE));
}

/**
 * Apply the same sector adjustment to the point estimate and both interval
 * bounds. Fail closed when the point is below reportable resolution or the
 * interval would exclude the point. There is no numeric floor or ceiling —
 * a unit-interval axiom is not applied because this quantity is an index,
 * not a probability.
 */
export function composeAcquisitionIndex(
  input: AcquisitionIndexInput,
): QuantValue<number> {
  const scale = input.weightedScore * input.sectorAdjustment;
  const raw = input.baseRate * scale;
  const lo = input.confidenceInterval[0] * scale;
  const hi = input.confidenceInterval[1] * scale;

  if (!Number.isFinite(raw) || raw < REPORTABLE_RESOLUTION) {
    return missingInput("Below reportable resolution");
  }

  if (!(lo <= raw && raw <= hi)) {
    return missingInput("Interval inconsistent with point estimate");
  }

  return sufficient({
    value: raw,
    sampleSize: input.sampleSize,
    confidenceInterval: [lo, hi],
    disclosedFraction: input.disclosedFraction,
    selectionCaveat: input.selectionCaveat,
  });
}
