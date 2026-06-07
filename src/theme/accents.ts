// Accent picker — recolors only the accent, independent of light/dark theme.
// Light variants reuse the design's hand-tuned hues (cobalt/terracotta/green/plum);
// dark variants are brightened so they stay legible on the ink canvas.

export type AccentKey = 'cobalt' | 'terracotta' | 'green' | 'plum' | 'amber';

export type AccentTriple = {
  accent: string;
  accentSoft: string;
  onAccent: string;
};

export type AccentDef = {
  label: string;
  light: AccentTriple;
  dark: AccentTriple;
};

export const ACCENTS: Record<AccentKey, AccentDef> = {
  cobalt: {
    label: 'Cobalt',
    light: { accent: '#2C3CE0', accentSoft: '#E6E8FA', onAccent: '#FFFFFF' },
    dark: { accent: '#6573F7', accentSoft: '#20254A', onAccent: '#0C0D0F' },
  },
  terracotta: {
    label: 'Terracotta',
    light: { accent: '#C0573B', accentSoft: '#F1DED4', onAccent: '#FCF6EE' },
    dark: { accent: '#E07A5A', accentSoft: '#34211B', onAccent: '#0C0D0F' },
  },
  green: {
    label: 'Green',
    light: { accent: '#2E6B52', accentSoft: '#D9E7DF', onAccent: '#F7FBF8' },
    dark: { accent: '#4FA886', accentSoft: '#173027', onAccent: '#0C0D0F' },
  },
  plum: {
    label: 'Plum',
    light: { accent: '#6B4E9E', accentSoft: '#E7E0F2', onAccent: '#FBF9FF' },
    dark: { accent: '#9D80D6', accentSoft: '#241C3A', onAccent: '#0C0D0F' },
  },
  amber: {
    label: 'Amber',
    light: { accent: '#B8791F', accentSoft: '#F4E8D2', onAccent: '#FFFFFF' },
    dark: { accent: '#E0A94B', accentSoft: '#322712', onAccent: '#0C0D0F' },
  },
};

export const ACCENT_ORDER: AccentKey[] = ['cobalt', 'terracotta', 'green', 'plum', 'amber'];

export const DEFAULT_ACCENT: AccentKey = 'cobalt';

export const accentTriple = (key: AccentKey, isDark: boolean): AccentTriple =>
  isDark ? ACCENTS[key].dark : ACCENTS[key].light;
