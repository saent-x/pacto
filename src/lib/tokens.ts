// Pacto design tokens — Editorial Navy palette
// Synced with src/constants/colors.ts. This file is read by useTheme() / theme.tsx.

// Hex values are OKLCH-authored and converted for React Native style support.
// Light reads as warm editorial paper. Dark reads as deep navy ink.

// ─── Full palette tokens (light) ─────────────────────────────────
const L_BG = '#FAF7F1';
const L_BG_SOFT = '#F4EFE7';
const L_BG_CARD = '#FFFDF8';
const L_INK = '#212437';
const L_INK_2 = '#586174';
const L_INK_3 = '#837D8D';
const L_LINE = '#D8CEBD';
const L_LINE_2 = '#C9BBA8';
const L_ACCENT = '#D96B52';
const L_ACCENT_2 = '#72AA9C';
const L_ACCENT_3 = '#A77B2D';
const L_ACCENT_SOFT = '#F1D7CD';
const L_ACCENT_2_SOFT = '#DDEBE5';
const L_ACCENT_3_SOFT = '#ECE1C8';

// ─── Full palette tokens (dark) ──────────────────────────────────
const D_BG = '#101525';
const D_BG_SOFT = '#192034';
const D_BG_CARD = '#22293D';
const D_INK = '#F7F0E5';
const D_INK_2 = '#CFC6B8';
const D_INK_3 = '#8F98AA';
const D_LINE = '#343D52';
const D_LINE_2 = '#46506A';
const D_ACCENT = '#E17B5F';
const D_ACCENT_2 = '#82B8AA';
const D_ACCENT_3 = '#CFB569';
const D_ACCENT_SOFT = '#4E3037';
const D_ACCENT_2_SOFT = '#2D4947';
const D_ACCENT_3_SOFT = '#50452F';

const lightPalette = {
  peach: '#D88B74',
  peachInk: '#3B1D12',
  lavender: '#A89BC8',
  lavenderInk: '#211735',
  butter: '#C5A954',
  butterInk: '#3A2B07',
  mint: '#7FB39C',
  mintInk: '#102C1C',
  rose: '#C47C8C',
  roseInk: '#3A1420',
  sky: '#8CB5CD',
  skyInk: '#0F2634',
  reminders: '#8A79AE',
  tasks: '#689C86',
  journal: '#AA735F',
  wish: '#A77B2D',
  plans: '#75915C',
  error: '#B95748',
  success: '#637F55',
};

const darkPalette = {
  peach: '#C97761',
  peachInk: '#FAE5D8',
  lavender: '#A995CE',
  lavenderInk: '#F0EAFE',
  butter: '#CBB05F',
  butterInk: '#FFF0BE',
  mint: '#77AA93',
  mintInk: '#DDF3E5',
  rose: '#B87686',
  roseInk: '#F9DFE6',
  sky: '#82ACC7',
  skyInk: '#E0F0F8',
  reminders: '#B09ED4',
  tasks: '#82B79D',
  journal: '#C68870',
  wish: '#CAA258',
  plans: '#90B471',
  error: '#E07161',
  success: '#8FC175',
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
  cardHi: '#2A3247',
  line: D_LINE,
  lineHi: D_LINE_2,
  bone: D_INK,
  mist: D_INK_2,
  fog: D_INK_3,
  ash: '#768199',
  gold: D_ACCENT,
  goldDim: '#B89049',
  goldSoft: '#4E3037',
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
  ash: '#A89C8B',
  gold: L_ACCENT,
  goldDim: '#8C6424',
  goldSoft: '#ECE1C8',
};

export const pastels = {
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
  reminders: '#8A79AE',
  tasks: '#689C86',
  journal: '#AA735F',
  wish: '#B28B3F',
  plans: '#75915C',
  error: '#B95748',
  success: '#637F55',
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
  geist: 'Geist_500Medium',
  geistMedium: 'Geist_500Medium',
  geistSemiBold: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
  geistLight: 'Geist_400Regular',
  geistMono: 'GeistMono_500Medium',
  geistMonoMedium: 'GeistMono_500Medium',

  // ─── Legacy aliases ─────────────────────────────────────────
  display: 'BitcountPropSingle_700Bold',
  displayBold: 'BitcountPropSingle_700Bold',
  body: 'Geist_500Medium',
  bodyBold: 'Geist_700Bold',
  serif: 'Geist_500Medium',
  mono: 'GeistMono_500Medium',
} as const;
