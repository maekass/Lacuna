import type { CSSProperties } from "react";

/**
 * Luxury pairing from the editorial specimen:
 * Bodoni Moda for display titles, Parisienne for script names, Ovo for
 * secondary names, Jost for small tracked caps. Source Serif 4 is the
 * reading face — Didone and script stay off body copy.
 *
 * Families are loaded in `src/app/layout.tsx` and exposed as CSS variables.
 */
export const DISPLAY_FONT = "var(--font-display), 'Bodoni Moda', Didot, serif";
export const SCRIPT_FONT =
  "var(--font-script), 'Parisienne', 'Segoe Script', cursive";
export const ELEGANT_FONT = "var(--font-elegant), Ovo, Georgia, serif";
export const LABEL_FONT = "var(--font-label), Jost, sans-serif";

/** Inline style presets for the pairing, with uppercase variants. */
export const displayFont: CSSProperties = { fontFamily: DISPLAY_FONT };

export const displayFontUppercase: CSSProperties = {
  fontFamily: DISPLAY_FONT,
  textTransform: "uppercase",
};

export const scriptFont: CSSProperties = { fontFamily: SCRIPT_FONT };

export const elegantFont: CSSProperties = { fontFamily: ELEGANT_FONT };

export const labelFont: CSSProperties = { fontFamily: LABEL_FONT };

export const labelFontUppercase: CSSProperties = {
  fontFamily: LABEL_FONT,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontWeight: 500,
};
