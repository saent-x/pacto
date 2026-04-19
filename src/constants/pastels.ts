/**
 * Warm Block pastel palette — shared across dark and light themes.
 * Used for signature hero cards, mood tints, timeline dots.
 *
 * Each pastel has a matching `ink` tone — a deep, desaturated version
 * of the same hue — for text placed ON the pastel background.
 */
export const Pastels = {
  peach: '#F4A68C',
  peachInk: '#3A1F14',

  lavender: '#B8A8E8',
  lavenderInk: '#1F1635',

  butter: '#F2D86A',
  butterInk: '#3A2E08',

  mint: '#A8D8B9',
  mintInk: '#0F2C1A',

  rose: '#D89BA8',
  roseInk: '#3A1520',

  sky: '#9FC4DC',
  skyInk: '#0E2230',

  // Signature gold (brand anchor) — richer than the primary token.
  gold: '#E4B24A',
  goldDim: '#C99836',
  goldSoft: 'rgba(228,178,74,0.14)',

  // State colors tuned for pastel pairing
  errorPastel: '#E07A68',
  successPastel: '#9CC58B',
} as const;

export type PastelKey = keyof typeof Pastels;

/** Soft alpha tint of a pastel, e.g. for icon tile backgrounds. */
export function pastelTint(hex: string, alpha = 0.18): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
