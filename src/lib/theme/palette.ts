/**
 * Lacuna brand palette — Pantone Spring/Summer 2026 (see README Design System)
 */
export const LACUNA_PALETTE = {
  transcendentPink: '#E8B4B8',
  softLavender: '#B8A9C9',
  cosmicBlue: '#4A5D8A',
  deepPlum: '#5D4E6D',
} as const;

export const LACUNA_SECTOR_COLORS: Record<string, string> = {
  Fertility: LACUNA_PALETTE.transcendentPink,
  'Mental Health': LACUNA_PALETTE.softLavender,
  'General Wellness': LACUNA_PALETTE.cosmicBlue,
  Wearables: LACUNA_PALETTE.deepPlum,
  'Pelvic Health': '#7A6B8F',
};

export const LACUNA_GRADIENT = `linear-gradient(135deg, ${LACUNA_PALETTE.transcendentPink} 0%, ${LACUNA_PALETTE.softLavender} 35%, ${LACUNA_PALETTE.cosmicBlue} 70%, ${LACUNA_PALETTE.deepPlum} 100%)`;
