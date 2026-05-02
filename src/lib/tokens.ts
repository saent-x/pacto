// Pacto design tokens — WARM CALM palette
// Synced with src/constants/colors.ts. This file is read by useTheme() / theme.tsx.

// ─── New WARM CALM tokens (light) ────────────────────────────────
const L_BG = '#FAF8F2';
const L_BG_SOFT = '#F4F0E5';
const L_BG_CARD = '#FFFFFF';
const L_INK = '#2A241B';
const L_INK_2 = '#5C5345';
const L_INK_3 = '#918875';
const L_LINE = '#E8E2D4';
const L_LINE_2 = '#DBD3C0';
const L_ACCENT = '#C7755A';
const L_ACCENT_2 = '#6FB3A2';
const L_ACCENT_3 = '#C8AE73';
const L_ACCENT_SOFT = '#F5DDD3';
const L_ACCENT_2_SOFT = '#DCEDE7';
const L_ACCENT_3_SOFT = '#EEE4C8';

// ─── New WARM CALM tokens (dark) ─────────────────────────────────
const D_BG = '#2A2620';
const D_BG_SOFT = '#322D26';
const D_BG_CARD = '#39322B';
const D_INK = '#F2EEE5';
const D_INK_2 = '#C2BAA9';
const D_INK_3 = '#847A6A';
const D_LINE = '#4D4537';
const D_LINE_2 = '#5B5141';
const D_ACCENT = '#D08B6F';
const D_ACCENT_2 = '#7FBFAF';
const D_ACCENT_3 = '#D2BC85';
const D_ACCENT_SOFT = '#4D352B';
const D_ACCENT_2_SOFT = '#2C443D';
const D_ACCENT_3_SOFT = '#4A4128';

const darkTokens = {
  // ─── Pacto WARM CALM tokens ─────────────────────────────────
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
  cardHi: '#3F3830',
  line: D_LINE,
  lineHi: D_LINE_2,
  bone: D_INK,
  mist: D_INK_2,
  fog: D_INK_3,
  ash: '#6E6555',
  gold: D_ACCENT,
  goldDim: '#A3654C',
  goldSoft: 'rgba(208,139,111,0.16)',
};

const lightTokens = {
  // ─── Pacto WARM CALM tokens ─────────────────────────────────
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
  cardHi: '#FFFDF7',
  line: L_LINE,
  lineHi: L_LINE_2,
  bone: L_INK,
  mist: L_INK_2,
  fog: L_INK_3,
  ash: '#A89E89',
  gold: L_ACCENT,
  goldDim: '#9F5A40',
  goldSoft: 'rgba(199,117,90,0.14)',
};

export const pastels = {
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
  reminders: '#9B8EC4',
  tasks: '#7BA08A',
  journal: '#C4977A',
  wish: '#D4A054',
  plans: '#8AAF7B',
  error: '#E07A68',
  success: '#9CC58B',
};

export type ThemeMode = 'light' | 'dark';
export type Tokens = typeof darkTokens & typeof pastels;

export function getTokens(mode: ThemeMode): Tokens {
  return { ...(mode === 'light' ? lightTokens : darkTokens), ...pastels };
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
