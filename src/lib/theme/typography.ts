import type { CSSProperties } from "react";

/**
 * Lacuna type stack — editorial serif for display copy, condensed sans for
 * uppercase labels (see README Design System).
 */
export const DISPLAY_FONT = "'Bodoni MT', Didot, serif";
export const LABEL_FONT = "'Arial Narrow', sans-serif";

/** Inline style presets for the two stacks, with uppercase variants. */
export const displayFont: CSSProperties = { fontFamily: DISPLAY_FONT };

export const displayFontUppercase: CSSProperties = {
  fontFamily: DISPLAY_FONT,
  textTransform: "uppercase",
};

export const labelFont: CSSProperties = { fontFamily: LABEL_FONT };

export const labelFontUppercase: CSSProperties = {
  fontFamily: LABEL_FONT,
  textTransform: "uppercase",
};
