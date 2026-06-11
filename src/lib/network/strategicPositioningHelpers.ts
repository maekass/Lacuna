/**
 * Constants and pure helpers for the Strategic Positioning Map.
 *
 * Extracted from `src/components/StrategicPositioningMap.tsx` to keep the
 * component within the project size guideline. Only sectors listed in
 * `sectorAxisPositions` are plotted on the map — callers should filter
 * companies to mapped sectors and surface the coverage honestly.
 */

import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

/** Foreground Capital pillar each mapped sector best serves. */
export const pillarMap: Record<string, string> = {
  Fertility: "Transformative Innovation",
  "Mental Health": "Access",
  "General Wellness": "Affordability",
  "Pelvic Health": "Systemic Change",
  Wearables: "Transformative Innovation",
};

/** Chip color per Foreground pillar. */
export const pillarColors: Record<string, string> = {
  "Transformative Innovation": "#7C3AED",
  Access: "#059669",
  Affordability: "#D97706",
  "Systemic Change": "#DC2626",
};

/** X-axis position (0–1) per mapped sector. Unlisted sectors are not plotted. */
export const sectorAxisPositions: Record<string, number> = {
  Fertility: 0.14,
  "Pelvic Health": 0.34,
  "Mental Health": 0.54,
  "General Wellness": 0.74,
  Wearables: 0.9,
};

/** Y-axis gridline ticks by funding-stage maturity. */
export const stageAxisPositions = [
  { label: "Public", value: 0.95 },
  { label: "Pre-IPO", value: 0.86 },
  { label: "Late Stage", value: 0.76 },
  { label: "Series C+", value: 0.62 },
  { label: "Series B", value: 0.48 },
  { label: "Series A", value: 0.34 },
  { label: "Seed", value: 0.18 },
] as const;

/** Node fill color per mapped sector. */
export const sectorNodeColors: Record<string, string> = {
  Fertility: "#B8A9C9",
  "Mental Health": "#4A5D8A",
  "General Wellness": "#E8B4B8",
  "Pelvic Health": "#5D4E6D",
  Wearables: "#94A3B8",
};

/** A verified company with computed map coordinates and optional pillar tag. */
export interface CompanyPosition extends VerifiedCompanyView {
  xPosition: number;
  yPosition: number;
  pillar?: string;
}

/** Restricts a value to the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Deterministic 32-bit hash used for stable per-node jitter. */
export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Maps a free-form stage string to a y-axis position (0–1). */
export function getStagePosition(stage: string) {
  if (/public/i.test(stage)) return 0.95;
  if (/pre-ipo/i.test(stage)) return 0.86;
  if (/series d|series e|series f|late stage/i.test(stage)) return 0.76;
  if (/series c/i.test(stage)) return 0.62;
  if (/series b/i.test(stage)) return 0.48;
  if (/series a/i.test(stage)) return 0.34;
  if (/seed|pre-seed/i.test(stage)) return 0.18;
  return 0.52;
}
