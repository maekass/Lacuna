/**
 * Lacuna brand palette — Pantone Spring/Summer 2026 (see README Design System)
 */
export const LACUNA_PALETTE = {
  transcendentPink: "#E8B4B8",
  softLavender: "#B8A9C9",
  cosmicBlue: "#4A5D8A",
  deepPlum: "#5D4E6D",
} as const;

/** Semantic tokens for surfaces, text, borders, and chart chrome. */
export const LACUNA_SEMANTIC = {
  surface: {
    default: "#FFFFFF",
    muted: "#FAF7F8",
    subtle: "#F3EEF1",
    elevated: "#FFFFFF",
    inverse: LACUNA_PALETTE.deepPlum,
  },
  text: {
    primary: LACUNA_PALETTE.deepPlum,
    secondary: LACUNA_PALETTE.cosmicBlue,
    muted: "#8A7D96",
    inverse: "#FFFFFF",
  },
  border: {
    default: "rgba(184, 169, 201, 0.45)",
    subtle: "rgba(184, 169, 201, 0.28)",
    strong: "rgba(93, 78, 109, 0.22)",
  },
  chart: {
    grid: "rgba(184, 169, 201, 0.35)",
    accent: "#7C3AED",
    barStart: LACUNA_PALETTE.transcendentPink,
    barEnd: LACUNA_PALETTE.softLavender,
  },
} as const;

export const LACUNA_SECTOR_COLORS: Record<string, string> = {
  Fertility: LACUNA_PALETTE.transcendentPink,
  "Mental Health": LACUNA_PALETTE.softLavender,
  "General Wellness": LACUNA_PALETTE.cosmicBlue,
  Wearables: LACUNA_PALETTE.deepPlum,
  "Pelvic Health": "#7A6B8F",
};

export const LACUNA_GRADIENT =
  `linear-gradient(135deg, ${LACUNA_PALETTE.transcendentPink} 0%, ${LACUNA_PALETTE.softLavender} 35%, ${LACUNA_PALETTE.cosmicBlue} 70%, ${LACUNA_PALETTE.deepPlum} 100%)`;
