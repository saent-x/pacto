/**
 * Editorial Navy pastel palette — shared across dark and light themes.
 * Used for signature hero cards, mood tints, timeline dots.
 *
 * Each pastel has a matching `ink` tone — a deep, desaturated version
 * of the same hue — for text placed ON the pastel background.
 */
export const Pastels = {
  peach: '#D88B74',
  peachInk: '#3A1F14',

  lavender: '#A89BC8',
  lavenderInk: '#1F1635',

  butter: '#C5A954',
  butterInk: '#3A2E08',

  mint: '#7FB39C',
  mintInk: '#0F2C1A',

  rose: '#C47C8C',
  roseInk: '#3A1520',

  sky: '#8CB5CD',
  skyInk: '#0E2230',

  // Signature gold (brand anchor) — richer than the primary token.
  gold: '#A77B2D',
  goldDim: '#8C6424',
  goldSoft: 'rgba(167,123,45,0.14)',

  // State colors tuned for pastel pairing
  errorPastel: '#B95748',
  successPastel: '#637F55',
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
