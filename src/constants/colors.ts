// Pacto FULL PALETTE / Editorial Navy palette
// OKLCH-authored values converted to hex for React Native style support.
//
// Three accent hues sharing chroma 0.13 / lightness 0.68:
//   - accent   = terracotta-rose (mine / Maya / primary)
//   - accent2  = sage             (partner / Jordan / secondary)
//   - accent3  = honey            (shared / tertiary)
//
// Legacy keys (gold, bone, coal, etc.) are kept and re-pointed at the new tokens so existing
// screens render immediately under the new palette while Phase 6+7+8+10 rebuild them.

// ─── Tokens (light) ──────────────────────────────────────────────
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

// ─── Tokens (dark) ───────────────────────────────────────────────
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

const dark = {
  // ─── New STUDIO tokens ───────────────────────────────────────
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

  // ─── Legacy aliases (re-pointed) ─────────────────────────────
  primary: D_ACCENT,
  primaryLight: D_ACCENT_SOFT,
  primaryDark: '#B8624A',
  primaryMuted: '#4E3037',
  primaryVivid: '#E99A7F',

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

  night: D_BG_SOFT,
  dark: D_BG_CARD,
  dim: '#2A3247',
  muted: D_LINE,
  dusk: D_LINE_2,
  haze: D_INK_2,
  cream: D_INK,
  parchment: D_INK,

  success: '#8FC175',
  successLight: '#31472E',
  warning: '#CFB569',
  warningLight: '#4C3D20',
  error: '#E07161',
  errorLight: '#522F2B',
  info: '#82ACC7',
  infoLight: '#2D4454',

  reminders: '#B09ED4',
  remindersLight: '#3D3656',
  tasks: '#82B79D',
  tasksLight: '#31483B',
  journal: '#C68870',
  journalLight: '#4B352B',
  wish: '#CAA258',
  wishLight: '#4C3D20',
  plans: '#90B471',
  plansLight: '#3A482D',
  checklists: '#82ACC7',
  checklistsLight: '#2D4454',
  mood: '#B09ED4',
  moodLight: '#3D3656',

  background: D_BG,
  screenBackground: D_BG,
  surface: D_BG_SOFT,
  text: D_INK,
  textSecondary: D_INK_2,
  textTertiary: D_INK_3,
  border: D_LINE,
  divider: D_LINE_2,
  white: D_INK,
  black: D_BG,

  gradientWarm: [D_BG_SOFT, D_BG] as readonly string[],
  gradientGold: ['#50452F', D_BG] as readonly string[],
};

const light = {
  // ─── New STUDIO tokens ───────────────────────────────────────
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

  // ─── Legacy aliases (re-pointed) ─────────────────────────────
  primary: L_ACCENT,
  primaryLight: L_ACCENT_SOFT,
  primaryDark: '#A84F3B',
  primaryMuted: '#F1D7CD',
  primaryVivid: '#C85F47',

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

  night: L_BG_SOFT,
  dark: L_BG_CARD,
  dim: '#FFFFFF',
  muted: L_LINE,
  dusk: L_LINE_2,
  haze: L_INK_2,
  cream: L_INK,
  parchment: L_INK,

  success: '#637F55',
  successLight: '#DFEBD4',
  warning: '#A77B2D',
  warningLight: '#ECE1C8',
  error: '#B95748',
  errorLight: '#F2D4CD',
  info: '#6B91A7',
  infoLight: '#D8E8F0',

  reminders: '#8A79AE',
  remindersLight: '#E3DDF0',
  tasks: '#689C86',
  tasksLight: '#DCEAE5',
  journal: '#AA735F',
  journalLight: '#ECD9CC',
  wish: '#A77B2D',
  wishLight: '#ECE1C8',
  plans: '#75915C',
  plansLight: '#E1EAD2',
  checklists: '#6B91A7',
  checklistsLight: '#D8E8F0',
  mood: '#8A79AE',
  moodLight: '#E3DDF0',

  background: L_BG,
  screenBackground: L_BG,
  surface: L_BG_SOFT,
  text: L_INK,
  textSecondary: L_INK_2,
  textTertiary: L_INK_3,
  border: L_LINE,
  divider: L_LINE_2,
  white: L_BG_CARD,
  black: L_INK,

  gradientWarm: [L_BG_SOFT, L_BG] as readonly string[],
  gradientGold: ['#ECE1C8', L_BG] as readonly string[],
};

export type ColorScheme = {
  [K in keyof typeof dark]: string | readonly string[];
};

export type PaletteKey = 'classic';

export const PALETTE_OPTIONS: { value: PaletteKey; label: string }[] = [
  { value: 'classic', label: 'Editorial Navy' },
];

const palettes: Record<PaletteKey, { dark: typeof dark; light: typeof light }> = {
  classic: { dark, light },
};

let activePaletteKey: PaletteKey = 'classic';

export const themes: Record<'dark' | 'light', typeof dark> = {
  dark: palettes.classic.dark,
  light: palettes.classic.light,
};

// Default export — auth screens use this directly
export let Colors: typeof dark = palettes.classic.dark;

export function setActivePalette(key: PaletteKey) {
  activePaletteKey = key;
  const p = palettes[key];
  themes.dark = p.dark;
  themes.light = p.light;
}

export function getActivePalette(): PaletteKey {
  return activePaletteKey;
}

export function setActiveColors(mode: 'dark' | 'light') {
  Colors = themes[mode];
}
