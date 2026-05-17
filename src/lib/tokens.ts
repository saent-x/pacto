// Pacto design tokens — brand-spec palette
// Synced with src/constants/colors.ts. This file is read by useTheme() / theme.tsx.

// Hex values are OKLCH-authored and converted for React Native style support.
// Light reads as warm cream paper. Dark reads as deep navy ink.

// ─── Full palette tokens (light) ─────────────────────────────────
const L_BG = '#F8F2E7';
const L_BG_SOFT = '#EFE5D5';
const L_BG_CARD = '#FFFDF8';
const L_INK = '#292D3D';
const L_INK_2 = '#666C7A';
const L_INK_3 = '#94909A';
const L_LINE = '#E3D8C9';
const L_LINE_2 = '#D4C7B5';
const L_ACCENT = '#E06F55';
const L_ACCENT_2 = '#76A99B';
const L_ACCENT_3 = '#D5B55B';
const L_ACCENT_SOFT = '#F5D7CE';
const L_ACCENT_2_SOFT = '#DCEBE5';
const L_ACCENT_3_SOFT = '#F1E0AB';

// ─── Full palette tokens (dark) ──────────────────────────────────
const D_BG = '#171B2A';
const D_BG_SOFT = '#222738';
const D_BG_CARD = '#282E42';
const D_INK = '#F7F1E8';
const D_INK_2 = '#C9C3BB';
const D_INK_3 = '#A29B92';
const D_LINE = '#3A415A';
const D_LINE_2 = '#4A526B';
const D_ACCENT = '#E28568';
const D_ACCENT_2 = '#86BAAA';
const D_ACCENT_3 = '#E0BE66';
const D_ACCENT_SOFT = '#55333A';
const D_ACCENT_2_SOFT = '#2E4A49';
const D_ACCENT_3_SOFT = '#55482C';

const lightPalette = {
  peach: '#F0A081',
  peachInk: '#3B1D12',
  lavender: '#C3A4D8',
  lavenderInk: '#211735',
  butter: '#E8C95E',
  butterInk: '#3A2B07',
  mint: '#94CFAE',
  mintInk: '#102C1C',
  rose: '#D6909D',
  roseInk: '#3A1420',
  sky: '#A9CBE3',
  skyInk: '#0F2634',
  reminders: '#9A7CC8',
  tasks: '#5F9B7B',
  journal: '#B7785D',
  wish: '#C99135',
  plans: '#789D57',
  error: '#BD5948',
  success: '#6D965A',
};

const darkPalette = {
  peach: '#D07A62',
  peachInk: '#FAE5D8',
  lavender: '#B698D7',
  lavenderInk: '#F0EAFE',
  butter: '#C9A94E',
  butterInk: '#FFF0BE',
  mint: '#72AB8E',
  mintInk: '#DDF3E5',
  rose: '#B87586',
  roseInk: '#F9DFE6',
  sky: '#8EB4CE',
  skyInk: '#E0F0F8',
  reminders: '#B89BE0',
  tasks: '#7CBC9A',
  journal: '#D08F70',
  wish: '#D8A64C',
  plans: '#95BC74',
  error: '#E27B68',
  success: '#91C477',
};

const darkTokens = {
  // ─── Pacto FULL PALETTE tokens ──────────────────────────────
  bg: D_BG,
  bgSoft: D_BG_SOFT,
  bgCard: D_BG_CARD,
  inkColor: D_INK,
  ink2: D_INK_2,
  ink3: D_INK_3,
  lineColor: D_LINE,
  line2: D_LINE_2,
  accent: D_ACCENT,
  accent2: D_ACCENT_2,
  accent3: D_ACCENT_3,
  accentSoft: D_ACCENT_SOFT,
  accent2Soft: D_ACCENT_2_SOFT,
  accent3Soft: D_ACCENT_3_SOFT,

  // ─── Legacy aliases (re-pointed at new palette) ─────────────
  ink: D_BG,
  coal: D_BG_SOFT,
  card: D_BG_CARD,
  cardHi: '#323A51',
  line: D_LINE,
  lineHi: D_LINE_2,
  bone: D_INK,
  mist: D_INK_2,
  fog: D_INK_3,
  ash: '#777F92',
  gold: D_ACCENT,
  goldDim: '#B96650',
  goldSoft: '#4E3138',
};

const lightTokens = {
  // ─── Pacto FULL PALETTE tokens ──────────────────────────────
  bg: L_BG,
  bgSoft: L_BG_SOFT,
  bgCard: L_BG_CARD,
  inkColor: L_INK,
  ink2: L_INK_2,
  ink3: L_INK_3,
  lineColor: L_LINE,
  line2: L_LINE_2,
  accent: L_ACCENT,
  accent2: L_ACCENT_2,
  accent3: L_ACCENT_3,
  accentSoft: L_ACCENT_SOFT,
  accent2Soft: L_ACCENT_2_SOFT,
  accent3Soft: L_ACCENT_3_SOFT,

  // ─── Legacy aliases ─────────────────────────────────────────
  ink: L_BG,
  coal: L_BG_SOFT,
  card: L_BG_CARD,
  cardHi: '#FFFFFF',
  line: L_LINE,
  lineHi: L_LINE_2,
  bone: L_INK,
  mist: L_INK_2,
  fog: L_INK_3,
  ash: '#B1A798',
  gold: L_ACCENT,
  goldDim: '#B85D45',
  goldSoft: '#F2D8C8',
};

export const pastels = {
  peach: '#F0A081',
  peachInk: '#3A1F14',
  lavender: '#AFA1DF',
  lavenderInk: '#1F1635',
  butter: '#E8C95E',
  butterInk: '#3A2E08',
  mint: '#94CFAE',
  mintInk: '#0F2C1A',
  rose: '#D6909D',
  roseInk: '#3A1520',
  sky: '#91BDD7',
  skyInk: '#0E2230',
  reminders: '#8B78C0',
  tasks: '#5F9B7B',
  journal: '#B7785D',
  wish: '#C99135',
  plans: '#789D57',
  error: '#BD5948',
  success: '#6D965A',
};

export type ThemeMode = 'light' | 'dark';
export type Tokens = typeof darkTokens & typeof pastels;

export function getTokens(mode: ThemeMode): Tokens {
  return {
    ...(mode === 'light' ? lightTokens : darkTokens),
    ...pastels,
    ...(mode === 'light' ? lightPalette : darkPalette),
  };
}

// Pacto type system — Bitcount Prop Single (display, pixel), Geist (body), Geist Mono (data)
export const fonts = {
  // ─── New pacto names ────────────────────────────────────────
  pixel: 'BitcountPropSingle_700Bold',
  pixelMedium: 'BitcountPropSingle_500Medium',
  pixelRegular: 'BitcountPropSingle_400Regular',
  geist: 'Geist_400Regular',
  geistMedium: 'Geist_500Medium',
  geistSemiBold: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
  geistLight: 'Geist_300Light',
  geistMono: 'GeistMono_400Regular',
  geistMonoMedium: 'GeistMono_500Medium',

  // ─── Legacy aliases ─────────────────────────────────────────
  display: 'BitcountPropSingle_700Bold',
  displayBold: 'BitcountPropSingle_700Bold',
  body: 'Geist_400Regular',
  bodyBold: 'Geist_700Bold',
  serif: 'Geist_400Regular',
  mono: 'GeistMono_400Regular',
} as const;
